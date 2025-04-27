import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBlockchain } from '../context/BlockchainContext'
import websocketService from '../utils/websocketService'
import { ethers } from 'ethers'
import VotingABI from '../contracts/Voting.json'
import { castVoteOnChain } from '../utils/voteHelpers'
import { getBaseSepoliaGasOverrides, verifyTransactionOnBaseSepolia } from '../utils/transactionHelper'
import { storeLocalVote, updateLocalVoteStatus } from '../utils/localVoteStorage'

const BASE_SEPOLIA_CHAIN_ID = 84532;
// Add increased timeout duration - Base Sepolia can be very slow
const TRANSACTION_TIMEOUT = 300000; // 5 minutes instead of 2 minutes

// Helper: extract only the required fields from markdown description
function extractFields(description) {
  if (!description) return {};
  // Map markdown section names to required field keys
  const fieldMap = {
    name: "Name",
    emailId: "Email",
    links: "Links",
    projectTitle: "Project Title",
    projectDescription: "Description",
    brief_summary: "Brief Summary",
    primaryGoal: "Primary Goal",
    specificObjective: "Specific Objectives",
    budget: "Budget",
    longTermPlan: "Long Term Plan",
    futureFundingPlans: "Future Funding Plans"
  };
  const result = {};
  for (const [key, section] of Object.entries(fieldMap)) {
    const match = description.match(new RegExp(`## ${section}\\s*([\\s\\S]*?)(?=\\n## |$)`, 'i'));
    if (match && match[1]) result[key] = match[1].trim();
  }
  return result;
}

// Helper to get the best proposal title
function getProposalTitle(proposal) {
  if (!proposal) return '';
  return (
    proposal.projectTitle?.trim() ||
    proposal.title?.trim() ||
    proposal._fields?.projectTitle?.trim() ||
    proposal._fields?.title?.trim() ||
    proposal.name?.trim() ||
    proposal._fields?.name?.trim() ||
    `Proposal ${proposal.id || ''}`.trim()
  );
}

