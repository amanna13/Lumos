/**
 * Utility for synchronizing application phase across multiple devices
 */

import { ethers } from 'ethers';
import GrantManagerV2ABI from '../contracts/GrantManagerV2.json';
import { normalizePhase } from './phaseUtils';

// Contract address - must match deployed GrantManagerV2
const GRANT_MANAGER_ADDRESS = "0x012499D995eB88BeD9350dB5ec37EC5CCC975555";

// How often to poll the server for phase updates (in milliseconds)
const SYNC_INTERVAL = 30000; // 30 seconds

let syncIntervalId = null;
let lastPhaseCheck = null;

/**
 * Initialize phase synchronization across devices
 * This needs to be called on app startup
 */
export function initializePhaseSynchronization() {
  // Set up event listeners for the current browser window/tab
  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('lumos_phase_changed', handlePhaseChangedEvent);
  window.addEventListener('online', checkPhaseOnNetworkChange);
  window.addEventListener('focus', checkPhaseOnFocus);
  
  // Set up periodic sync
  startPhaseSync();
  
  // Do an immediate check
  checkCurrentPhaseFromServer();
}

/**
 * Start periodic phase synchronization
 */
export function startPhaseSync() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
  }
  
  syncIntervalId = setInterval(checkCurrentPhaseFromServer, SYNC_INTERVAL);
  console.log("Phase synchronization started");
}

/**
 * Stop phase synchronization
 */
export function stopPhaseSync() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log("Phase synchronization stopped");
  }
}

/**
 * Check the current phase from the server
 */
export async function checkCurrentPhaseFromServer() {
  // Skip if offline
  if (!navigator.onLine) {
    console.log("Device is offline, skipping phase check");
    return null;
  }
  
  try {
    // Add cache-busting parameter
    const timestamp = Date.now();
    
    const response = await fetch(`https://lumos-mz9a.onrender.com/phase/current-phase?_=${timestamp}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store'
      }
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch current phase: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    lastPhaseCheck = new Date();
    
    if (data && data.currentPhase) {
      const serverPhase = data.currentPhase;
      console.log(`Server phase: ${serverPhase}`);
      
      // Check if we need to update local phase
      const localPhase = localStorage.getItem('lumos_current_phase');
      if (serverPhase !== localPhase) {
        console.log(`Phase mismatch - Server: ${serverPhase}, Local: ${localPhase}`);
        updateLocalPhase(serverPhase);
      }
      
      return serverPhase;
    }
    
    return null;
  } catch (error) {
    console.warn("Error checking phase from server:", error);
    return null;
  }
}

/**
 * Update the local phase storage and trigger events
 */
function updateLocalPhase(phase) {
  const normalizedPhase = normalizePhase(phase);
  if (!normalizedPhase) return false;
  
  try {
    const oldPhase = localStorage.getItem('lumos_current_phase');
    localStorage.setItem('lumos_current_phase', normalizedPhase);
    
    // Record the change in history
    const historyKey = 'lumos_phase_history';
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    history.push({ 
      phase: normalizedPhase, 
      timestamp: new Date().toISOString(),
      source: 'sync',
      previous: oldPhase 
    });
    
    // Keep only last 20 entries
    if (history.length > 20) history.splice(0, history.length - 20);
    localStorage.setItem(historyKey, JSON.stringify(history));
    
    // Broadcast event for components to update
    window.dispatchEvent(new CustomEvent('lumos_phase_changed', { 
      detail: { phase: normalizedPhase, source: 'sync' } 
    }));
    
    return true;
  } catch (error) {
    console.warn("Error updating local phase:", error);
    return false;
  }
}

/**
 * Handle storage changes (from other tabs in the same browser)
 */
function handleStorageChange(event) {
  if (event.key === 'lumos_current_phase' && event.newValue) {
    console.log(`Phase changed in another tab: ${event.newValue}`);
    // Refresh the page to ensure all components update properly
    window.location.reload();
  }
}

/**
 * Handle phase change events fired within the current tab
 */
function handlePhaseChangedEvent(event) {
  if (event.detail && event.detail.phase) {
    console.log(`Phase change event received: ${event.detail.phase}`);
    // This is just for logging, actual updates are handled by components
  }
}

/**
 * Check phase when network status changes (device comes online)
 */
function checkPhaseOnNetworkChange() {
  if (navigator.onLine) {
    console.log("Device came online, checking phase");
    checkCurrentPhaseFromServer();
  }
}

/**
 * Check phase when window gets focus (user returns to tab)
 */
function checkPhaseOnFocus() {
  console.log("Window focused, checking phase");
  checkCurrentPhaseFromServer();
}

/**
 * Detect if the contract is V2 (supports GroqCheck and setPhase)
 * @returns {Promise<boolean>}
 */
export async function isGrantManagerV2() {
  if (!window.ethereum) return false;
  const provider = new ethers.BrowserProvider(window.ethereum);
  try {
    const grantManagerV2 = new ethers.Contract(
      GRANT_MANAGER_ADDRESS,
      GrantManagerV2ABI.abi || GrantManagerV2ABI,
      provider
    );
    return typeof grantManagerV2.setPhase === 'function' && typeof grantManagerV2.getCurrentPhase === 'function';
  } catch {
    return false;
  }
}

/**
 * Fetches the current phase from the GrantManagerV2 contract
 * @returns {Promise<string>} The current phase string
 */
export async function fetchCurrentPhaseFromContract() {
  if (!window.ethereum) throw new Error('Wallet not available');
  const provider = new ethers.BrowserProvider(window.ethereum);
  const grantManagerV2 = new ethers.Contract(
    GRANT_MANAGER_ADDRESS,
    GrantManagerV2ABI.abi || GrantManagerV2ABI,
    provider
  );
  // Prefer getCurrentPhase, fallback to currentPhaseString
  if (typeof grantManagerV2.getCurrentPhase === 'function') {
    return await grantManagerV2.getCurrentPhase();
  }
  if (typeof grantManagerV2.currentPhaseString === 'function') {
    return await grantManagerV2.currentPhaseString();
  }
  throw new Error('No contract phase method available');
}

/**
 * Update the phase on the GrantManagerV2 contract
 * @param {string} phase - The new phase ("Submission", "GroqCheck", "Voting", "Completed")
 * @returns {Promise<void>}
 */
export async function updatePhaseOnContract(phase) {
  if (!window.ethereum) throw new Error('Wallet not available');
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // Always map "Groq" to "GroqCheck"
  let mappedPhase = phase === "Groq" ? "GroqCheck" : phase;

  const grantManagerV2 = new ethers.Contract(
    GRANT_MANAGER_ADDRESS,
    GrantManagerV2ABI.abi || GrantManagerV2ABI,
    signer
  );
  const phaseMapping = { Submission: 0, GroqCheck: 1, Voting: 2, Completed: 3 };
  if (!(mappedPhase in phaseMapping)) {
    throw new Error('Invalid phase name: ' + mappedPhase);
  }
  const tx = await grantManagerV2.setPhase(phaseMapping[mappedPhase]);
  await tx.wait();
  // Optionally trigger GroqCheck evaluation via API if needed
  if (mappedPhase === "GroqCheck") {
    try {
      await fetch('https://lumos-mz9a.onrender.com/evaluation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
      });
    } catch {}
  }
}
