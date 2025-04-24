import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBlockchain } from '../context/BlockchainContext'

// Helper: extract markdown sections from description
function extractSection(description, section) {
  if (!description) return "";
  const match = description.match(new RegExp(`## ${section}\\s*([\\s\\S]*?)(?=\\n## |$)`, 'i'));
  return match && match[1] ? match[1].trim() : "";
}

export default function ResultsPage() {
  const navigate = useNavigate()
  const { isConnected, currentPhase, getWinningProposal, connect } = useBlockchain()

  const [winner, setWinner] = useState(null)
  const [rankedProposals, setRankedProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date())
  const [animateUpdate, setAnimateUpdate] = useState(false)
  const [usingPollingOnly, setUsingPollingOnly] = useState(false)

  const proposalsRef = useRef([])
  const winnerRef = useRef(winner)
  const isUpdatingRef = useRef(false)

  // Helper function to extract owner name from proposal description
  const extractOwnerName = (description) => extractSection(description, "Name") || "Unknown";
  // Helper function to extract brief summary from proposal description
  const extractBriefSummary = (description) => extractSection(description, "Brief Summary") || (description ? description.split('\n')[0] : "No description available");

  // Fetch proposals from /evaluation/rankings/top endpoint
  const fetchRankings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('https://lumos-mz9a.onrender.com/evaluation/rankings/top', {
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
      // Normalize proposals and extract fields from description
      const normalizedProposals = data.map(p => {
        const name = extractSection(p.description, "Name");
        const summary = extractSection(p.description, "Brief Summary");
        return {
          ...p,
          id: p.id?.toString() ?? '',
          voteCount: p.voteCount || "0",
          title: p.title || extractSection(p.description, "Title") || `Proposal ${p.id}`,
          proposer: p.proposer || "Unknown",
          description: p.description || "",
          _extractedName: name,
          _extractedSummary: summary
        }
      });
      proposalsRef.current = normalizedProposals;
      setRankedProposals(normalizedProposals);

      // Set winner as the top proposal if available
      if (normalizedProposals.length > 0) {
        setWinner(normalizedProposals[0]);
        winnerRef.current = normalizedProposals[0];
      } else {
        setWinner(null);
        winnerRef.current = null;
      }
      setLastUpdateTime(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load rankings');
      setRankedProposals([]);
      setWinner(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch rankings on mount and when connected
  useEffect(() => {
    if (isConnected) {
      fetchRankings();
    }
  }, [isConnected, fetchRankings]);

  // Manual refresh button handler
  const handleRefresh = async () => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    await fetchRankings();
    setTimeout(() => { isUpdatingRef.current = false }, 500);
  };

  // Display different states based on conditions
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
  
  // Main render with results
  return (
    <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-2">Grant Proposal Results</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          {currentPhase === "Completed" 
            ? "Final results of the grant proposal voting." 
            : "Current standings based on blockchain votes."}
        </p>
        
        {winner && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-8">
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
                    {winner.voteCount || '0'} votes
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">{winner.title || "Unnamed Proposal"}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Proposer: {winner.proposer ? `${winner.proposer.substring(0, 6)}...${winner.proposer.substring(38)}` : 'Unknown'} 
                {winner._extractedName && <span className="ml-2 font-medium">({winner._extractedName})</span>}
              </p>
            </div>
            
            {winner.description && (
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-4 max-h-40 overflow-y-auto">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                  {winner._extractedSummary || extractBriefSummary(winner.description)}
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
        
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
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
                    key={`${proposal.id}-${proposal.voteCount}`} 
                    className={`${proposal.id === winner?.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold">#{index + 1}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{proposal.title || "Unnamed Proposal"}</div>
                      {proposal._extractedName && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">{proposal._extractedName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {proposal.proposer ? `${proposal.proposer.substring(0, 6)}...${proposal.proposer.substring(38)}` : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold">{proposal.voteCount || '0'}</div>
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
            className="px-4 py-2 bg-indigo-600 text-white dark:bg-indigo-700 dark:text-white rounded-lg text-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors mt-2"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}