export default function VotingPage() {
  const navigate = useNavigate()
  
  // Add fallback values when useBlockchain returns null to prevent destructuring errors
  const blockchainContext = useBlockchain() || {};
  const { 
    isConnected = false, 
    currentPhase = "Voting", 
    voteForProposal = async () => {
      console.error("Blockchain context not available");
      throw new Error("Voting function not available");
    }, 
    connect = async () => {
      console.error("Blockchain context not available");
      throw new Error("Connect function not available");
    }, 
    account = '',
    hasVoted = async () => false,
    diagnoseContractConnectivity = async () => ({}),
    clearVote = async () => ({}),
    votingContractAddress = ''
  } = blockchainContext;
  
  const [proposals, setProposals] = useState([])
  const [selectedProposal, setSelectedProposal] = useState(null)
  const [isVoting, setIsVoting] = useState(false)
  const [hasVotedState, setHasVoted] = useState(false)
  const [votedProposal, setVotedProposal] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [detailProposal, setDetailProposal] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isResettingVote, setIsResettingVote] = useState(false);
  const [provider, setProvider] = useState(null);
  const [votingContract, setVotingContract] = useState(null);
  const [networkChainId, setNetworkChainId] = useState(null);
  const [networkName, setNetworkName] = useState('');
  const [transactionHash, setTransactionHash] = useState(null);
  const [verificationInProgress, setVerificationInProgress] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Setup provider and contract when connected
  useEffect(() => {
    if (isConnected && window.ethereum && votingContractAddress) {
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(ethProvider);
      const contract = new ethers.Contract(
        votingContractAddress,
        VotingABI.abi || VotingABI,
        ethProvider
      );
      setVotingContract(contract);
    }
  }, [isConnected, votingContractAddress]);

  // Track current network and update on chain changes
  useEffect(() => {
    async function fetchNetwork() {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          setNetworkChainId(Number(network.chainId));
          setNetworkName(network.name || '');
        } catch {
          setNetworkChainId(null);
          setNetworkName('');
        }
      }
    }
    fetchNetwork();
    if (window.ethereum && window.ethereum.on) {
      window.ethereum.on('chainChanged', fetchNetwork);
      return () => window.ethereum.removeListener('chainChanged', fetchNetwork);
    }
  }, []);

  const isOnBaseSepolia = networkChainId === BASE_SEPOLIA_CHAIN_ID;

  // Helper: fetch vote count from blockchain for a proposal id
  const getVoteCountFromBlockchain = useCallback(async (proposalId) => {
    if (!votingContract || !proposalId) return "0";
    try {
      const numericId = parseInt(proposalId, 10);
      if (isNaN(numericId)) return "0";
      // Defensive: Only call if contract is on the correct network
      if (provider) {
        const network = await provider.getNetwork();
        if (network.chainId !== 84532n) return "0";
      }
      const proposal = await votingContract.proposals(numericId);
      return proposal.voteCount ? proposal.voteCount.toString() : "0";
    } catch (err) {
      console.warn("Failed to fetch vote count from blockchain:", err);
      return "0";
    }
  }, [votingContract, provider]);

  // Fetch proposals from API and update vote counts from blockchain - improve with better error handling
  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Use timestamp to avoid caching issues
      const timestamp = Date.now();
      const response = await fetch(`https://lumos-mz9a.onrender.com/evaluation/rankings/top?_=${timestamp}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        }
      });
      
      if (!response.ok) throw new Error(`Failed to fetch proposals: ${response.status}`);
      
      const text = await response.text();
      if (!text || text.trim() === '') throw new Error('Empty response from server');
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        throw new Error('Invalid response format from server');
      }
      
      if (!Array.isArray(data)) throw new Error('Invalid proposals data: not an array');
      
      // Process proposals into a consistent format
      const normalized = data.map((item, index) => {
        const p = item.proposal || item.proposalData || item.data || item;
        const description = p.description || item.description || '';
        const mergedFields = {
          ...(extractFields(description)),
          ...(p || {}),
        };
        const title = mergedFields.projectTitle?.trim() || p.projectTitle?.trim() || item.projectTitle?.trim() || p.title?.trim() || item.title?.trim() || `Example Proposal ${index + 1}`;
        const descriptionFinal = description || mergedFields.projectDescription || mergedFields.description || '';
        // Fetch proposer name from all possible sources
        const proposerFinal =
          p.proposerName ||
          item.proposerName ||
          mergedFields.name ||
          p.name ||
          item.name ||
          p.proposer ||
          item.proposer ||
          'Unknown';

        return {
          ...p,
          id: (index + 1).toString(),
          voteCount: p.voteCount || item.voteCount || "0",
          rank: item.rank || index + 1,
          title,
          proposer: proposerFinal,
          description: descriptionFinal,
          _fields: mergedFields,
        };
      });
      
      let proposalsFromApi = [...normalized];
      
      // Update vote counts from blockchain
      for (let i = 0; i < proposalsFromApi.length; i++) {
        const proposal = proposalsFromApi[i];
        proposal.voteCount = await getVoteCountFromBlockchain(proposal.id);
      }

      // Process proposals but don't fetch vote counts for Voting page display
      // We'll only populate basic proposal data needed for voting
      setProposals(proposalsFromApi);
      
      // Check voted status after loading proposals
      if (isConnected && account) {
        const voted = await hasVoted(account);
        setHasVoted(voted);
        if (voted) {
          const votedForId = localStorage.getItem(`votedFor_${account}`);
          if (votedForId) {
            const votedProposal = proposalsFromApi.find(p => p.id === votedForId);
            if (votedProposal) {
              setVotedProposal(votedProposal);
              setSelectedProposal(votedProposal.id);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching proposals:", err);
      setError(err.message || 'Failed to load proposals');
      // Create dummy proposals if we can't load from API to prevent UI from hanging
      setProposals([
        {
          id: "error-1",
          title: "Error Loading Proposals",
          description: "We encountered an error while loading proposals. Please try refreshing the page.",
          _fields: { name: "System" },
          proposer: "System",
          voteCount: "0"
        }
      ]);
    } finally {
      setLoading(false); // Always set loading to false regardless of success/failure
    }
  }, [isConnected, account, hasVoted, getVoteCountFromBlockchain]);

  // Now add the effect AFTER fetchProposals is defined
  useEffect(() => {
    // Initial fetch of proposals
    fetchProposals().catch(err => {
      console.error("Error in initial proposal fetch:", err);
      setError(err.message || "Failed to load proposals");
      setLoading(false); // Ensure loading state is updated even on error
    });
  }, [fetchProposals]);

  // Handler for submitting a vote - Improved reliability
  const handleVote = async () => {
    if (!selectedProposal) {
      setError("Please select a proposal to vote for");
      return;
    }
    
    setIsVoting(true);
    setError('');
    setTransactionHash(null);
    
    try {
      // Ensure we're connected and have the right chain
      if (!isConnected || !provider) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }
      
      // Verify network before attempting to vote
      let network;
      try {
        network = await provider.getNetwork();
      } catch (netErr) {
        setError("Could not get network from wallet. Please ensure MetaMask is unlocked and connected.");
        setIsVoting(false);
        return;
      }
      // Base Sepolia has chain ID 84532
      if (network.chainId !== 84532n && network.chainId !== 84532) {
        // Try to request network switch
        if (window.ethereum && window.ethereum.request) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x14A34' }], // 84532 in hex
            });
            // Wait for network to update
            network = await provider.getNetwork();
            if (network.chainId !== 84532n && network.chainId !== 84532) {
              setError("Wrong network. Please switch to Base Sepolia (Chain ID: 84532) in your wallet.");
              setIsVoting(false);
              return;
            }
          } catch (switchErr) {
            setError("Please switch your wallet to Base Sepolia (Chain ID: 84532) and try again.");
            setIsVoting(false);
            return;
          }
        } else {
          setError("Wrong network. Please switch to Base Sepolia (Chain ID: 84532) in your wallet.");
          setIsVoting(false);
          return;
        }
      }

      // Execute the vote transaction with improved error handling
      if (votingContract && provider) {
        // Always get a fresh signer from the provider
        let signer;
        try {
          signer = await provider.getSigner();
        } catch (signerErr) {
          setError("Could not get signer from wallet. Please ensure MetaMask is unlocked and connected.");
          setIsVoting(false);
          return;
        }
        // Defensive: check signer address matches account
        let signerAddress;
        try {
          signerAddress = await signer.getAddress();
        } catch {
          setError("Could not get signer address. Please reconnect your wallet.");
          setIsVoting(false);
          return;
        }
        if (signerAddress.toLowerCase() !== account.toLowerCase()) {
          setError("Wallet address mismatch. Please reconnect your wallet.");
          setIsVoting(false);
          return;
        }

        const contractWithSigner = votingContract.connect(signer);
        const numericId = parseInt(selectedProposal, 10);

        if (isNaN(numericId)) {
          setError("Invalid proposal ID for voting");
          setIsVoting(false);
          return;
        }

        // Defensive: Only log contract functions if interface and functions exist
        let contractFunctionNames = [];
        if (
          contractWithSigner &&
          contractWithSigner.interface &&
          contractWithSigner.interface.functions &&
          typeof contractWithSigner.interface.functions === 'object'
        ) {
          contractFunctionNames = Object.keys(contractWithSigner.interface.functions)
            .filter(f => !f.includes('('));
        }
        console.log("Available contract functions:", contractFunctionNames.join(', '));

        try {
          // Ensure the vote function exists
          if (typeof contractWithSigner.vote !== 'function') {
            setError("Vote function not available on the contract");
            setIsVoting(false);
            return;
          }

          // Double check contract address for debugging
          console.log("Voting on contract at address:", await contractWithSigner.getAddress());

          // Get optimized gas settings for Base Sepolia
          const gasOverrides = await getBaseSepoliaGasOverrides(provider);
          console.log("Using gas overrides for vote transaction:", gasOverrides);
          
          // Call the vote function with proper gas settings to ensure transaction completes
          const tx = await contractWithSigner.vote(numericId, gasOverrides);
          console.log("Vote transaction sent:", tx);
          
          // Save transaction hash for verification
          setTransactionHash(tx.hash);
          
          // Store vote in local storage using our utility function
          storeLocalVote(numericId.toString(), account, tx.hash);

          // Consider transaction submitted as success, don't wait for confirmation
          setSuccess(true);
          setError("");
          setVerificationInProgress(true);
          
          // Start background verification that doesn't block the UI
          verifyTransactionInBackground(tx.hash, numericId, account);
          
          // Update UI immediately
          setHasVoted(true);
          const votedProposal = proposals.find(p => p.id === selectedProposal);
          setVotedProposal(votedProposal);
          
          // Show success message with transaction link
          setSuccess(true);
          setError(
            <div>
              Your vote has been submitted to the blockchain!
              <div className="mt-2 break-all">
                <a 
                  href={`https://sepolia.basescan.org/tx/${tx.hash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  View on Base Sepolia Explorer
                </a>
              </div>
            </div>
          );
                   
          // Navigate to results page after a brief delay
          setTimeout(() => {
            navigate('/results');
          }, 3000);
          
          return;
        } catch (txErr) {
          // Handle transaction errors
          if (
            txErr?.reason?.includes("already voted") || 
            (txErr?.errorName === "Error" && txErr?.errorArgs?.[0]?.includes("already voted"))
          ) {
            setHasVoted(true);
            throw new Error("You have already voted. Each address can only vote once.");
          }
          throw txErr;
        }
      } else {
        // Fall back to API voting if contract isn't available
        await voteForProposal(selectedProposal);
        
        // Use our utility function instead of direct localStorage access
        storeLocalVote(selectedProposal, account);
        
        // Update UI state
        setHasVoted(true);
        const votedProposal = proposals.find(p => p.id === selectedProposal);
        setVotedProposal(votedProposal);
        
        // Navigate to results page
        setTimeout(() => {
          navigate('/results');
        }, 1500);
      }
    } catch (error) {
      console.error("Error submitting vote:", error);
      
      // Format user-friendly error messages
      let errorMessage = "Failed to submit vote";
      
      if (error?.reason?.includes("already voted") || 
          error?.message?.includes("already voted") ||
          (error?.errorName === "Error" && error?.errorArgs?.[0]?.includes("already voted"))) {
        errorMessage = "You have already voted. You cannot vote again.";
        
        // Double-check and update the UI state if they've actually voted
        const voted = await hasVoted(account);
        setHasVoted(voted);
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setSuccess(false);
    } finally {
      setIsVoting(false);
    }
  };

  // Helper function to verify transaction status in background
  const verifyTransactionInBackground = async (txHash, proposalId, voterAccount) => {
    // Start in a non-blocking way
    setTimeout(async () => {
      // Keep trying up to 30 times with a 20-second delay between attempts
      for (let attempt = 0; attempt < 30; attempt++) {
        try {
          console.log(`Background verification attempt ${attempt + 1} for tx: ${txHash}`);
          
          // Wait between checks
          await new Promise(r => setTimeout(r, 20000));
          
          if (!provider) {
            console.warn("Provider not available for transaction verification");
            continue;
          }
          
          // Use our verification utility
          const verificationResult = await verifyTransactionOnBaseSepolia(provider, txHash);
          console.log("Verification result:", verificationResult);
          
          if (verificationResult.exists) {
            if (verificationResult.status === "success") {
              // Transaction success! Update local vote count to match blockchain
              console.log("Vote transaction confirmed successfully in the background");
              
              // Use our utility function to update the status
              updateLocalVoteStatus(proposalId.toString(), "confirmed");
              
              // Try to update the API as well to ensure consistency
              try {
                const response = await fetch('https://lumos-mz9a.onrender.com/proposals/updateVotes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    voter: voterAccount,
                    proposalId,
                    action: 'vote',
                    transactionHash: txHash
                  })
                });
                
                if (response.ok) {
                  console.log("Successfully updated vote on server");
                }
              } catch (apiErr) {
                console.warn("Failed to update vote on server:", apiErr);
              }
              
              return true;
            } else if (verificationResult.status === "failed") {
              // Transaction failed on chain - update local storage
              console.error("Vote transaction failed on-chain");
              updateLocalVoteStatus(proposalId.toString(), "failed");
              return false;
            }
            // Still pending, continue checking
          } else {
            console.log("Transaction not found yet, may still be propagating...");
          }
        } catch (err) {
          console.warn("Error in background verification:", err);
        }
      }
      
      // After all attempts, just log the status
      console.log(`Transaction verification ended after max attempts: ${txHash}`);
      return false;
    }, 0);
  };

  // Format description for modal (returns only the required fields)
  const formatDescription = (proposal) => {
    if (!proposal || !proposal._fields) {
      return {};
    }
    const allFields = {
      ...Object.keys(proposal).reduce((acc, key) => {
        const fieldsToHide = ['id', 'rank', 'submittedAt', 'stellarWalletAddress', 'status', '_id'];
        if (!key.startsWith('_') && 
            !fieldsToHide.includes(key) &&
            typeof proposal[key] !== 'object' && 
            typeof proposal[key] !== 'function') {
          acc[key] = proposal[key];
        }
        return acc;
      }, {}),
      ...(proposal._fields || {})
    };
    
    return allFields;
  };

  // Get brief summary for card - improved with better fallbacks
  const getBriefDescription = (proposal) => {
    if (!proposal) return "No description available";

    if (proposal._fields?.brief_summary) {
      const summary = proposal._fields.brief_summary;
      return summary.length > 150 ? summary.substring(0, 147) + '...' : summary;
    }
    
    if (proposal._fields?.projectDescription) {
      const desc = proposal._fields.projectDescription;
      return desc.length > 150 ? desc.substring(0, 147) + '...' : desc;
    }
    
    if (proposal.description) {
      const firstParagraph = proposal.description.split('\n\n')[0] || proposal.description;
      return firstParagraph.length > 150 ? firstParagraph.substring(0, 147) + '...' : firstParagraph;
    }
    
    return "No description available";
  };

  // Handler for showing the details modal
  const handleShowDetails = (proposalOrId) => {
    let proposalId = null;
    if (typeof proposalOrId === "string") {
      proposalId = proposalOrId;
    } else if (proposalOrId && proposalOrId.id) {
      proposalId = proposalOrId.id;
    }
    let proposalObj = proposalId 
      ? proposals.find(p => p.id === proposalId) 
      : null;
    if (!proposalObj && proposalOrId && typeof proposalOrId === "object") {
      proposalObj = proposalOrId;
    }
    if (!proposalObj) {
      proposalObj = {
        id: proposalId || "unknown",
        title: "Unknown Proposal",
        description: "No details available.",
        voteCount: "0",
        proposer: "Unknown"
      };
    }
    setDetailProposal(proposalObj);
    setShowModal(true);
  };

  // Update the loading state to handle UI edge cases
  if (loading) {
    return (
      <div className="pt-20">
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="text-center">
            <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full text-indigo-600" role="status"></div>
            <p className="text-slate-600 dark:text-slate-300 mt-4">Loading proposals...</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // UI rendering
  if (!isConnected) {
    return (
      <div className="pt-20">
        <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
          <div className="container mx-auto max-w-lg text-center">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
              <h2 className="text-xl font-bold mb-4">Connect to Vote</h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Please connect your wallet to participate in voting.
              </p>
              <button 
                onClick={connect}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
              >
                Connect Wallet
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error if not on Base Sepolia
  if (isConnected && !isOnBaseSepolia) {
    return (
      <div className="pt-20">
        <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
          <div className="container mx-auto max-w-lg text-center">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
              <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-4">Wrong Network</h1>
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                Please switch your wallet to <span className="font-semibold">Base Sepolia Testnet</span> (Chain ID: 84532) to participate in voting.
              </p>
              <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                {networkChainId && (
                  <>Current network: <span className="font-mono">{networkName || 'Unknown'} (Chain ID: {networkChainId})</span></>
                )}
              </div>
              <button
                onClick={async () => {
                  if (window.ethereum && window.ethereum.request) {
                    try {
                      await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x14A34' }],
                      });
                    } catch (err) {
                      // ignore
                    }
                  }
                }}
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

  if (error) {
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
              <h1 className="text-2xl font-bold mb-4">Error</h1>
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                {error}
              </p>
              <div className="flex flex-col items-center space-y-4 mt-6">
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Reload Page
                </button>
                <button 
                  onClick={() => navigate('/')} 
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main component render
  return (
    <div className="pt-20">
      <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
        {/* Show transaction verification status */}
        {verificationInProgress && transactionHash && (
          <div className="fixed bottom-4 right-4 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-4 max-w-md z-40">
            <div className="flex items-center">
              <div className="mr-3">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-600"></div>
              </div>
              <div>
                <h4 className="font-semibold text-sm">Transaction Processing</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Your vote is being processed on Base Sepolia. This can take several minutes.
                </p>
                <a 
                  href={`https://sepolia.basescan.org/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 mt-1 inline-block"
                >
                  View on Block Explorer →
                </a>
              </div>
            </div>
          </div>
        )}
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold mb-6">Voting Page</h1>
          {!isConnected ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
              <h2 className="text-xl font-bold mb-4">Connect to Vote</h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Please connect your wallet to participate in voting.
              </p>
              <button 
                onClick={connect}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <>
              {/* Phase status notification */}
              {currentPhase !== "Voting" && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-400 mb-2">
                    Voting Not Active
                  </h3>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    {currentPhase === "Submission" && "Proposals are still being submitted. Voting will begin after the submission phase ends."}
                    {currentPhase === "GroqCheck" && "Proposals are being evaluated by Groq AI. The top proposals will be available for voting soon."}
                    {currentPhase === "Completed" && "The voting phase has ended. Check the results page to see the winning proposals."}
                  </p>
                </div>
              )}

              {/* Already voted notification */}
              {hasVotedState && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-400 mb-2">
                    You've Already Voted
                  </h3>
                  {votedProposal ? (
                    <>
                      <p className="text-green-700 dark:text-green-300 mb-2">
                        You have cast your vote for:
                      </p>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4">
                        <h4 className="font-bold">{getProposalTitle(votedProposal)}</h4>
                        <div className="mt-2">
                          <button 
                            onClick={() => handleShowDetails(votedProposal)}
                            className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Show Details
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-green-700 dark:text-green-300 mb-4">
                      You have already cast your vote for a proposal. This vote is stored on the blockchain and cannot be changed.
                    </p>
                  )}
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => navigate('/results')}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
                    >
                      View Current Results
                    </button>
                  </div>
                </div>
              )}

              {/* Proposals section - only show if not voted yet */}
              {currentPhase === "Voting" && !hasVotedState ? (
                <div className="mb-8">
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden mb-4">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                      <h2 className="text-xl font-bold mb-2">Available Proposals</h2>
                      <p className="text-slate-600 dark:text-slate-300">
                        Review the proposals below and select one to vote for.
                      </p>
                    </div>
                  </div>
                  {proposals.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg text-center">
                      <p className="text-slate-500 dark:text-slate-400">No proposals available yet.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-slate-600 dark:text-slate-300 mb-4">
                        Found {proposals.length} proposals available for voting.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {proposals.map((proposal) => (
                          <div 
                            key={proposal.id || `proposal-${Math.random()}`}
                            className={`bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg ${
                              selectedProposal === proposal.id
                                ? 'ring-2 ring-indigo-500 transform scale-[1.02]'
                                : ''
                            }`}
                          >
                            <div className="p-5">
                              <div className="flex justify-between items-start mb-3">
                                <h3 className="font-semibold text-lg line-clamp-2">
                                  {getProposalTitle(proposal)}
                                </h3>
                              </div>
                              <div className="mb-4">
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 min-h-[3rem]">
                                  {getBriefDescription(proposal)}
                                </p>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                Proposer: {
                                  proposal._fields?.name?.trim()
                                    ? proposal._fields.name
                                    : proposal.name?.trim()
                                      ? proposal.name
                                      : proposal.proposer && proposal.proposer !== "Unknown"
                                        ? `${proposal.proposer.substring(0, 6)}...${proposal.proposer.length > 8 ? proposal.proposer.substring(proposal.proposer.length - 4) : ""}`
                                        : 'Unknown'
                                }
                              </div>
                              <div className="flex justify-between items-center">
                                <button
                                  onClick={() => handleShowDetails(proposal)}
                                  className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1.5 12s4-7 10.5-7 10.5 7-10.5 7S1.5 12 1.5 12z" />
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={2} fill="none"/>
                                  </svg>
                                  View Details
                                </button>
                                <button
                                  onClick={() => setSelectedProposal(proposal.id)}
                                  className={`px-3 py-1 rounded-md text-sm ${
                                    selectedProposal === proposal.id
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                                  }`}
                                >
                                  {selectedProposal === proposal.id ? 'Selected' : 'Select'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  
                  {proposals.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mt-6 flex flex-col sm:flex-row justify-between items-center">
                      <div className="mb-4 sm:mb-0">
                        <p className="text-slate-700 dark:text-slate-300 font-medium">
                          {selectedProposal 
                            ? "You've selected a proposal" 
                            : "Please select a proposal to vote for"}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {selectedProposal 
                            ? "Click 'Submit Vote' to confirm your selection" 
                            : "Click on 'Select' under any proposal to choose it"}
                        </p>
                      </div>
                      <button
                        onClick={handleVote}
                        disabled={isVoting || !selectedProposal}
                        className={`px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300 ${
                          (isVoting || !selectedProposal) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isVoting ? 'Voting...' : 'Submit Vote'}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Show "View Results" button when voting is completed */}
              {currentPhase === "Completed" && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => navigate('/results')}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
                  >
                    View Results
                  </button>
                </div>
              )}

              {/* Proposal Details Modal */}
              {showModal && detailProposal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
                    <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Proposal Details</h3>
                      <button 
                        onClick={() => setShowModal(false)}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-6 overflow-y-auto max-h-[70vh]">
                      <div className="mb-6">
                        <div className="flex justify-between items-start">
                          <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">{getProposalTitle(detailProposal)}</h2>
                        </div>
                      </div>
                      {(() => {
                        const f = formatDescription(detailProposal);
                        return (
                          <div className="space-y-6">
                            {f.name && (
                              <div>
                                <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Name</h4>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded">{f.name}</div>
                              </div>
                            )}
                            {f.emailId && (
                              <div>
                                <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Email</h4>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded">{f.emailId}</div>
                              </div>
                            )}
                            {f.links && (
                              <div>
                                <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Links</h4>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded">{f.links}</div>
                              </div>
                            )}
                            {f.projectTitle && (
                              <div>
                                <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Project Title</h4>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded">{f.projectTitle}</div>
                              </div>
                            )}
                            {detailProposal.description && (
                              <div>
                                <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Full Description</h4>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line text-sm">
                                  {detailProposal.description}
                                </div>
                              </div>
                            )}
                            {f.projectDescription && (
                              <div>
                                <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Project Description</h4>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line">{f.projectDescription}</div>
                              </div>
                            )}
                            {f.brief_summary && (
                              <div>
                                <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Brief Summary</h4>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line">{f.brief_summary}</div>
                              </div>
                            )}
                            {f.primaryGoal && (
                              <div>
                                <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Primary Goal</h4>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line">{f.primaryGoal}</div>
                              </div>
                            )}
                            {f.specificObjective && (
                              <div>
                                <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Specific Objective</h4>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line">{f.specificObjective}</div>
                              </div>
                            )}
                            {f.budget && (
                              <div>
                                <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Budget</h4>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line">{f.budget}</div>
                              </div>
                            )}
                            {f.longTermPlan && (
                              <div>
                                <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Long Term Plan</h4>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line">{f.longTermPlan}</div>
                              </div>
                            )}
                            {f.futureFundingPlans && (
                              <div>
                                <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Future Funding Plans</h4>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line">{f.futureFundingPlans}</div>
                              </div>
                            )}
                            {Object.entries(f).map(([key, value]) => {
                              const handledFields = [
                                'id', 'title', 'proposer', 'voteCount', 'description', 'rank', 'timestamp',
                                'name', 'emailId', 'links', 'projectTitle', 'projectDescription', 
                                'brief_summary', 'primaryGoal', 'specificObjective', 'budget',
                                'longTermPlan', 'futureFundingPlans', 'stellarWalletAddress', 'status',
                                'submittedAt'
                              ];
                              
                              if (!handledFields.includes(key) && 
                                  !key.startsWith('_') && 
                                  typeof value !== 'object' &&
                                  typeof value !== 'function') {
                                const formattedKey = key
                                  .replace(/_/g, ' ')
                                  .replace(/\b\w/g, l => l.toUpperCase());
                                return (
                                  <div key={key}>
                                    <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">
                                      {formattedKey}
                                    </h4>
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line">
                                      {value?.toString()}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                      {!hasVotedState && currentPhase === "Voting" && (
                        <button
                          onClick={() => {
                            setSelectedProposal(detailProposal.id);
                            setShowModal(false);
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 mr-2"
                        >
                          Select This Proposal
                        </button>
                      )}
                      <button
                        onClick={() => setShowModal(false)}
                        className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
