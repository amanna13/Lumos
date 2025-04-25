/**
 * Phase management utility completely independent of blockchain
 */

// All possible phases in the application
export const PHASES = {
  SUBMISSION: "Submission",
  GROQ_CHECK: "GroqCheck", 
  VOTING: "Voting",
  COMPLETED: "Completed"
};

// Default phase
const DEFAULT_PHASE = PHASES.SUBMISSION;

// Local storage key for current phase
const PHASE_STORAGE_KEY = 'lumos_current_phase';

/**
 * Get the current phase from local storage or default
 * @returns {string} The current phase
 */
export function getCurrentPhase() {
  if (typeof window === 'undefined') return DEFAULT_PHASE;
  
  try {
    const storedPhase = localStorage.getItem(PHASE_STORAGE_KEY);
    if (storedPhase && Object.values(PHASES).includes(storedPhase)) {
      return storedPhase;
    }
  } catch (error) {
    console.warn("Error reading phase from localStorage:", error);
  }
  
  // Default to submission if nothing valid is stored
  return DEFAULT_PHASE;
}

/**
 * Set the current phase, store in localStorage, and sync with server if needed
 * @param {string} phase - One of the PHASES values
 * @param {boolean} updateServer - Whether to notify the server (defaults to true)
 * @returns {Promise<boolean>} Success status
 */
export async function setCurrentPhase(phase, updateServer = true) {
  if (!Object.values(PHASES).includes(phase)) {
    console.error(`Invalid phase: ${phase}. Must be one of:`, Object.values(PHASES));
    return false;
  }
  
  try {
    // Store locally
    localStorage.setItem(PHASE_STORAGE_KEY, phase);
    
    // Record in phase history
    const historyKey = 'lumos_phase_history';
    try {
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      history.push({ phase, timestamp: new Date().toISOString() });
      // Keep only last 20 entries
      if (history.length > 20) history.splice(0, history.length - 20);
      localStorage.setItem(historyKey, JSON.stringify(history));
    } catch (e) {}
    
    // Update server (optional)
    if (updateServer) {
      try {
        const response = await fetch('https://lumos-mz9a.onrender.com/update-phase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase, timestamp: Date.now() })
        });
        
        if (!response.ok) {
          console.warn("Server phase update failed, but local update succeeded");
        }
      } catch (serverError) {
        console.warn("Server update failed:", serverError);
        // Don't fail the operation, since local storage succeeded
      }
    }
    
    return true;
  } catch (error) {
    console.error("Failed to set phase:", error);
    return false;
  }
}

/**
 * Get the phase history
 * @returns {Array} History of phase changes
 */
export function getPhaseHistory() {
  try {
    const history = localStorage.getItem('lumos_phase_history');
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.warn("Error reading phase history:", error);
    return [];
  }
}

/**
 * Advance to the next phase
 * @returns {Promise<string|null>} The new phase or null if failed
 */
export async function advanceToNextPhase() {
  const currentPhase = getCurrentPhase();
  let nextPhase = null;
  
  switch (currentPhase) {
    case PHASES.SUBMISSION:
      nextPhase = PHASES.GROQ_CHECK;
      break;
    case PHASES.GROQ_CHECK:
      nextPhase = PHASES.VOTING;
      break;
    case PHASES.VOTING:
      nextPhase = PHASES.COMPLETED;
      break;
    default:
      return null; // Already at the final phase
  }
  
  const success = await setCurrentPhase(nextPhase);
  return success ? nextPhase : null;
}

/**
 * Go back to the previous phase
 * @returns {Promise<string|null>} The new phase or null if failed
 */
export async function revertToPreviousPhase() {
  const currentPhase = getCurrentPhase();
  let prevPhase = null;
  
  switch (currentPhase) {
    case PHASES.COMPLETED:
      prevPhase = PHASES.VOTING;
      break;
    case PHASES.VOTING:
      prevPhase = PHASES.GROQ_CHECK;
      break;
    case PHASES.GROQ_CHECK:
      prevPhase = PHASES.SUBMISSION;
      break;
    default:
      return null; // Already at the first phase
  }
  
  const success = await setCurrentPhase(prevPhase);
  return success ? prevPhase : null;
}

/**
 * Verify that a phase change was successfully applied
 * @param {string} expectedPhase - The phase we expect to be set
 * @returns {Promise<boolean>} Whether the phase matches expectations
 */
export async function verifyPhaseChange(expectedPhase) {
  // Simple check against localStorage
  const currentPhase = getCurrentPhase();
  
  // Check if the phase matches (case-insensitive)
  const currentLower = currentPhase.toLowerCase();
  const expectedLower = expectedPhase.toLowerCase();
  
  // Allow "GroqCheck" and "Groq" to be treated as the same
  if (currentLower === expectedLower ||
      (currentLower === "groqcheck" && expectedLower === "groq") ||
      (currentLower === "groq" && expectedLower === "groqcheck")) {
    return true;
  }
  
  // Also check server phase if possible
  try {
    const response = await fetch('https://lumos-mz9a.onrender.com/current-phase', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const serverPhase = data.currentPhase?.toLowerCase() || '';
      
      if (serverPhase === expectedLower ||
          (serverPhase === "groqcheck" && expectedLower === "groq") ||
          (serverPhase === "groq" && expectedLower === "groqcheck")) {
        return true;
      }
    }
  } catch (error) {
    console.warn("Failed to verify phase with server:", error);
    // Fall back to client-side verification only
  }
  
  return false;
}

/**
 * Synchronize phase across all sources (localStorage, server, etc.)
 * This helps ensure consistent state across all components
 * @returns {Promise<string>} The synchronized phase
 */
export async function synchronizePhase() {
  const localPhase = getCurrentPhase();
  
  try {
    // Try to get the server phase
    const response = await fetch('https://lumos-mz9a.onrender.com/current-phase', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const serverPhase = data.currentPhase;
      
      // If server has a valid phase different from local, update local
      if (serverPhase && Object.values(PHASES).includes(serverPhase) && 
          serverPhase !== localPhase) {
        await setCurrentPhase(serverPhase, false); // Don't update server again
        return serverPhase;
      }
    }
  } catch (error) {
    console.warn("Failed to sync phase with server:", error);
  }
  
  return localPhase;
}
