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
    // Use image ping technique which is more reliable for CORS situations
    return new Promise((resolve) => {
      // Set a timeout to handle cases where the image load/error events might not fire
      const timeoutId = setTimeout(() => {
        console.log('API connectivity test timed out');
        setOfflineMode(true);
        resolve(false);
      }, 5000);

      // Create a test image pointing to the health endpoint
      const img = new Image();
      
      // On successful load - API is reachable
      img.onload = () => {
        clearTimeout(timeoutId);
        setOfflineMode(false);
        resolve(true);
      };
      
      // On error - API is not reachable
      img.onerror = () => {
        clearTimeout(timeoutId);
        console.log('API connectivity test failed - image could not load');
        setOfflineMode(true);
        resolve(false);
      };
      
      // Add timestamp to prevent caching
      img.src = `https://lumos-mz9a.onrender.com/health-check?_=${Date.now()}`;
    });
  } catch (error) {
    console.warn('API connectivity test failed:', error);
    setOfflineMode(true);
    return false;
  }
};

// Initialize on module load
initOfflineMode();
