/**
 * Utility functions for managing local storage
 */

/**
 * Clear specific items from local storage
 * @param {Array} itemKeys - Array of keys to clear from localStorage
 */
export const clearStorageItems = (itemKeys) => {
  try {
    itemKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    return true;
  } catch (error) {
    console.error("Error clearing storage items:", error);
    return false;
  }
};

/**
 * Clear proposals data from local storage
 * @returns {boolean} Success status
 */
export const clearProposalsStorage = () => {
  try {
    // Clear the main proposals storage
    localStorage.removeItem('fallbackProposals');
    
    // Also clear any vote-related items
    const keysToRemove = [];
    
    // Find all keys related to votes
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('hasVoted_') || key.startsWith('votedFor_')) {
        keysToRemove.push(key);
      }
    }
    
    // Remove the found keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log("Successfully cleared proposals data from local storage");
    return true;
  } catch (error) {
    console.error("Error clearing proposals storage:", error);
    return false;
  }
};

/**
 * Get all local storage keys and values
 * @returns {Object} Object containing all localStorage data
 */
export const getLocalStorageSnapshot = () => {
  try {
    const snapshot = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      try {
        // Try to parse as JSON
        snapshot[key] = JSON.parse(localStorage.getItem(key));
      } catch {
        // If not valid JSON, store as string
        snapshot[key] = localStorage.getItem(key);
      }
    }
    return snapshot;
  } catch (error) {
    console.error("Error creating localStorage snapshot:", error);
    return {};
  }
};

/**
 * Clear ALL application data from localStorage
 * This is a nuclear option that will completely reset the application state
 * @returns {boolean} Success status
 */
export const clearAllAppStorage = () => {
  try {
    console.log("Clearing all Lumos application data from localStorage...");
    
    // Get all keys in localStorage
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      allKeys.push(localStorage.key(i));
    }
    
    // Filter keys that belong to our application
    const appKeys = allKeys.filter(key => 
      key === 'proposals_api_cache' || 
      key === 'fallbackProposals' || 
      key === 'currentPhase' || 
      key === 'adminAuthToken' || 
      key === 'lumos_client_id' || 
      key === 'voteUpdate' || 
      key === 'gaslessProposalUpdate' ||
      key.startsWith('hasVoted_') || 
      key.startsWith('votedFor_') || 
      key.startsWith('lumos_') || 
      key.includes('proposal') ||
      key.includes('vote') ||
      key.includes('phase')
    );
    
    console.log(`Found ${appKeys.length} app-related items in localStorage`);
    
    // Remove all app-related keys
    appKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Removed: ${key}`);
    });
    
    console.log("Local storage cleared successfully!");
    return true;
  } catch (error) {
    console.error("Error clearing app storage:", error);
    return false;
  }
};
