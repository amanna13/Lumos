/**
 * Utilities for handling offline mode and API connectivity issues
 */

// Track current connectivity status
let isOfflineMode = false;

/**
 * Check if we're currently in offline mode
 * @returns {boolean} True if in offline mode
 */
export const checkOfflineMode = () => {
  return isOfflineMode || (typeof navigator !== 'undefined' && !navigator.onLine);
};

/**
 * Set offline mode status
 * @param {boolean} status - Whether app should operate in offline mode
 */
export const setOfflineMode = (status) => {
  const previousStatus = isOfflineMode;
  isOfflineMode = !!status;
  
  // Log changes for debugging
  if (previousStatus !== isOfflineMode) {
    console.log(`Offline mode ${isOfflineMode ? 'enabled' : 'disabled'}`);
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem('offlineMode', isOfflineMode ? 'true' : 'false');
    } catch (e) {
      console.warn('Could not save offline mode status to localStorage');
    }
  }
  
  return isOfflineMode;
};

/**
 * Initialize offline mode based on network status
 */
export const initOfflineMode = () => {
  // First check localStorage for saved preference
  try {
    const savedStatus = localStorage.getItem('offlineMode');
    if (savedStatus === 'true') {
      isOfflineMode = true;
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  
  // Then check actual network status
  if (typeof navigator !== 'undefined') {
    if (!navigator.onLine) {
      isOfflineMode = true;
    }
    
    // Set up listeners for network status changes
    window.addEventListener('online', () => {
      console.log('Network connection established');
      // Don't automatically disable offline mode - let the user decide
    });
    
    window.addEventListener('offline', () => {
      console.log('Network connection lost');
      setOfflineMode(true);
    });
  }
  
  return isOfflineMode;
};

/**
 * Test API connectivity to determine if offline mode is needed
 * @returns {Promise<boolean>} True if API is reachable
 */
export const testApiConnectivity = async () => {
  try {
    // Try local health endpoint first (always works)
    const localResponse = await fetch('/local-health', {
      method: 'GET',
      headers: {'Accept': 'application/json'},
      cache: 'no-store'
    });
    
    if (!localResponse.ok) {
      return false;
    }
    
    // Then try the actual render.com endpoint
    const response = await fetch('/health', {
      method: 'HEAD',
      cache: 'no-store',
      timeout: 3000
    });
    
    const isConnected = response.ok;
    setOfflineMode(!isConnected);
    return isConnected;
  } catch (error) {
    console.warn('API connectivity test failed:', error);
    setOfflineMode(true);
    return false;
  }
};

// Initialize on module load
initOfflineMode();
