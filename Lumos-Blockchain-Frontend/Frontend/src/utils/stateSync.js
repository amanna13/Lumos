/**
 * Utility for synchronizing application state across multiple devices
 */

import { fetchCurrentPhaseFromContract } from './phaseSync';

// Sync interval in milliseconds (how often to check for updates)
const SYNC_INTERVAL = 15000; // 15 seconds

// Use dynamic base URLs based on the current environment
const API_BASE_URL = typeof window !== 'undefined' && process.env.NODE_ENV === 'production'
  ? window.location.origin
  : typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.hostname}:5173`
    : 'http://localhost:5173';

// Add retries for network failures
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds
const NETWORK_TIMEOUT = 5000; // 5 seconds timeout for network requests

let syncIntervalId = null;
let consecutiveFailures = 0;
let isOffline = false;

// Set up network status monitoring (only in browser environment)
if (typeof window !== 'undefined') {
  window.addEventListener('online', handleNetworkStatusChange);
  window.addEventListener('offline', handleNetworkStatusChange);
  
  // Initialize offline status
  isOffline = !navigator.onLine;
  console.log(`Initial network status: ${isOffline ? 'OFFLINE' : 'ONLINE'}`);
}

/**
 * Handle changes in network connectivity
 */
function handleNetworkStatusChange() {
  isOffline = !navigator.onLine;
  console.log(`Network status changed: ${isOffline ? 'OFFLINE' : 'ONLINE'}`);
  
  if (!isOffline) {
    // When we come back online, immediately try to sync
    consecutiveFailures = 0;
    checkCurrentPhase();
  }
}

/**
 * Start periodic sync with server for current phase
 */
export const startStateSync = () => {
  if (syncIntervalId) return; // Already running
  
  // Immediately check for current phase
  checkCurrentPhase();
  
  // Then set up periodic checking
  syncIntervalId = setInterval(checkCurrentPhase, SYNC_INTERVAL);
  console.log("State synchronization started");
  
  // Add event listener for visibility changes to refresh when tab becomes visible
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => stopStateSync();
};

/**
 * Stop periodic sync
 */
export const stopStateSync = () => {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    console.log("State synchronization stopped");
  }
};

/**
 * Handle visibility changes (refresh when tab becomes visible)
 */
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    checkCurrentPhase();
  }
};

/**
 * Check for current phase from contract
 */
const checkCurrentPhase = async () => {
  // If we're offline, don't attempt network requests
  if (isOffline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    console.log("Device is offline, cannot check current phase");
    return;
  }
  try {
    console.log("Checking current phase from contract...");
    const phase = await fetchCurrentPhaseFromContract();
    // ...use phase as needed...
    consecutiveFailures = 0;
    return phase;
  } catch (error) {
    console.warn("Failed to check current phase from contract:", error);
    handleRequestFailure();
  }
};

/**
 * Handle request failures by incrementing the failure counter
 */
const handleRequestFailure = () => {
  // Increment failure counter
  consecutiveFailures++;
  
  // Log diagnostic info
  console.warn(`Network request failed (${consecutiveFailures}/${MAX_RETRY_ATTEMPTS})`);
  
  // Check if we might be offline
  if (!navigator.onLine && !isOffline) {
    isOffline = true;
    console.log("Device appears to be offline");
  }
  
  // If we've had too many consecutive failures, log a more detailed error
  if (consecutiveFailures >= MAX_RETRY_ATTEMPTS) {
    console.error(`Multiple connection failures detected. API endpoint may be down or unreachable.`);
    
    // Attempt to diagnose the network issue
    diagnoseProblem();
    
    // Reset counter to avoid spamming the console
    consecutiveFailures = 0;
  }
};

/**
 * Try to diagnose connection problems
 */
const diagnoseProblem = async () => {
  console.log("Diagnosing connection problems...");
  console.log(`Online status: ${navigator.onLine ? 'ONLINE' : 'OFFLINE'}`);
  
  // Try a simple fetch to the root to see if server is reachable at all
  try {
    const response = await fetch(`${window.location.origin}?_=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
      timeout: 3000
    });
    console.log(`Server root reachability: ${response.ok ? 'OK' : 'Failed'} (${response.status})`);
  } catch (error) {
    console.log(`Cannot reach server root: ${error.message}`);
  }
  
  // Try a DNS lookup to check Internet connectivity (using favicon as a test)
  try {
    const testImage = new Image();
    testImage.onload = () => console.log("DNS test: Success");
    testImage.onerror = () => console.log("DNS test: Failed");
    testImage.src = `https://www.google.com/favicon.ico?_=${Date.now()}`;
  } catch (error) {
    console.log(`DNS test error: ${error.message}`);
  }
};

/**
 * Fetch with retry logic for network failures
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
const fetchWithRetry = async (url, options = {}, retries = MAX_RETRY_ATTEMPTS) => {
  try {
    // Add cache-busting parameter
    const urlWithTimestamp = url.includes('?') 
      ? `${url}&_=${Date.now()}` 
      : `${url}?_=${Date.now()}`;
    
    // Create a timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || NETWORK_TIMEOUT);
    
    // Attempt the fetch with timeout
    const response = await fetch(urlWithTimestamp, {
      ...options,
      signal: controller.signal,
      cache: 'no-cache',
      headers: {
        ...options.headers,
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    // Check if it was a timeout
    if (error.name === 'AbortError') {
      console.warn(`Request timed out for ${url}`);
      error.message = `Request timed out after ${options.timeout || NETWORK_TIMEOUT}ms`;
    }
    
    // If we have retries remaining and it's a network error, retry after delay
    if (retries > 0 && (
      error.name === 'AbortError' || 
      error.message.includes('NetworkError') || 
      error.message.includes('Failed to fetch') ||
      error.message.includes('Network request failed')
    )) {
      console.log(`Network error, retrying... (${MAX_RETRY_ATTEMPTS - retries + 1}/${MAX_RETRY_ATTEMPTS})`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      // Retry the request
      return fetchWithRetry(url, options, retries - 1);
    }
    
    // If we're out of retries or it's not a network error, throw
    throw error;
  }
};
