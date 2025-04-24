/**
 * Utilities for more reliable data fetching and connectivity detection
 */

/**
 * Checks if there's a working internet connection
 * @returns {boolean} True if there's an internet connection
 */
export const hasInternetConnection = () => {
  return navigator.onLine;
};

/**
 * Adds retry and timeout functionality to fetch requests
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retries (default: 3)
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise<Response>} The fetch response
 */
export const fetchWithRetry = async (url, options = {}, retries = 3, timeout = 5000) => {
  // Add a timestamp to avoid caching
  const urlWithTimestamp = url.includes('?') 
    ? `${url}&_=${Date.now()}` 
    : `${url}?_=${Date.now()}`;
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(urlWithTimestamp, {
      ...options,
      signal: controller.signal,
      cache: 'no-cache',
      headers: {
        ...options.headers,
        'Cache-Control': 'no-cache, no-store',
      }
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.warn(`Fetch timeout for ${url}`);
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    
    if (retries > 0) {
      console.log(`Retrying fetch for ${url}, ${retries} retries remaining...`);
      return fetchWithRetry(url, options, retries - 1, timeout);
    }
    
    throw error;
  }
};

/**
 * Checks if a specific endpoint is reachable
 * @param {string} url - The URL to check
 * @returns {Promise<boolean>} True if the endpoint is reachable
 */
export const isEndpointReachable = async (url) => {
  try {
    const response = await fetchWithRetry(url, {
      method: 'HEAD',
      timeout: 3000
    }, 1, 3000);
    
    return response.ok;
  } catch (error) {
    console.warn(`Endpoint ${url} is not reachable:`, error);
    return false;
  }
};

/**
 * Try multiple methods to fetch data from multiple endpoints
 * @param {Array<string>} endpoints - Array of endpoint URLs to try
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} The successful response data
 */
export const fetchFromMultipleEndpoints = async (endpoints, options = {}) => {
  let lastError = null;
  
  // Try each endpoint
  for (const endpoint of endpoints) {
    try {
      const response = await fetchWithRetry(endpoint, options);
      
      if (response.ok) {
        const data = await response.json();
        return { data, source: endpoint };
      }
    } catch (error) {
      console.warn(`Failed to fetch from ${endpoint}:`, error);
      lastError = error;
    }
  }
  
  throw lastError || new Error('Failed to fetch from all endpoints');
};

/**
 * Create a robust fetcher for critical application data
 * @param {Array<string>} endpoints - Array of endpoint URLs 
 * @param {Function} fallbackFn - Function to call for fallback data
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} The data
 */
export const robustFetch = async (endpoints, fallbackFn, options = {}) => {
  // First check internet connectivity
  if (!hasInternetConnection()) {
    console.warn('No internet connection, using fallback');
    return fallbackFn();
  }
  
  try {
    // Try to fetch from endpoints
    const { data } = await fetchFromMultipleEndpoints(endpoints, options);
    return data;
  } catch (error) {
    console.error('Failed to fetch from all endpoints:', error);
    // Use fallback if all fetches fail
    return fallbackFn();
  }
};

export default {
  hasInternetConnection,
  fetchWithRetry,
  isEndpointReachable,
  fetchFromMultipleEndpoints,
  robustFetch
};
