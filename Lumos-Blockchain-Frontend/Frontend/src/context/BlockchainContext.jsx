import { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { getCurrentPhase, setCurrentPhase, advanceToNextPhase, revertToPreviousPhase, PHASES } from '../utils/phaseManager'
import GrantManagerV2ABI from '../contracts/GrantManagerV2.json'
import VotingABI from '../contracts/Voting.json'

// Replace process.env with import.meta.env for Vite
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x012499D995eB88BeD9350dB5ec37EC5CCC975555";
const VOTING_ADDRESS = import.meta.env.VITE_VOTING_ADDRESS || "0x5cE016f2731e1c6877542Ddef36c7285b6c64F19";

const BlockchainContext = createContext(null);

export function useBlockchain() {
  return useContext(BlockchainContext);
}

export function BlockchainProvider({ children }) {
  // User account state
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Current phase tracking
  const [currentPhase, setCurrentPhaseState] = useState("");
  const [phaseLoading, setPhaseLoading] = useState(false);
  const [phaseError, setPhaseError] = useState("");
  const [proposals, setProposals] = useState([]);
  const [groqEvaluationProgress, setGroqEvaluationProgress] = useState(0);
  const [groqEvaluationStatus, setGroqEvaluationStatus] = useState('pending');
  const [groqEvaluationMessage, setGroqEvaluationMessage] = useState('');
  const [votingContractAddress, setVotingContractAddress] = useState(import.meta.env.VITE_VOTING_ADDRESS || VOTING_ADDRESS);

  // Only for wallet connection and account management
  const connect = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("No Ethereum provider detected");
      }
      
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      setSigner(signer);
      setProvider(provider);

      const userAddress = await signer.getAddress();
      setAccount(userAddress);
      
      // Get admin address from environment variable
      // Using an environment variable is more secure than hardcoding
      let adminAddress = import.meta.env.VITE_ADMIN_ADDRESS || "";
      
      // If environment variable is not set, log a warning
      if (!adminAddress) {
        console.warn("VITE_ADMIN_ADDRESS not set, defaulting to connected account");
        adminAddress = userAddress;
      }
      
      // Check if the connected account is owner/admin
      setIsOwner(userAddress === adminAddress);
      setIsAdmin(userAddress === adminAddress);
      
      setIsConnected(true);
      setLoading(false);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to connect wallet");
      setLoading(false);
      setIsConnected(false);
      throw err;
    }
  };

  // Disconnect wallet
  const disconnect = () => {
    setAccount('');
    setIsConnected(false);
    setSigner(null);
    setProvider(null);
    setIsOwner(false);
    setIsAdmin(false);
  };

  // Get current phase from contract
  const fetchCurrentPhase = async () => {
    try {
      setPhaseLoading(true);
      const phase = await getCurrentPhase();
      setCurrentPhaseState(phase);
      setPhaseLoading(false);
      return phase;
    } catch (err) {
      setPhaseError(err.message || "Failed to get current phase");
      setPhaseLoading(false);
      return "";
    }
  };

  // Update phase
  const setPhase = async (phase) => {
    if (!phase || !Object.values(PHASES).includes(phase)) {
      throw new Error(`Invalid phase: ${phase}`);
    }
    
    try {
      setPhaseLoading(true);
      await setCurrentPhase(phase);
      setCurrentPhaseState(phase);
      setPhaseLoading(false);
    } catch (err) {
      setPhaseError(err.message || "Failed to set phase");
      setPhaseLoading(false);
      throw err;
    }
  };

  // Vote for a proposal
  const voteForProposal = async (proposalId) => {
    if (!isConnected || !signer) {
      throw new Error("Wallet not connected");
    }

    try {
      localStorage.setItem(`hasVoted_${account}`, 'true');
      localStorage.setItem(`votedFor_${account}`, proposalId);

      try {
        const response = await fetch('https://lumos-mz9a.onrender.com/proposals/updateVotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voter: account,
            proposalId,
            action: 'vote'
          })
        });

        if (!response.ok) {
          console.warn("Server vote update failed, but local storage succeeded");
        }
      } catch (apiError) {
        console.warn("API vote submission error:", apiError);
      }

      return { success: true };
    } catch (err) {
      console.error("Voting error:", err);
      throw new Error(err.message || "Failed to vote for proposal");
    }
  };

  // Check if user has voted
  const hasVoted = async (userAddress) => {
    const addr = userAddress || account;
    if (!addr) return false;

    return localStorage.getItem(`hasVoted_${addr}`) === 'true';
  };

  const getVotedProposal = async (userAddress) => {
    const addr = userAddress || account;
    if (!addr) return null;

    const hasVotedLocal = localStorage.getItem(`hasVoted_${addr}`) === 'true';
    if (!hasVotedLocal) return null;

    const proposalId = localStorage.getItem(`votedFor_${addr}`);
    if (!proposalId) return null;

    const votedProposal = proposals.find(p => p.id === proposalId);
    if (votedProposal) {
      return votedProposal;
    }

    return {
      id: proposalId,
      title: "Proposal #" + proposalId,
      description: "Details loading...",
      proposer: "Unknown",
      voteCount: "1"
    };
  };

  const clearVote = async (userAddress) => {
    const addr = userAddress || account;
    if (!addr) {
      return { success: false, message: "No address specified" };
    }

    if (addr !== account && !isAdmin) {
      return { success: false, message: "Only admins can clear other users' votes" };
    }

    try {
      localStorage.removeItem(`hasVoted_${addr}`);
      localStorage.removeItem(`votedFor_${addr}`);

      try {
        const response = await fetch('https://lumos-mz9a.onrender.com/proposals/updateVotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voter: addr,
            action: 'clearVote'
          })
        });

        if (!response.ok) {
          console.warn("Server vote clear failed, but local storage cleared");
        }
      } catch (apiError) {
        console.warn("API vote clearing error:", apiError);
      }

      return { success: true };
    } catch (err) {
      console.error("Clear vote error:", err);
      return { success: false, message: err.message || "Failed to clear vote" };
    }
  };

  // Reset all votes (admin function)
  const resetAllVotes = async () => {
    if (!isConnected || !signer) {
      throw new Error("Wallet not connected");
    }

    try {
      // First, try direct contract call
      const contract = new ethers.Contract(
        votingContractAddress,
        VotingABI.abi || VotingABI,
        signer
      );
      
      // Log available functions to debug
      console.log("Available functions:", Object.keys(contract.interface.functions));
      
      // Try multiple possible function names
      try {
        console.log("Trying resetAllVotes on contract");
        if (typeof contract.resetAllVotes === 'function') {
          const tx = await contract.resetAllVotes();
          console.log("Reset transaction sent:", tx.hash);
          const receipt = await tx.wait();
          console.log("Reset transaction confirmed:", receipt);
          return { success: true, message: "Votes reset successfully via blockchain" };
        } else {
          throw new Error("resetAllVotes function not available");
        }
      } catch (resetErr) {
        console.warn("Standard reset failed:", resetErr);
        
        try {
          console.log("Trying adminResetAllVotes fallback");
          if (typeof contract.adminResetAllVotes === 'function') {
            const tx = await contract.adminResetAllVotes();
            console.log("Admin reset transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("Admin reset transaction confirmed:", receipt);
            return { success: true, message: "Votes reset successfully via admin function" };
          } else {
            throw new Error("adminResetAllVotes function not available");
          }
        } catch (adminErr) {
          console.warn("Admin function also failed:", adminErr);
          
          // Last resort - try invoking a function by name directly
          try {
            // Check if we need to manually construct a function call
            const functionSignature = Object.keys(contract.interface.functions)
              .find(fn => fn.includes("reset") && fn.includes("Vote"));
              
            if (functionSignature) {
              console.log("Found reset function:", functionSignature);
              const tx = await contract[functionSignature.split('(')[0]]();
              const receipt = await tx.wait();
              return { success: true, message: `Votes reset using ${functionSignature}` };
            } else {
              throw new Error("No reset function found in contract");
            }
          } catch (fallbackErr) {
            console.error("All contract methods failed:", fallbackErr);
            throw fallbackErr;
          }
        }
      }
    } catch (err) {
      console.error("Contract reset error:", err);
      
      // Manual local storage reset as fallback
      try {
        // Clear the vote for the current account
        localStorage.removeItem(`hasVoted_${account}`);
        localStorage.removeItem(`votedFor_${account}`);
        
        // Create a list of known accounts that have voted
        const localStorageKeys = Object.keys(localStorage);
        const votedKeys = localStorageKeys.filter(key => key.startsWith('hasVoted_'));
        
        // Clear votes for each account
        votedKeys.forEach(key => {
          const addr = key.replace('hasVoted_', '');
          localStorage.removeItem(`hasVoted_${addr}`);
          localStorage.removeItem(`votedFor_${addr}`);
        });
        
        return { 
          success: true, 
          isLocalOnly: true, 
          message: "Cleared local vote data (blockchain reset failed)" 
        };
      } catch (localErr) {
        console.error("Even local storage reset failed:", localErr);
        throw new Error("Failed to reset votes: " + (err.message || "Unknown error"));
      }
    }
  };

  // Diagnose contract connectivity - useful for troubleshooting
  const diagnoseContractConnectivity = async () => {
    try {
      if (!window.ethereum) return { connected: false, error: "No Ethereum provider detected" };
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      return {
        connected: true,
        chainId: network.chainId,
        name: network.name,
        provider: provider,
        getWindowEthereum: () => window.ethereum
      };
    } catch (err) {
      return { connected: false, error: err.message };
    }
  };

  // Get the winning proposal
  const getWinningProposal = async () => {
    try {
      const response = await fetch('https://lumos-mz9a.onrender.com/proposals/winner');
      if (!response.ok) {
        throw new Error(`Failed to fetch winner: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Error fetching winning proposal:", err);
      
      // Try a fallback
      try {
        if (proposals.length > 0) {
          // Find the proposal with the most votes
          const sorted = [...proposals].sort((a, b) => {
            const votesA = parseInt(a.voteCount || 0);
            const votesB = parseInt(b.voteCount || 0);
            return votesB - votesA;
          });
          
          return sorted[0];
        }
      } catch (fallbackErr) {
        console.error("Fallback also failed:", fallbackErr);
      }
      
      throw err;
    }
  };

  // Effect: fetch current phase on mount and when account changes
  useEffect(() => {
    if (isConnected) {
      fetchCurrentPhase();
    }
  }, [isConnected]);

  // Add the voting contract address to the context value
  const value = {
    account,
    isConnected,
    signer,
    provider,
    votingContractAddress,
    loading,
    error,
    isOwner,
    isAdmin,
    currentPhase,
    phaseLoading,
    phaseError,
    groqEvaluationProgress,
    groqEvaluationStatus,
    groqEvaluationMessage,
    proposals,
    connect,
    disconnect,
    setPhase,
    voteForProposal,
    hasVoted,
    getVotedProposal,
    clearVote,
    resetAllVotes,
    diagnoseContractConnectivity,
    getWinningProposal
  };

  return (
    <BlockchainContext.Provider value={value}>
      {children}
    </BlockchainContext.Provider>
  );
}
