/**
 * Utility functions for managing local vote storage
 */

/**
 * Get all locally stored votes
 * @returns {Object} Map of proposalId to vote count
 */
export const getAllLocalVotes = () => {
  try {
    const votedProposals = JSON.parse(localStorage.getItem('localVotedProposals') || '[]');
    const voteMap = {};
    
    votedProposals.forEach(proposalId => {
      const count = localStorage.getItem(`localVoteCount_${proposalId}`) || "0";
      voteMap[proposalId] = count;
    });
    
    return voteMap;
  } catch (err) {
    console.error("Error retrieving local votes:", err);
    return {};
  }
};

/**
 * Store a vote in local storage
 * @param {string} proposalId - The ID of the proposal being voted for
 * @param {string} voterAddress - The address of the voter
 * @param {string} txHash - Optional transaction hash
 */
export const storeLocalVote = (proposalId, voterAddress, txHash = null) => {
  try {
    // Store vote count
    localStorage.setItem(`localVoteCount_${proposalId}`, "1");
    
    // Store timestamp
    localStorage.setItem(`localVoteTimestamp_${proposalId}`, Date.now().toString());
    
    // Store voter info
    localStorage.setItem(`hasVoted_${voterAddress}`, 'true');
    localStorage.setItem(`votedFor_${voterAddress}`, proposalId);
    
    // Store transaction hash if available
    if (txHash) {
      localStorage.setItem(`voteTransaction_${voterAddress}`, txHash);
    }
    
    // Update list of voted proposals
    const votedProposals = JSON.parse(localStorage.getItem('localVotedProposals') || '[]');
    if (!votedProposals.includes(proposalId)) {
      votedProposals.push(proposalId);
      localStorage.setItem('localVotedProposals', JSON.stringify(votedProposals));
    }
    
    return true;
  } catch (err) {
    console.error("Error storing local vote:", err);
    return false;
  }
};

/**
 * Clear all locally stored votes
 */
export const clearAllLocalVotes = () => {
  try {
    // Get all keys related to votes
    const votedProposals = JSON.parse(localStorage.getItem('localVotedProposals') || '[]');
    
    // Clear vote counts and timestamps
    votedProposals.forEach(proposalId => {
      localStorage.removeItem(`localVoteCount_${proposalId}`);
      localStorage.removeItem(`localVoteTimestamp_${proposalId}`);
      localStorage.removeItem(`localVoteStatus_${proposalId}`);
    });
    
    // Clear the voted proposals list
    localStorage.removeItem('localVotedProposals');
    
    // Clear voter info (would need all addresses, which we don't track)
    // This would need to be handled separately
    
    return true;
  } catch (err) {
    console.error("Error clearing local votes:", err);
    return false;
  }
};

/**
 * Update local vote status based on blockchain confirmation
 * @param {string} proposalId - The ID of the proposal
 * @param {string} status - The status to set ("confirmed", "failed", "pending")
 */
export const updateLocalVoteStatus = (proposalId, status) => {
  try {
    localStorage.setItem(`localVoteStatus_${proposalId}`, status);
    return true;
  } catch (err) {
    console.error("Error updating local vote status:", err);
    return false;
  }
};

export default {
  getAllLocalVotes,
  storeLocalVote,
  clearAllLocalVotes,
  updateLocalVoteStatus
};
