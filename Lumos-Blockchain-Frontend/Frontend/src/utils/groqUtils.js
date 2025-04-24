/**
 * Utility functions for interacting with Groq AI evaluation API
 */

// Use the direct render.com URL to avoid proxy issues
const GROQ_API_BASE = 'https://lumos-mz9a.onrender.com';

/**
 * Start the Groq evaluation process
 * @returns {Promise<Object>} Response from the API
 */
export const startGroqEvaluation = async () => {
  try {
    // Log the request to help with debugging
    console.log("Sending request to start Groq evaluation");
    
    const response = await fetch(`${GROQ_API_BASE}/evaluation/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify({
        clientId: localStorage.getItem('lumos_client_id') || 'admin-client',
        timestamp: Date.now()
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server returned ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error in startGroqEvaluation:", error);
    throw error;
  }
};

/**
 * Check the progress of the Groq evaluation
 * @returns {Promise<Object>} Progress data with percent, status, and message
 */
export const getGroqProgress = async () => {
  try {
    const timestamp = Date.now();
    const response = await fetch(`${GROQ_API_BASE}/ws-progress?_=${timestamp}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache'
      },
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn("Error checking Groq progress:", error);
    // Return a fallback response to prevent UI breakage
    return {
      percent: 0,
      status: 'error',
      message: error.message || 'Network error while checking progress'
    };
  }
};

/**
 * Get the shortlisted proposals after Groq evaluation
 * @returns {Promise<Array>} Shortlisted proposals
 */
export const getShortlistedProposals = async () => {
  try {
    const timestamp = Date.now();
    const response = await fetch(`${GROQ_API_BASE}/proposals/shortlisted?_=${timestamp}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache'
      },
      timeout: 8000
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching shortlisted proposals:", error);
    // Return empty array as fallback
    return [];
  }
};

/**
 * Check if we have network connectivity to the Groq server
 * @returns {Promise<boolean>} True if connected
 */
export const checkGroqServerConnectivity = async () => {
  try {
    const response = await fetch(`${GROQ_API_BASE}/health?_=${Date.now()}`, {
      method: 'HEAD',
      timeout: 3000,
      cache: 'no-store'
    });
    return response.ok;
  } catch (error) {
    console.warn("Groq server connectivity check failed:", error);
    return false;
  }
};

/**
 * Check if the current user has admin privileges
 * @returns {boolean} True if the user is an admin
 */
export const checkAdminStatus = () => {
  try {
    // Check for admin token in localStorage
    const adminToken = localStorage.getItem('adminAuthToken');
    
    // Log for debugging
    console.log("Admin token check:", { hasToken: !!adminToken, token: adminToken });
    
    // If there's a token, they're an admin
    return !!adminToken;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

/**
 * Force admin authentication by setting a valid token
 * Only use in development environments
 * @returns {boolean} True if successfully set admin token
 */
export const forceAdminAuthentication = () => {
  try {
    const token = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('adminAuthToken', token);
    console.log("Admin authentication forced with token:", token);
    return true;
  } catch (error) {
    console.error("Error forcing admin authentication:", error);
    return false;
  }
};
