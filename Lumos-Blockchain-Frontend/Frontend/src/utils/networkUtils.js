/**
 * Network utilities for handling connectivity and API requests
 */

/**
 * Make a fetch request with automatic error handling and timeouts
 * 
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>} The fetch response
 */
export const safeFetch = async (url, options = {}, timeout = 8000) => {
  // Add cache-busting parameter if not already present
  const urlWithTimestamp = url.includes('?') ? 
    `${url}&_=${Date.now()}` : 
    `${url}?_=${Date.now()}`;
  
  // Create an AbortController to handle timeouts
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(urlWithTimestamp, {
      ...options,
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        ...options.headers
      }
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.warn(`Request timed out for: ${url}`);
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    
    console.error(`Network error for: ${url}`, error);
    throw error;
  }
};

/**
 * Check if a direct connection to render.com is available
 * @returns {Promise<boolean>} True if connected
 */
export const checkRenderAPIConnectivity = async () => {
  try {
    const response = await fetch('https://lumos-mz9a.onrender.com/health', {
      method: 'HEAD',
      mode: 'cors',
      cache: 'no-store',
      timeout: 3000
    });
    return response.ok;
  } catch (error) {
    console.warn("Render API connectivity check failed:", error);
    return false;
  }
};

/**
 * Get the current phase from the direct Render API
 * @returns {Promise<string|null>} The current phase or null if failed
 */
export const getPhaseFromRenderAPI = async () => {
  try {
    const response = await fetch('https://lumos-mz9a.onrender.com/current-phase', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store'
      },
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    
    const data = await response.json();
    return data.currentPhase || null;
  } catch (error) {
    console.warn("Failed to get phase from Render API:", error);
    return null;
  }
};

/**
 * Update the current phase via the direct Render API
 * @param {string} phase - The phase to set
 * @returns {Promise<boolean>} Success status
 */
export const updatePhaseInRenderAPI = async (phase) => {
  try {
    const clientId = localStorage.getItem('lumos_client_id') || 
      `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const response = await fetch('https://lumos-mz9a.onrender.com/update-phase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        phase,
        clientId,
        timestamp: Date.now()
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error("Failed to update phase in Render API:", error);
    return false;
  }
};

/**
 * Monitor network status and execute callbacks on status change
 * @param {Function} onOnline - Callback when network comes online
 * @param {Function} onOffline - Callback when network goes offline
 * @returns {Function} Cleanup function
 */
export const monitorNetworkStatus = (onOnline, onOffline) => {
  const handleOnline = () => {
    console.log("Network: Back ONLINE");
    if (typeof onOnline === 'function') {
      onOnline();
    }
  };
  
  const handleOffline = () => {
    console.log("Network: OFFLINE");
    if (typeof onOffline === 'function') {
      onOffline();
    }
  };
  
  // Add event listeners
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
