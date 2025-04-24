import { ethers } from 'ethers';
import VotingABI from '../contracts/Voting.json';

// Contract addresses - ensure they match those in BlockchainContext
const VOTING_ADDRESS = "0x5cE016f2731e1c6877542Ddef36c7285b6c64F19";

/**
 * Create a signed message for gasless proposal submission
 * This allows users to create a proposal without paying gas fees
 * The message is signed by the user and then sent to the server
 * The server (admin) will submit the transaction on behalf of the user
 * 
 * @param {string} title - Proposal title
 * @param {string} description - Proposal description
 * @param {string} userAddress - User's Ethereum address
 * @returns {Promise<Object>} Signed data that server can use to submit
 */
export const createGaslessProposalSubmission = async (title, description, userAddress) => {
  try {
    // Check if metamask is available
    if (!window.ethereum) {
      throw new Error("MetaMask is not available");
    }
    
    // Create a signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // Check that the connected account matches the expected address
    const connectedAddress = await signer.getAddress();
    if (connectedAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error("Connected wallet doesn't match expected address");
    }
    
    // Create the message to sign
    // Format: proposalData = keccak256(abi.encodePacked(userAddress, title, description))
    const messageHash = ethers.keccak256(
      ethers.solidityPacked(
        ['address', 'string', 'string'], 
        [userAddress, title, description]
      )
    );
    
    // Sign the message
    console.log("Requesting signature from user for gasless submission...");
    const signature = await signer.signMessage(ethers.getBytes(messageHash));
    
    // Return the data needed for the server to submit the transaction
    return {
      userAddress,
      title,
      description,
      messageHash,
      signature,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error("Error creating gasless proposal submission:", error);
    throw error;
  }
};

/**
 * Submit a proposal to the server API for gasless processing
 * The server will use the admin wallet to submit the transaction to the blockchain
 * 
 * @param {Object} signedProposalData - The signed proposal data
 * @returns {Promise<Object>} Result of the submission
 */
export const submitGaslessProposal = async (signedProposalData) => {
  try {
    // Get client ID from localStorage or create a new one if it doesn't exist
    let clientId = localStorage.getItem('lumos_client_id');
    if (!clientId) {
      clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('lumos_client_id', clientId);
    }
    
    // Send the signed data to the server API
    const response = await fetch(`${window.location.origin}/api/gasless-submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store'
      },
      body: JSON.stringify({
        ...signedProposalData,
        clientId
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server returned ${response.status}`);
    }
    
    const result = await response.json();
    return {
      success: true,
      transactionHash: result.transactionHash,
      proposalId: result.proposalId,
      message: "Successfully submitted proposal without gas fees"
    };
  } catch (error) {
    console.error("Error submitting gasless proposal:", error);
    
    // Save to localStorage as fallback
    try {
      const fallbackProposals = JSON.parse(localStorage.getItem('fallbackProposals') || '[]');
      const newProposal = {
        title: signedProposalData.title,
        description: signedProposalData.description,
        proposer: signedProposalData.userAddress,
        id: `local-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'pending-gasless',
        voteCount: "0"
      };
      
      fallbackProposals.push(newProposal);
      localStorage.setItem('fallbackProposals', JSON.stringify(fallbackProposals));
      
      return {
        success: true,
        isLocalOnly: true,
        proposalId: newProposal.id,
        message: "Saved locally due to server error. The admin will submit it later."
      };
    } catch (localError) {
      throw new Error(`Failed to submit proposal: ${error.message}`);
    }
  }
};

/**
 * Check if the user is eligible for gasless submissions
 * 
 * @param {string} userAddress - The user's Ethereum address
 * @returns {Promise<boolean>} Whether the user is eligible
 */
export const isEligibleForGasless = async (userAddress) => {
  // For simplicity, we'll allow all users to use gasless submissions
  if (!userAddress || !ethers.isAddress(userAddress)) {
    return false;
  }
  return true;
};
