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
    if (!phase || !PHASES.includes(phase)) {
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

  const resetAllVotes = async () => {
    if (!isAdmin) {
      return { success: false, message: "Admin privileges required" };
    }

    try {
      const voteKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('hasVoted_') || key.startsWith('votedFor_'))) {
          voteKeys.push(key);
        }
      }

      voteKeys.forEach(key => localStorage.removeItem(key));

      try {
        const response = await fetch('https://lumos-mz9a.onrender.com/proposals/resetAllVotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            admin: account,
            timestamp: Date.now()
          })
        });

        if (!response.ok) {
          console.warn("Server reset all votes failed, but local storage cleared");
        }
      } catch (apiError) {
        console.warn("API reset all votes error:", apiError);
      }

      return { success: true };
    } catch (err) {
      console.error("Reset all votes error:", err);
      return { success: false, message: err.message || "Failed to reset all votes" };
    }
  };

  const fetchProposals = async () => {
    try {
      const response = await fetch('https://lumos-mz9a.onrender.com/proposals', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch proposals: ${response.status}`);
      }
      
      const data = await response.json();
      setProposals(data);
      return data;
    } catch (err) {
      console.error("Error fetching proposals:", err);
      return [];
    }
  };

  // Fetch the evaluations status if in GroqCheck phase
  const fetchGroqEvaluationStatus = async () => {
    if (currentPhase !== "GroqCheck") return;
    
    try {
      const response = await fetch('https://lumos-mz9a.onrender.com/evaluation/status');
      if (response.ok) {
        const data = await response.json();
        setGroqEvaluationProgress(data.progress || 0);
        setGroqEvaluationStatus(data.status || 'pending');
        setGroqEvaluationMessage(data.message || '');
      }
    } catch (error) {
      console.error("Error fetching Groq evaluation status:", error);
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
      fetchProposals();
    }
  }, [isConnected]);

  // Effect: check Groq evaluation status periodically if in that phase
  useEffect(() => {
    if (currentPhase === "GroqCheck") {
      fetchGroqEvaluationStatus();
      const interval = setInterval(fetchGroqEvaluationStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [currentPhase]);

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
    fetchProposals,
    diagnoseContractConnectivity,
    getWinningProposal
  };

  return (
    <BlockchainContext.Provider value={value}>
      {children}
    </BlockchainContext.Provider>
  );
}
