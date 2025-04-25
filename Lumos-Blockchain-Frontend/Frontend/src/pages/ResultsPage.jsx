import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBlockchain } from '../context/BlockchainContext'
import { ethers } from 'ethers'
import VotingABI from '../contracts/Voting.json'

// Helper: extract markdown sections from description
function extractSection(description, section) {
  if (!description) return "";
  const match = description.match(new RegExp(`## ${section}\\s*([\\s\\S]*?)(?=\\n## |$)`, 'i'));
  return match && match[1] ? match[1].trim() : "";
}

export default function ResultsPage() {
  const navigate = useNavigate()
  const { isConnected, currentPhase, getWinningProposal, connect, provider, votingContractAddress } = useBlockchain()

  const [winner, setWinner] = useState(null)
  const [rankedProposals, setRankedProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date())
  const [animateUpdate, setAnimateUpdate] = useState(false)
  const [usingPollingOnly, setUsingPollingOnly] = useState(false)
  const [contractError, setContractError] = useState(null)
  const [votingContract, setVotingContract] = useState(null)
  const [fetchingVotes, setFetchingVotes] = useState(false)

  const proposalsRef = useRef([])
  const winnerRef = useRef(winner)
  const isUpdatingRef = useRef(false)

  // Helper function to extract owner name from proposal description
  const extractOwnerName = (description) => extractSection(description, "Name") || "Unknown";
  // Helper function to extract brief summary from proposal description
  const extractBriefSummary = (description) => extractSection(description, "Brief Summary") || (description ? description.split('\n')[0] : "No description available");

  // Setup the voting contract when provider is available
  useEffect(() => {
    if (!provider || !votingContractAddress) return;
    
    try {
      const contract = new ethers.Contract(
        votingContractAddress,
        VotingABI.abi || VotingABI,
        provider
      );
      setVotingContract(contract);
      console.log('Voting contract connected:', votingContractAddress);
    } catch (err) {
      console.error('Error connecting to voting contract:', err);
      setContractError('Could not connect to voting contract');
    }
  }, [provider, votingContractAddress]);

  // Helper function to get vote count from blockchain
  const getVoteCountFromBlockchain = async (proposalId) => {
    if (!votingContract || !proposalId) return null;
    
    try {
      const numericId = parseInt(proposalId, 10);
      if (isNaN(numericId)) return null;
      
      const proposal = await votingContract.proposals(numericId);
      const voteCount = proposal.voteCount?.toString() || "0";
      console.log(`Fetched on-chain vote count for proposal ${proposalId}:`, voteCount);
      
      return voteCount;
    } catch (error) {
      console.error(`Error getting vote count for proposal ${proposalId}:`, error);
      return null;
    }
  };

  // Fetch all proposal vote counts from blockchain
  const fetchAllVoteCounts = async (proposals) => {
    if (!votingContract || !proposals?.length) return proposals;
    
    setFetchingVotes(true);
    try {
      const updatedProposals = [...proposals];
      
      for (let i = 0; i < updatedProposals.length; i++) {
        const proposal = updatedProposals[i];
        if (proposal.id) {
          const voteCount = await getVoteCountFromBlockchain(proposal.id);
          if (voteCount !== null) {
            updatedProposals[i] = {
              ...proposal,
              voteCount: voteCount,
              hasBlockchainVotes: true
            };
          }
        }
      }
      
      updatedProposals.sort((a, b) => {
        if (a.rank && b.rank) return a.rank - b.rank;
        
        const votesA = parseInt(a.voteCount) || 0;
        const votesB = parseInt(b.voteCount) || 0;
        return votesB - votesA;
      });
      
      return updatedProposals;
    } catch (error) {
      console.error("Error fetching vote counts:", error);
      return proposals;
    } finally {
      setFetchingVotes(false);
    }
  };

  // Fetch proposals from /evaluation/rankings/top endpoint
  const fetchRankings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const timestamp = Date.now();
      const response = await fetch(`https://lumos-mz9a.onrender.com/evaluation/rankings/top?_=${timestamp}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        }
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch rankings: ${response.status}`);
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid rankings data');
      }
      
      console.log("Raw rankings data:", data);
      
      const normalizedProposals = data.map(item => {
        const proposal = item.proposal || {};
        const score = item.score || {};
        
        const name = extractSection(proposal.description, "Name") || 
                    proposal.name || 
                    "Unknown";
        const summary = extractSection(proposal.description, "Brief Summary") || 
                       proposal.brief_summary || 
                       "";
        
        const proposerAddress = proposal.stellarWalletAddress || 
                              proposal.proposer || 
                              "Unknown";
        
        return {
          ...proposal,
          id: proposal.id?.toString() ?? '',
          voteCount: proposal.voteCount || "0",
          title: proposal.projectTitle || 
                 extractSection(proposal.description, "Title") || 
                 `Proposal ${proposal.id || 'Unknown'}`,
          proposer: proposerAddress,
          description: proposal.description || proposal.projectDescription || "",
          _extractedName: name,
          _extractedSummary: summary,
          rank: item.rank || 0,
          _score: score,
          hasBlockchainVotes: false
        }
      });
      
      console.log("Normalized proposals:", normalizedProposals);
      
      const proposalsWithVotes = await fetchAllVoteCounts(normalizedProposals);
      
      const sortedProposals = [...proposalsWithVotes].sort((a, b) => {
        if (a.rank && b.rank) return a.rank - b.rank;
        
        const votesA = parseInt(a.voteCount) || 0;
        const votesB = parseInt(b.voteCount) || 0;
        return votesB - votesA;
      });
      
      proposalsRef.current = sortedProposals;
      setRankedProposals(sortedProposals);

      if (sortedProposals.length > 0) {
        setWinner(sortedProposals[0]);
        winnerRef.current = sortedProposals[0];
      } else {
        setWinner(null);
        winnerRef.current = null;
      }
      setLastUpdateTime(new Date());
    } catch (err) {
      console.error("Error fetching rankings:", err);
      setError(err.message || 'Failed to load rankings');
      setRankedProposals([]);
      setWinner(null);
    } finally {
      setLoading(false);
    }
  }, [votingContract]);

  useEffect(() => {
    if (isConnected) {
      fetchRankings();
    }
  }, [isConnected, fetchRankings]);

  const handleRefresh = async () => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    await fetchRankings();
    setTimeout(() => { isUpdatingRef.current = false }, 500);
  };

  useEffect(() => {
    if (fetchingVotes && rankedProposals.length > 0) {
      setAnimateUpdate(true);
      const timer = setTimeout(() => setAnimateUpdate(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [fetchingVotes, rankedProposals]);

  if (!isConnected) {
    return (
      <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-lg text-center">
          <h1 className="text-3xl font-bold mb-6">Connect to View Results</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-8">
            Please connect your wallet to view the grant proposal results.
          </p>
          <button 
            onClick={connect}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }
  
  if (contractError && isConnected) {
    return (
      <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-lg text-center">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4">Blockchain Connection Error</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-8">
              {contractError}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && (!rankedProposals || rankedProposals.length === 0)) {
    return (
      <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-lg text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
          <h1 className="text-2xl font-bold">Loading Results...</h1>
        </div>
      </div>
    );
  }
  
  if (error && (!rankedProposals || rankedProposals.length === 0)) {
    return (
      <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-lg text-center">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4">Error Loading Results</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-8">
              {error}
            </p>
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if ((!rankedProposals || rankedProposals.length === 0)) {
    return (
      <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-lg text-center">
          <h1 className="text-3xl font-bold mb-6">No Proposals Available</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-8">
            There are currently no proposals available. Results will be displayed once proposals have been submitted and voted on.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-2">Grant Proposal Results</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          {currentPhase === "Completed" 
            ? "Final results of the grant proposal voting." 
            : "Current standings based on blockchain votes."}
        </p>
        
        {fetchingVotes && (
          <div className="mb-4 py-2 px-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-md flex items-center">
            <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-indigo-600 dark:border-indigo-400 rounded-full"></div>
            <p className="text-sm text-indigo-700 dark:text-indigo-300">Fetching latest vote counts from blockchain...</p>
          </div>
        )}
        
        {winner && (
          <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-8 ${animateUpdate ? 'animate-pulse' : ''}`}>
            <div className="flex items-center mb-4">
              <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-2xl font-bold">{currentPhase === "Completed" ? "Winning Proposal" : "Current Leader"}</h2>
                <div className="flex items-center">
                  <p className="text-slate-500 dark:text-slate-400">
                    <span className={`font-bold ${winner.hasBlockchainVotes ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                      {winner.voteCount || '0'}
                    </span> votes
                    {winner.hasBlockchainVotes && 
                      <span className="ml-1 text-xs text-indigo-600 dark:text-indigo-400">(verified on blockchain)</span>
                    }
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">{winner.title || "Unnamed Proposal"}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Proposer: {winner._extractedName || "Unknown"} 
                {winner.proposer && winner.proposer !== "Unknown" && 
                  <span className="ml-2 text-xs">({winner.proposer.substring(0, 6)}...{winner.proposer.length > 8 ? winner.proposer.substring(winner.proposer.length - 4) : ""})</span>
                }
              </p>
            </div>
            
            {winner.description && (
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-4 max-h-40 overflow-y-auto">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                  {winner._extractedSummary || winner.brief_summary || extractBriefSummary(winner.description)}
                </p>
              </div>
            )}
            
            {currentPhase === "Completed" && (
              <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg">
                <p className="font-medium">This proposal has been selected to receive grant funding based on blockchain voting results!</p>
              </div>
            )}
          </div>
        )}
        
        <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden ${animateUpdate ? 'animate-pulse' : ''}`}>
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h2 className="text-xl font-bold">All Proposals Ranking</h2>
            <div className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded dark:bg-indigo-900/30 dark:text-indigo-300">
              Votes stored on blockchain
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Proposal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Proposer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">On-Chain Votes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {rankedProposals.map((proposal, index) => (
                  <tr 
                    key={`${proposal.id}-${index}`} 
                    className={`${proposal.id === winner?.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold">#{index + 1}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{proposal.title || "Unnamed Proposal"}</div>
                      {proposal._score && (
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                          Score: {proposal._score.total || 0}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>{proposal._extractedName || proposal.name || "Unknown"}</div>
                      {proposal.proposer && proposal.proposer !== "Unknown" && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {proposal.proposer.substring(0, 6)}...{proposal.proposer.length > 8 ? proposal.proposer.substring(proposal.proposer.length - 4) : ""}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-semibold ${proposal.hasBlockchainVotes ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                        {proposal.voteCount || '0'}
                        {proposal.hasBlockchainVotes && (
                          <span className="ml-1 inline-flex items-center">
                            <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Last updated: {lastUpdateTime.toLocaleString()}
            {usingPollingOnly && " (using automatic polling every 30 seconds)"}
          </p>
          <button 
            onClick={handleRefresh}
            disabled={fetchingVotes}
            className={`px-4 py-2 bg-indigo-600 text-white dark:bg-indigo-700 dark:text-white rounded-lg text-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors mt-2 ${fetchingVotes ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {fetchingVotes ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>
    </div>
  );
}
