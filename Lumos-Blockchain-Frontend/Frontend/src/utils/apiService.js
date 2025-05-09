/**
 * API Service for handling proposal data
 */

// Use dynamic base URLs based on the current environment
const PRIMARY_API_URL = process.env.NODE_ENV === 'production'
  ? window.location.origin
  : `${window.location.protocol}//${window.location.host}/api`;

const FALLBACK_API_URL = PRIMARY_API_URL;

/**
 * Helper function to make fetch requests with CORS settings
 */
const fetchWithCors = async (url, options = {}) => {
  // Fix any URL protocol issues
  if (url.startsWith('//')) {
    url = window.location.protocol + url;
  }

  const corsOptions = {
    ...options,
    mode: 'cors',
    credentials: 'same-origin',
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store',
    }
  };
  
  return fetch(url, corsOptions);
};

/**
 * Direct fetch without CORS for same-origin requests
 */
const directFetch = async (url, options = {}) => {
  const fetchOptions = {
    ...options,
    cache: 'no-cache',
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store',
    }
  };
  
  return fetch(url, fetchOptions);
};

/**
 * Fetch all proposals from the API with improved error handling and retry logic
 */
export const fetchAllProposals = async () => {
  try {
    const response = await fetch('https://lumos-mz9a.onrender.com/evaluation/rankings/top', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store'
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch rankings: ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid rankings data');
    }
    // Normalize proposals
    return data.map(p => ({
      ...p,
      id: p.id?.toString() ?? '',
      voteCount: p.voteCount || "0",
      title: p.title || `Proposal ${p.id}`,
      proposer: p.proposer || "Unknown",
      description: p.description || ""
    }));
  } catch (err) {
    console.error("Failed to fetch proposals from /evaluation/rankings/top:", err);
    // Optionally fallback to localStorage or mock data as before
    try {
      const localStorageData = localStorage.getItem('fallbackProposals');
      if (localStorageData) {
        const localProposals = JSON.parse(localStorageData);
        if (Array.isArray(localProposals) && localProposals.length > 0) {
          return localProposals.map(p => ({
            ...p,
            voteCount: p.voteCount || "0"
          }));
        }
      }
    } catch (localError) {
      console.error('Failed to load from localStorage:', localError);
    }
    // Last resort: mock data
    return [
      {
        id: "mock-1",
        title: "Mock Proposal (Data Fetch Failed)",
        description: "This is a mock proposal generated because API data couldn't be fetched. Please check your network connection.",
        proposer: "0x0000000000000000000000000000000000000000",
        voteCount: "0",
        isMock: true,
        timestamp: new Date().toISOString()
      }
    ];
  }
};

/**
 * Submit a new proposal
 */
export const submitProposal = async (proposalData) => {
  const endpoints = [
    `${FALLBACK_API_URL}/proposals/submit`,
    `${PRIMARY_API_URL}/proposals/submit`
  ];
  
  let error = null;
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying to submit proposal to: ${endpoint}`);
      const response = await fetchWithCors(endpoint, {
        method: 'POST',
        body: JSON.stringify(proposalData)
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Successfully submitted proposal to ${endpoint}`, data);
      return data;
    } catch (err) {
      console.warn(`Failed to submit to ${endpoint}:`, err);
      error = err;
    }
  }
  
  // Save to local storage as fallback
  try {
    const fallbackProposals = JSON.parse(localStorage.getItem('fallbackProposals') || '[]');
    const newProposal = {
      ...proposalData,
      id: `local-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'pending',
      voteCount: "0"
    };
    
    fallbackProposals.push(newProposal);
    localStorage.setItem('fallbackProposals', JSON.stringify(fallbackProposals));
    
    return {
      success: true,
      message: 'Saved locally due to API error',
      proposalId: newProposal.id,
      isLocalOnly: true,
      proposal: newProposal
    };
  } catch (localStorageError) {
    console.error('Failed to save to localStorage:', localStorageError);
    throw error || new Error('Failed to submit proposal through any available method');
  }
};

/**
 * Update vote count for a proposal
 */
export const updateVoteCount = async (voteData) => {
  const endpoints = [
    `${FALLBACK_API_URL}/proposals/updateVotes`,
    `${PRIMARY_API_URL}/proposals/updateVotes`
  ];
  
  let error = null;
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying to update vote at: ${endpoint}`);
      const response = await fetchWithCors(endpoint, {
        method: 'POST',
        body: JSON.stringify(voteData)
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Successfully updated vote at ${endpoint}`, data);
      return data;
    } catch (err) {
      console.warn(`Failed to update vote at ${endpoint}:`, err);
      error = err;
    }
  }
  
  // Update in localStorage as fallback
  try {
    const fallbackProposals = JSON.parse(localStorage.getItem('fallbackProposals') || '[]');
    const updatedProposals = fallbackProposals.map(p => {
      if (p.id === voteData.proposalId) {
        const currentVotes = parseInt(p.voteCount || 0);
        const increment = voteData.increment || 1;
        return {
          ...p,
          voteCount: (currentVotes + increment).toString()
        };
      }
      return p;
    });
    
    localStorage.setItem('fallbackProposals', JSON.stringify(updatedProposals));
    
    // Also record the vote
    localStorage.setItem(`hasVoted_${voteData.voter}`, 'true');
    localStorage.setItem(`votedFor_${voteData.voter}`, voteData.proposalId);
    
    return {
      success: true,
      message: 'Vote recorded locally due to API error',
      isLocalOnly: true
    };
  } catch (localStorageError) {
    console.error('Failed to update vote in localStorage:', localStorageError);
    throw error || new Error('Failed to update vote through any available method');
  }
};

export default {
  fetchAllProposals,
  submitProposal,
  updateVoteCount
};
