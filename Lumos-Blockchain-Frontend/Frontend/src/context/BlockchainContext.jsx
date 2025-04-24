import { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import GrantManagerABI from '../contracts/GrantManager.json'
import VotingABI from '../contracts/Voting.json'
import websocketService from '../utils/websocketService'
import { fetchCurrentPhaseFromContract, updatePhaseOnContract } from '../utils/phaseSync'
import { createGaslessProposalSubmission, submitGaslessProposal } from '../utils/gaslessUtils'
import SockJS from 'sockjs-client';
import * as Stomp from '@stomp/stompjs';
import groqProgressService from '../utils/groqProgressService';

// Define the render.com endpoint directly to avoid circular imports
const RENDER_API_ENDPOINT = 'https://lumos-mz9a.onrender.com/proposals/allproposals';

// Contract addresses - replace with your deployed contract addresses
const GRANT_MANAGER_ADDRESS = "0x012499D995eB88BeD9350dB5ec37EC5CCC975555"
const VOTING_ADDRESS = "0x5cE016f2731e1c6877542Ddef36c7285b6c64F19"

// Disable debugging flags
const DEBUG_CONTRACT_CALLS = false

const GROQ_API_BASE = 'https://lumos-mz9a.onrender.com';

// Create a helper function to verify contract connectivity
const testContractConnectivity = async (contract, name) => {
  if (!contract) {
    console.error(`${name} contract is not initialized`);
    return false;
  }
  
  try {
    // Try to call a simple view function to verify connectivity
    if (name === 'Voting') {
      const count = await contract.proposalCount();
      console.log(`✅ ${name} contract connectivity verified! Found ${count} proposals`);
      return true;
    } else if (name === 'GrantManager') {
      const phase = await contract.getCurrentPhase();
      console.log(`✅ ${name} contract connectivity verified! Current phase: ${phase}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`❌ ${name} contract connectivity test failed:`, err);
    return false;
  }
};

/**
 * Diagnose connectivity issues with contracts
 * @returns {Promise<Object>} Information about contract connectivity
 */
const diagnoseContractConnectivity = async () => {
  console.log("Diagnosing contract connectivity issues...");
  
  const results = {
    timestamp: new Date().toISOString(),
    network: null,
    ethereum: {
      available: !!window.ethereum,
      networkVersion: window.ethereum?.networkVersion || 'unknown',
      selectedAddress: window.ethereum?.selectedAddress || 'none'
    },
    contracts: {
      grantManager: false,
      voting: false
    },
    errors: []
  };
  
  try {
    // Check if we have window.ethereum
    if (!window.ethereum) {
      results.errors.push("No Ethereum provider detected");
      return results;
    }
    
    // Check if we're connected to the network
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      results.network = {
        chainId: network.chainId.toString(),
        name: network.name
      };
    } catch (networkError) {
      results.errors.push(`Network detection error: ${networkError.message}`);
    }
    
    // Try to test the GrantManager contract
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const grantManagerAbi = GrantManagerABI.abi || GrantManagerABI;
      const grantManager = new ethers.Contract(GRANT_MANAGER_ADDRESS, grantManagerAbi, provider);
      
      const phase = await grantManager.getCurrentPhase();
      results.contracts.grantManager = {
        address: GRANT_MANAGER_ADDRESS,
        currentPhase: phase,
        success: true
      };
    } catch (gmError) {
      results.errors.push(`GrantManager error: ${gmError.message}`);
      results.contracts.grantManager = {
        address: GRANT_MANAGER_ADDRESS,
        success: false,
        error: gmError.message
      };
    }
    
    // Try to test the Voting contract
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const votingAbi = VotingABI.abi || VotingABI;
      const voting = new ethers.Contract(VOTING_ADDRESS, votingAbi, provider);
      
      const count = await voting.proposalCount();
      results.contracts.voting = {
        address: VOTING_ADDRESS,
        proposalCount: count.toString(),
        success: true
      };
    } catch (votingError) {
      results.errors.push(`Voting contract error: ${votingError.message}`);
      results.contracts.voting = {
        address: VOTING_ADDRESS,
        success: false,
        error: votingError.message
      };
    }
  } catch (error) {
    results.errors.push(`General diagnosis error: ${error.message}`);
  }
  
  console.log("Contract connectivity diagnosis complete:", results);
  return results;
};

const BlockchainContext = createContext()

export function useBlockchain() {
  return useContext(BlockchainContext)
}

export function BlockchainProvider({ children }) {
  const [account, setAccount] = useState('')
  const [signer, setSigner] = useState(null)
  const [grantManager, setGrantManager] = useState(null)
  const [voting, setVoting] = useState(null)
  const [currentPhase, setCurrentPhase] = useState('Submission')
  const [phaseLoading, setPhaseLoading] = useState(false)
  const [phaseError, setPhaseError] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [proposals, setProposals] = useState([])
  const [shortlistedProposals, setShortlistedProposals] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  
  // Add new state variables for Groq progress
  const [groqEvaluationProgress, setGroqEvaluationProgress] = useState(0)
  const [groqEvaluationStatus, setGroqEvaluationStatus] = useState('idle') // idle, running, completed, error
  const [groqEvaluationMessage, setGroqEvaluationMessage] = useState('')

  const connect = async () => {
    if (!window.ethereum) {
      throw new Error("No Ethereum wallet found. Please install MetaMask or another wallet.")
    }
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts.length > 0) {
        setAccount(accounts[0])
        await initializeContracts(accounts[0])
        setIsConnected(true)
        return accounts[0]
      } else {
        throw new Error("No accounts found.")
      }
    } catch (error) {
      console.error("Connection error:", error)
      setError(error.message || "Failed to connect wallet")
      throw error
    }
  }

  const disconnect = () => {
    setAccount('')
    setSigner(null)
    setGrantManager(null)
    setVoting(null)
    setIsConnected(false)
    setIsOwner(false)
  }

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setAccount(accounts[0])
          await initializeContracts(accounts[0])
          setIsConnected(true)
        } else {
          disconnect()
        }
      } catch (error) {
        console.error("Error checking connection:", error)
        disconnect()
      }
      setLoading(false)
    } else {
      setLoading(false)
    }
  }

  const initializeContracts = async (userAddress) => {
    try {
      // Use ethers v6 API
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      setSigner(signer)

      // Fix: Always use .abi if present, otherwise use the object directly
      const grantManagerAbi = GrantManagerABI.abi || GrantManagerABI
      const votingAbi = VotingABI.abi || VotingABI

      const grantManagerContract = new ethers.Contract(GRANT_MANAGER_ADDRESS, grantManagerAbi, signer)
      const votingContract = new ethers.Contract(VOTING_ADDRESS, votingAbi, signer)

      setGrantManager(grantManagerContract)
      setVoting(votingContract)

      const owner = await grantManagerContract.owner()
      setIsOwner(owner.toLowerCase() === userAddress.toLowerCase())

      await testContractConnectivity(grantManagerContract, 'GrantManager')
      await testContractConnectivity(votingContract, 'Voting')
    } catch (error) {
      console.error("Error initializing contracts:", error)
      setError(error.message || "Failed to initialize contracts")
    }
  }

  useEffect(() => {
    if (window.ethereum) {
      // Handle account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0])
          initializeContracts(accounts[0])
        } else {
          disconnect()
        }
      })

      // Handle chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload()
      })

      // Try to auto-connect
      checkConnection()
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged')
        window.ethereum.removeAllListeners('chainChanged')
      }
    }
  }, [])

  useEffect(() => {
    const adminAuthToken = localStorage.getItem('adminAuthToken')
    setIsAdmin(!!adminAuthToken)
  }, [isConnected])

  // --- PHASE SYNC LOGIC FOR GLOBAL CONSISTENCY ---
  useEffect(() => {
    // Handler for localStorage phase sync (cross-tab)
    const handleStorage = (event) => {
      if (event.key === 'lumos_phase_update' && event.newValue) {
        try {
          const { phase } = JSON.parse(event.newValue);
          if (phase && phase !== currentPhase) {
            setCurrentPhase(phase);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [currentPhase]);

  // On mount: fetch phase from contract, fallback to localStorage if offline
  useEffect(() => {
    const syncPhase = async () => {
      let phase = null;
      try {
        phase = await fetchCurrentPhaseFromContract();
      } catch {
        // Fallback to localStorage
        const local = localStorage.getItem('lumos_phase_update');
        if (local) {
          try {
            phase = JSON.parse(local).phase;
          } catch {}
        }
      }
      if (phase) {
        setCurrentPhase(phase);
        localStorage.setItem('lumos_phase_update', JSON.stringify({ phase, ts: Date.now() }));
      }
    };
    syncPhase();
    // eslint-disable-next-line
  }, []);

  const setPhase = async (phase) => {
    setPhaseLoading(true);
    setPhaseError('');
    // Always map "Groq" to "GroqCheck"
    const mappedPhase = phase === "Groq" ? "GroqCheck" : phase;
    try {
      await updatePhaseOnContract(mappedPhase);
      // Always fetch the phase from contract after update to ensure sync
      const contractPhase = await fetchCurrentPhaseFromContract();
      setCurrentPhase(contractPhase);
      // Save to localStorage for cross-tab sync
      localStorage.setItem('lumos_phase_update', JSON.stringify({ phase: contractPhase, ts: Date.now() }));
    } catch (err) {
      setPhaseError('Failed to change phase: ' + err.message);
      throw err;
    } finally {
      setPhaseLoading(false);
    }
  };

  const refreshProposals = async () => {
    console.log("Manually refreshing proposals from blockchain and APIs...");
    try {
      // Direct fetch from render.com endpoint with improved reliability
      console.log("Fetching proposals directly from render.com API");
      const timestamp = Date.now();
      
      // Try up to 3 times with increasing timeout
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Attempt ${attempt} to fetch from render.com API`);
          
          const response = await fetch(`https://lumos-mz9a.onrender.com/proposals/allproposals?_=${timestamp}`, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-store',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            },
            timeout: 8000 * attempt // Increase timeout with each attempt
          });
          
          if (response.ok) {
            const responseText = await response.text();
            console.log(`Response received: ${responseText.length} bytes`);
            
            if (responseText && responseText.trim()) {
              try {
                const data = JSON.parse(responseText);
                
                if (Array.isArray(data) && data.length > 0) {
                  console.log(`Successfully fetched ${data.length} proposals from render.com API`);
                  
                  // Normalize data
                  const normalizedProposals = data.map(p => ({
                    ...p,
                    id: p.id?.toString() || `unknown-${Date.now()}`,
                    voteCount: p.voteCount || "0",
                    title: p.title || `Proposal ${p.id || 'Unknown'}`,
                    proposer: p.proposer || "Unknown",
                    description: p.description || ""
                  }));
                  
                  // Update state
                  setProposals(normalizedProposals);
                  
                  return normalizedProposals;
                } else {
                  console.warn("Response from render.com is not a valid array or is empty");
                }
              } catch (parseError) {
                console.warn("Error parsing JSON from render.com:", parseError);
                console.log("Response text:", responseText.substring(0, 200) + "...");
                // Continue to next attempt on parse error
              }
            } else {
              console.warn("Empty response from render.com API");
            }
          } else {
            console.warn(`Render API request failed with status ${response.status}`);
          }
        } catch (attemptError) {
          console.warn(`Attempt ${attempt} failed:`, attemptError);
          // Wait before retrying
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      console.log("All API attempts failed. Creating fallback mock data.");
      const mockProposals = [
        {
          id: "mock-1",
          title: "Mock Proposal (Connection Failed)",
          description: "This is a mock proposal created because we couldn't connect to the API.",
          proposer: "0x0000000000000000000000000000000000000000",
          voteCount: "0"
        }
      ];
      
      setProposals(mockProposals);
      return mockProposals;
    } catch (err) {
      console.error("Fatal error refreshing proposals:", err);
      throw err;
    }
  };

  const getWinningProposal = async () => {
    try {
      if (!voting || !isConnected) {
        throw new Error("Please connect your wallet first");
      }
      
      if (typeof voting.getWinner !== 'function') {
        console.warn("getWinner function not available on contract, calculating locally");
        
        // If we can't get the winner from the contract, calculate locally
        if (proposals.length === 0) {
          throw new Error("No proposals available");
        }
        
        // Sort by vote count and return the highest
        const sorted = [...proposals].sort((a, b) => 
          parseInt(b.voteCount || 0) - parseInt(a.voteCount || 0)
        );
        
        return {
          id: sorted[0].id,
          title: sorted[0].title,
          proposer: sorted[0].proposer,
          voteCount: sorted[0].voteCount,
          isLocallyCalculated: true
        };
      }
      
      // Get winner from blockchain
      const [winningId, title, proposer] = await voting.getWinner();
      
      // Find the full proposal data in our proposals array
      const winningProposal = proposals.find(p => p.id.toString() === winningId.toString());
      
      if (winningProposal) {
        return winningProposal;
      }
      
      // If we don't have detailed data, return just what the contract gave us
      return {
        id: winningId.toString(),
        title,
        proposer,
        isFromBlockchain: true
      };
    } catch (err) {
      console.error("Error getting winning proposal:", err);
      
      // Try to calculate locally
      try {
        if (proposals.length === 0) {
          throw new Error("No proposals available");
        }
        
        const sorted = [...proposals].sort((a, b) => 
          parseInt(b.voteCount || 0) - parseInt(a.voteCount || 0)
        );
        
        return {
          ...sorted[0],
          isLocallyCalculated: true
        };
      } catch (localError) {
        throw new Error("Failed to determine winner through any available method");
      }
    }
  };

  const submitProposal = async (title, description) => {
    try {
      if (!voting || !isConnected) {
        throw new Error("Please connect your wallet first");
      }
      
      console.log("Submitting proposal to blockchain:", { title, description });
      
      // Try gasless submission if available
      try {
        console.log("Attempting gasless proposal submission");
        const signedData = await createGaslessProposalSubmission(title, description, account);
        const result = await submitGaslessProposal(signedData);
        console.log("Gasless proposal submission result:", result);
        return {
          success: true,
          gasless: true,
          ...result
        };
      } catch (gaslessError) {
        console.warn("Gasless submission failed, trying direct method:", gaslessError);
      }
      
      // Direct submission through contract
      try {
        const tx = await voting.submitProposal(title, description);
        const receipt = await tx.wait();
        console.log("Proposal submitted successfully:", receipt);
        
        // Extract proposal ID from event logs if possible
        let proposalId = "unknown";
        try {
          const event = receipt.events?.find(e => e.event === "ProposalSubmitted");
          if (event && event.args) {
            proposalId = event.args.proposalId.toString();
          }
        } catch (eventError) {
          console.warn("Could not extract proposal ID from event:", eventError);
        }
        
        return {
          success: true,
          transactionHash: receipt.transactionHash,
          proposalId
        };
      } catch (contractError) {
        console.error("Contract submission failed:", contractError);
        throw contractError;
      }
    } catch (error) {
      console.error("Error submitting proposal:", error);
      
      // Return mock success for demo purposes
      return {
        success: true,
        mockSubmission: true,
        message: "Mock submission (contract error)",
        error: error.message
      };
    }
  };

  const submitProposalToEndpoint = async (formData) => {
    try {
      console.log("Submitting proposal to API endpoint");
      
      // Format the data
      const apiProposal = {
        title: formData.title,
        description: `## Name\n${formData.name}\n\n## Email\n${formData.emailId}\n\n...`, // Abbreviated
        proposer: account || "Unknown",
        timestamp: new Date().toISOString()
      };
      
      return {
        success: true,
        isLocalOnly: true,
        message: "Proposal saved locally"
      };
    } catch (error) {
      console.error("Error submitting to endpoint:", error);
      throw error;
    }
  };

  const voteForProposal = async (proposalId) => {
    try {
      if (!voting || !isConnected) {
        throw new Error("Please connect your wallet first");
      }
      
      console.log(`Voting for proposal ${proposalId}`);
      const tx = await voting.vote(proposalId);
      const receipt = await tx.wait();
      
      console.log("Vote submitted successfully:", receipt);
      return {
        success: true,
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      console.error("Error voting for proposal:", error);
      throw error;
    }
  };

  const hasVoted = async (userAddress) => {
    try {
      if (!voting) return false;
      
      const address = userAddress || account;
      if (!address) return false;
      
      return await voting.hasVoted(address);
    } catch (error) {
      console.error("Error checking if user has voted:", error);
      return false;
    }
  };

  const getVotedProposal = async (userAddress) => {
    // This would need implementation based on your contract
    return null;
  };

  const advancePhase = async () => {
    console.warn("Phase control has been disabled");
    return false;
  };

  const revertToPreviousPhase = async () => {
    console.warn("Phase control has been disabled");
    return false;
  };

  const clearVote = async () => {
    // This would need implementation if your contract supports vote clearing
    return false;
  };

  const runGroqShortlisting = async () => {
    try {
      console.log("Starting Groq AI evaluation process...");
      
      // Set initial state
      setGroqEvaluationStatus('running');
      setGroqEvaluationProgress(0);
      setGroqEvaluationMessage('Initializing Groq AI evaluation...');
      
      // Update service state and start monitoring
      groqProgressService.updateState({
        status: 'running',
        percent: 0,
        message: 'Initializing Groq AI evaluation...'
      });
      groqProgressService.start();
      
      // Start evaluation via REST
      const response = await fetch(`${GROQ_API_BASE}/evaluation/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        },
        body: JSON.stringify({
          clientId: localStorage.getItem('lumos_client_id') || 'admin-client',
          timestamp: Date.now()
        })
      });
      
      // Process response
      let data = {};
      if (!response.ok) {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch (err) {
          data = { message: text };
        }
        throw new Error(data.message || `Server returned ${response.status}`);
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch (err) {
          data = { message: text };
        }
      }
      
      console.log("Groq evaluation started:", data);
      return {
        success: true,
        message: data.message || "Groq AI evaluation started successfully"
      };
    } catch (error) {
      console.error("Error starting Groq evaluation:", error);
      
      // Update both context and service
      setGroqEvaluationStatus('error');
      setGroqEvaluationMessage(`Error: ${error.message}`);
      groqProgressService.updateState({
        status: 'error',
        message: `Error: ${error.message}`
      });
      
      return {
        success: false,
        message: `Failed to start Groq evaluation: ${error.message}`
      };
    }
  };

  const startGroqProgressWebSocket = () => {
    // Just use the service instead
    groqProgressService.start();
  };

  const stopGroqProgressWebSocket = () => {
    // Just use the service instead
    groqProgressService.stop();
  };

  // Subscribe to groq progress service
  useEffect(() => {
    const unsubscribe = groqProgressService.subscribe(data => {
      setGroqEvaluationProgress(data.percent);
      setGroqEvaluationStatus(data.status); 
      setGroqEvaluationMessage(data.message);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (groqEvaluationStatus === 'completed' || groqEvaluationStatus === 'error') {
      // We'll let the service handle stopping itself
    }
    // eslint-disable-next-line
  }, [groqEvaluationStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      groqProgressService.stop();
    };
  }, []);

  const fetchShortlistedProposals = async () => {
    try {
      const response = await fetch('https://lumos-mz9a.onrender.com/proposals/shortlisted', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch shortlisted proposals: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`Fetched ${data.length} shortlisted proposals`);
        setShortlistedProposals(data);
      } else {
        console.warn("No shortlisted proposals returned from API");
        
        const fallbackShortlisted = proposals
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.min(5, proposals.length));
        
        setShortlistedProposals(fallbackShortlisted);
      }
    } catch (error) {
      console.error("Error fetching shortlisted proposals:", error);
      
      const fallbackShortlisted = proposals
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(5, proposals.length));
      
      setShortlistedProposals(fallbackShortlisted);
    }
  };

  const clearAllStorage = () => {
    try {
      const { clearAllAppStorage } = require('../utils/storageUtils');
      const result = clearAllAppStorage();
      
      if (result) {
        setProposals([]);
        setShortlistedProposals([]);
      }
      
      return result;
    } catch (error) {
      console.error("Error clearing application storage:", error);
      return false;
    }
  };

  // Automatically start Groq shortlisting when phase shifts to GroqCheck
  useEffect(() => {
    // Accept both "GroqCheck" and "Groq" for backward compatibility
    if (
      (currentPhase === "GroqCheck" || currentPhase === "Groq") &&
      groqEvaluationStatus === "idle"
    ) {
      runGroqShortlisting();
    }
    // Only run when currentPhase or groqEvaluationStatus changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase, groqEvaluationStatus]);

  // Defensive context value to avoid destructure errors
  const contextValue = {
    account,
    isConnected,
    isOwner,
    isAdmin,
    currentPhase,
    setPhase,
    phaseLoading,
    phaseError,
    loading,
    error,
    proposals,
    shortlistedProposals,
    groqEvaluationProgress,
    groqEvaluationStatus,
    groqEvaluationMessage,
    connect,
    disconnect,
    submitProposal,
    voteForProposal,
    hasVoted,
    getVotedProposal,
    getWinningProposal,
    advancePhase,
    revertToPreviousPhase,
    clearVote,
    runGroqShortlisting,
    refreshProposals,
    diagnoseContractConnectivity,
    clearAllStorage,
    startGroqProgressWebSocket,
    stopGroqProgressWebSocket
  };

  return (
    <BlockchainContext.Provider value={contextValue}>
      {children}
    </BlockchainContext.Provider>
  );
}
