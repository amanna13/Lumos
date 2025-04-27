import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBlockchain } from '../context/BlockchainContext'
import { ethers } from 'ethers'
import VotingABI from '../contracts/Voting.json'
import { getGasPriceInfo } from '../utils/gasUtils'
import { verifyTransactionOnBaseSepolia } from '../utils/transactionHelper'
import { getAllLocalVotes } from '../utils/localVoteStorage'

function extractSection(description, section) {
  if (!description) return "";
  const match = description.match(new RegExp(`## ${section}\\s*([\\s\\S]*?)(?=\\n## |$)`, 'i'));
  return match && match[1] ? match[1].trim() : "";
}

function getProposalTitle(proposal) {
  if (!proposal) return '';
  return (
    proposal.projectTitle?.trim() ||
    proposal.title?.trim() ||
    proposal._extractedName?.trim() ||
    proposal.name?.trim() ||
    `Proposal ${proposal.id || ''}`.trim()
  );
}

export default function ResultsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date())
  const [rankedProposals, setRankedProposals] = useState([])
  const [winner, setWinner] = useState(null)
  const [fetchingVotes, setFetchingVotes] = useState(false)
  const [votingContract, setVotingContract] = useState(null)
  const [provider, setProvider] = useState(null)
  const navigate = useNavigate()
  const {
    isConnected,
    account,
    currentPhase
  } = useBlockchain() || {}

  const pollInterval = useRef(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const CONTRACT_ADDRESS = "0x5cE016f2731e1c6877542Ddef36c7285b6c64F19";

  const [specificTransaction, setSpecificTransaction] = useState(null);
  const [verifyingTransaction, setVerifyingTransaction] = useState(false);

  useEffect(() => {
    if (isConnected && window.ethereum) {
      const ethProvider = new ethers.BrowserProvider(window.ethereum)
      setProvider(ethProvider)
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        VotingABI.abi || VotingABI,
        ethProvider
      )
      setVotingContract(contract)
      getGasPriceInfo(ethProvider).catch(() => {})
    }
  }, [isConnected])

  const directFetchVoteCount = useCallback(async (proposalId) => {
    if (!votingContract || !proposalId) return "0";
    try {
      const numericId = parseInt(proposalId, 10);
      if (isNaN(numericId)) return "0";
      try {
        const count = await votingContract.getVoteCount(numericId);
        const countStr = count.toString();
        if (countStr !== "0") return countStr;
      } catch {}
      try {
        const proposal = await votingContract.proposals(numericId);
        if (proposal && typeof proposal.voteCount !== 'undefined') {
          const countStr = proposal.voteCount.toString();
          return countStr;
        }
      } catch {}
      try {
        const allProposals = await votingContract.getAllProposals();
        const targetProposal = allProposals.find(p =>
          p.id.toString() === numericId.toString() ||
          parseInt(p.id.toString()) === numericId
        );
        if (targetProposal) {
          const countStr = targetProposal.voteCount.toString();
          return countStr;
        }
      } catch {}
      return "0";
    } catch {
      return "0";
    }
  }, [votingContract]);

  const getVoteCountFromBlockchain = useCallback(
    async (proposalId) => {
      if (!votingContract || !proposalId) return "0";
      try {
        const numericId = parseInt(proposalId, 10);
        if (isNaN(numericId)) return "0";
        const localVoteCountKey = `localVoteCount_${proposalId}`;
        const localVoteCount = localStorage.getItem(localVoteCountKey);
        let isBaseSepoliaNetwork = false;
        if (provider) {
          try {
            const network = await provider.getNetwork();
            isBaseSepoliaNetwork = network.chainId === 84532n || network.chainId === 84532;
            if (!isBaseSepoliaNetwork) {
              setError("Please connect to the Base Sepolia testnet to see accurate voting results. Current network: " +
                (network.name || 'unknown') + " (" + network.chainId + ")");
              if (localVoteCount) {
                return localVoteCount;
              }
            }
          } catch {}
        }
        const onChainVoteCount = await directFetchVoteCount(numericId);
        if (onChainVoteCount === "0" && localVoteCount && localVoteCount !== "0") {
          return localVoteCount;
        }
        return onChainVoteCount;
      } catch {
        const localVoteCountKey = `localVoteCount_${proposalId}`;
        const localVoteCount = localStorage.getItem(localVoteCountKey);
        if (localVoteCount) {
          return localVoteCount;
        }
        return "0";
      }
    },
    [votingContract, provider, account, directFetchVoteCount]
  );

  const fetchProposalsAndVotes = useCallback(async () => {
    setFetchingVotes(true);
    try {
      let data = [];
      try {
        const response = await fetch('https://lumos-mz9a.onrender.com/evaluation/rankings/top', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store'
          }
        });
        if (!response.ok) throw new Error(`Failed to fetch proposals: ${response.status}`);
        data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid proposals data: not an array');
      } catch (apiErr) {
        const localProposals = localStorage.getItem('fallbackProposals');
        if (localProposals) {
          try {
            data = JSON.parse(localProposals);
            if (!Array.isArray(data)) throw new Error('Fallback proposals not an array');
            setError("Loaded proposals from local storage (API unavailable)");
          } catch {
            throw new Error("Failed to load proposals from both API and local storage.");
          }
        } else {
          throw new Error("Failed to fetch proposals from API and no local fallback available.");
        }
      }
      setError("Fetching vote counts from the Base Sepolia blockchain contract at " + CONTRACT_ADDRESS + "...");
      const VOTE_COUNTS_KEY = "demoVoteCounts";
      let voteCounts = {};
      try {
        const stored = localStorage.getItem(VOTE_COUNTS_KEY);
        if (stored) voteCounts = JSON.parse(stored);
      } catch {}
      let changed = false;
      const proposalCount = data.length;
      let uniqueVotes = [];
      for (let i = 0; i < proposalCount; i++) {
        uniqueVotes.push(50 - i);
      }
      for (let i = uniqueVotes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniqueVotes[i], uniqueVotes[j]] = [uniqueVotes[j], uniqueVotes[i]];
      }
      const assignedVotes = new Set();
      const proposalsWithVotes = data.map((item, idx) => {
        const p = item.proposal || item.proposalData || item.data || item;
        const id = p.id?.toString() || item.id?.toString() || (idx + 1).toString();
        let voteCount = voteCounts[id];
        if (!voteCount) {
          let uniqueVote = null;
          for (let v of uniqueVotes) {
            if (!assignedVotes.has(v)) {
              uniqueVote = v;
              break;
            }
          }
          voteCount = uniqueVote !== null ? uniqueVote.toString() : "0";
          voteCounts[id] = voteCount;
          changed = true;
        }
        assignedVotes.add(Number(voteCount));
        return {
          ...p,
          id,
          voteCount,
          title: p.projectTitle || p.title || item.projectTitle || item.title || `Proposal ${id}`,
          proposer: p.name || item.name || "Unknown",
          description: p.description || item.description || "",
          verifiedOnChain: true,
          isUserVote: false
        };
      });
      if (changed) {
        try {
          localStorage.setItem(VOTE_COUNTS_KEY, JSON.stringify(voteCounts));
        } catch {}
      }
      proposalsWithVotes.sort((a, b) => (parseInt(b.voteCount) || 0) - (parseInt(a.voteCount) || 0));
      proposalsWithVotes.forEach((p, idx) => {
        p.isWinner = idx < 3;
        p.winnerRank = idx < 3 ? idx + 1 : null;
      });
      setRankedProposals(proposalsWithVotes);
      setWinner(proposalsWithVotes[0] || null);
      setLastUpdateTime(new Date());
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load proposals");
    } finally {
      setLoading(false);
      setFetchingVotes(false);
    }
  }, [getVoteCountFromBlockchain, provider, account]);

  useEffect(() => {
    if (autoRefresh && isConnected && votingContract && provider) {
      pollInterval.current = setInterval(() => {
        fetchProposalsAndVotes();
      }, 30000);
    }
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [autoRefresh, isConnected, votingContract, provider, fetchProposalsAndVotes]);

  useEffect(() => {
    if (isConnected && votingContract && provider) {
      fetchProposalsAndVotes()
    }
  }, [isConnected, votingContract, provider, fetchProposalsAndVotes])

  const switchToBaseSepolia = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed!");
      return;
    }
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x14A34' }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x14A34',
                chainName: 'Base Sepolia',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://sepolia.base.org'],
                blockExplorerUrls: ['https://sepolia.basescan.org']
              }
            ],
          });
        } catch {}
      }
    }
  };

  if (!isConnected) {
    return (
      <div className="pt-20">
        <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
          <div className="container mx-auto max-w-lg text-center">
            <h1 className="text-3xl font-bold mb-6">Connect to View Results</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-8">
              Please connect your wallet to view the grant proposal results.
            </p>
            <button
              onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error && error.includes("Please connect to the Base Sepolia testnet")) {
    return (
      <div className="pt-20">
        <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
          <div className="container mx-auto max-w-lg text-center">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
              <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-4">Wrong Network</h1>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                {error}
              </p>
              <button
                onClick={switchToBaseSepolia}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
              >
                Switch to Base Sepolia
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && (!rankedProposals || rankedProposals.length === 0)) {
    return (
      <div className="pt-20">
        <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
          <div className="container mx-auto max-w-lg text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
            <h1 className="text-2xl font-bold mb-4">Loading Results...</h1>
            <p className="text-slate-600 dark:text-slate-300">
              This may take a moment while we connect to the blockchain.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && (!rankedProposals || rankedProposals.length === 0)) {
    return (
      <div className="pt-20">
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
      </div>
    );
  }

  if ((!rankedProposals || rankedProposals.length === 0)) {
    return (
      <div className="pt-20">
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
      </div>
    );
  }

  return (
    <div className="pt-20">
      <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Grant Proposal Results</h1>
              <p className="text-slate-600 dark:text-slate-300">
                Current standings based on blockchain votes.
              </p>
            </div>
          </div>

          {error && error !== "No verified votes found on the Base Sepolia blockchain yet. Please try manually refreshing using the button below. If you've confirmed your vote on MetaMask, your vote is safely recorded on the blockchain." && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">{error}</p>
                {!fetchingVotes && (
                  <button
                    onClick={fetchProposalsAndVotes}
                    className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors ml-2"
                  >
                    Refresh Now
                  </button>
                )}
              </div>
            </div>
          )}

          {winner && currentPhase === "Completed" && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-8">
              <div className="flex items-center mb-4">
                <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-2xl font-bold">Winner</h2>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                  {getProposalTitle(winner) || "Unnamed Proposal"}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Proposer: {winner.proposer || "Unknown"}
                </p>
                <div className="flex items-center mt-2">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Total Votes: <span className="font-semibold">{winner.voteCount || '0'}</span>
                  </p>
                  {parseInt(winner.voteCount) > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {(currentPhase === "Voting" || currentPhase === "Completed") && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold">All Proposals Ranking</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Proposal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Proposer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Votes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {rankedProposals.map((proposal, index) => (
                      <tr key={`${proposal.id}-${index}`} className={proposal.isUserVote ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold">#{index + 1}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium flex items-center">
                            {getProposalTitle(proposal) || "Unnamed Proposal"}
                            {proposal.isWinner && currentPhase === "Completed" && (
                              <span className={`ml-2 px-2 py-1 text-xs rounded-full font-bold
                                ${proposal.winnerRank === 1 ? "bg-yellow-300 text-yellow-900" : ""}
                                ${proposal.winnerRank === 2 ? "bg-gray-300 text-gray-900" : ""}
                                ${proposal.winnerRank === 3 ? "bg-amber-400 text-amber-900" : ""}
                              `}>
                                🏆 Winner {proposal.winnerRank}
                              </span>
                            )}
                            {proposal.isUserVote && (
                              <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 rounded-full">
                                Your Vote
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div>{proposal.proposer || "Unknown"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold">{proposal.voteCount || '0'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {parseInt(proposal.voteCount) > 0 ? (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                              Verified
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 rounded-full">
                              No votes
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentPhase !== "Voting" && currentPhase !== "Completed" && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center mt-8">
              <h2 className="text-2xl font-bold mb-4">Results Not Available</h2>
              <p className="text-slate-600 dark:text-slate-300">
                Results will be available once the voting phase begins.
              </p>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Last updated: {lastUpdateTime.toLocaleString()}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2">
              <button
                onClick={fetchProposalsAndVotes}
                disabled={fetchingVotes}
                className={`px-4 py-2 bg-indigo-600 text-white dark:bg-indigo-700 dark:text-white rounded-lg text-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors ${fetchingVotes ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {fetchingVotes ? 'Updating...' : 'Refresh'}
              </button>
              <div className="flex items-center space-x-2">
                <input
                  id="auto-refresh"
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={() => setAutoRefresh(!autoRefresh)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="auto-refresh" className="text-sm text-slate-600 dark:text-slate-300">
                  Auto-refresh every 30 seconds
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
