/**
 * Dedicated API utility functions for the Lumos application
 */

// Base endpoint URL
const API_BASE_URL = 'https://lumos-mz9a.onrender.com';

/**
 * Fetch data directly from the render.com API with retries
 * 
 * @param {string} endpoint - The API endpoint path (without base URL)
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retries (default: 3)
 * @returns {Promise<Object>} The parsed JSON response
 */
export const fetchFromRenderAPI = async (endpoint, options = {}, retries = 3) => {
  const fullUrl = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  console.log(`Fetching from render.com API: ${fullUrl}`);
  
  let lastError = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Add cache-busting parameter
      const urlWithTimestamp = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}_=${Date.now()}`;
      console.log(`Attempt ${attempt}/${retries}`);
      
      const fetchOptions = {
        method: options.method || 'GET',
        mode: 'cors',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          ...(options.headers || {})
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {})
      };
      
      const response = await fetch(urlWithTimestamp, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`API returned status: ${response.status}`);
      }
      
      const text = await response.text();
      
      if (!text || !text.trim()) {
        throw new Error('Empty response received');
      }
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }
    } catch (error) {
      console.warn(`API request attempt ${attempt} failed:`, error);
      lastError = error;
      
      if (attempt < retries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }
  
  throw lastError || new Error('All API request attempts failed');
};

/**
 * Get all proposals from the render.com API
 * 
 * @returns {Promise<Array>} Array of proposals
 */
export const fetchAllProposals = async () => {
  return fetchFromRenderAPI('/proposals/allproposals');
};

/**
 * Get the winning proposal from the render.com API
 * 
 * @returns {Promise<Object>} The winning proposal
 */
export const fetchWinner = async () => {
  return fetchFromRenderAPI('/proposals/winner');
};

/**
 * Submit a new proposal to the render.com API
 * 
 * @param {Object} proposalData - The proposal data to submit
 * @returns {Promise<Object>} The submission result
 */
export const submitProposal = async (proposalData) => {
  return fetchFromRenderAPI('/proposals/submit', {
    method: 'POST',
    body: proposalData
  });
};
