/**
 * Helper utilities for interacting with voting functionality
 */

/**
 * Cast a vote on the blockchain with proper error handling and verification
 * @param {Contract} contract - The ethers.js contract instance
 * @param {string} proposalId - The ID of the proposal to vote for
 * @param {string} voterAddress - The address of the voter
 * @returns {Promise<{success: boolean, txHash: string, error: string|null}>}
 */
export const castVoteOnChain = async (contract, proposalId, voterAddress) => {
  if (!contract || !proposalId) {
    return { 
      success: false, 
      txHash: null, 
      error: "Missing contract or proposal ID" 
    };
  }

  try {
    const numericId = parseInt(proposalId, 10);
    if (isNaN(numericId)) {
      return { 
        success: false, 
        txHash: null, 
        error: "Invalid proposal ID format" 
      };
    }

    // Check if user has already voted before sending transaction
    const hasVoted = await contract.hasVoted(voterAddress);
    if (hasVoted) {
      return { 
        success: false, 
        txHash: null, 
        error: "You have already voted" 
      };
    }

    // Log contract address for debugging
    const contractAddress = await contract.getAddress();
    console.log(`Voting on contract at ${contractAddress} for proposal ${numericId}`);

    // Send the vote transaction with appropriate gas settings
    const tx = await contract.vote(numericId, {
      gasLimit: 250000, // Increased gas limit to ensure transaction completes
    });

    console.log(`Vote transaction sent: ${tx.hash}`);

    // Wait for 2 confirmations
    const receipt = await tx.wait(2);
    
    if (receipt.status !== 1) {
      return { 
        success: false, 
        txHash: tx.hash, 
        error: "Transaction failed on-chain" 
      };
    }

    // Verify the vote was recorded
    const hasVotedAfter = await contract.hasVoted(voterAddress);
    if (!hasVotedAfter) {
      console.warn("Vote transaction confirmed but hasVoted still returns false");
    }

    // Verify the vote count increased if possible
    try {
      const proposal = await contract.proposals(numericId);
      console.log(`New vote count for proposal ${numericId}: ${proposal.voteCount.toString()}`);
    } catch (err) {
      console.warn("Could not verify vote count:", err);
    }

    return { 
      success: true, 
      txHash: tx.hash, 
      error: null 
    };
  } catch (error) {
    // Check for specific error conditions
    const errorMessage = error.message || "Unknown error during voting";
    
    if (errorMessage.includes("already voted")) {
      return { 
        success: false, 
        txHash: null, 
        error: "You have already voted for a proposal" 
      };
    }
    
    if (errorMessage.includes("gas") || errorMessage.includes("fee")) {
      return { 
        success: false, 
        txHash: null, 
        error: "Not enough gas to complete transaction. Please ensure you have enough funds." 
      };
    }
    
    return { 
      success: false, 
      txHash: null, 
      error: errorMessage 
    };
  }
};

/**
 * Fetch proposal vote count from blockchain
 * @param {Contract} contract - The ethers.js contract instance
 * @param {string} proposalId - The ID of the proposal
 * @returns {Promise<{count: string, success: boolean, error: string|null}>}
 */
export const fetchVoteCount = async (contract, proposalId) => {
  if (!contract || !proposalId) {
    return { count: "0", success: false, error: "Missing contract or proposal ID" };
  }

  try {
    const numericId = parseInt(proposalId, 10);
    if (isNaN(numericId)) {
      return { count: "0", success: false, error: "Invalid proposal ID format" };
    }

    // Try to get vote count using proposals mapping
    const proposal = await contract.proposals(numericId);
    if (proposal && typeof proposal === 'object' && proposal.voteCount) {
      return { 
        count: proposal.voteCount.toString(), 
        success: true, 
        error: null 
      };
    }
    
    return { count: "0", success: false, error: "Could not retrieve vote count" };
  } catch (error) {
    return { 
      count: "0", 
      success: false, 
      error: error.message || "Error fetching vote count" 
    };
  }
};
