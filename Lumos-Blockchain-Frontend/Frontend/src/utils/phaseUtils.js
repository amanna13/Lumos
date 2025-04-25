/**
 * Utility for safe phase validation and mapping operations
 */

// List of valid phases as simple strings
const VALID_PHASES = ["Submission", "GroqCheck", "Voting", "Completed"];

/**
 * Validates if a given phase value is valid
 * @param {string} phase - The phase to validate
 * @returns {boolean} Whether the phase is valid
 */
export function isValidPhase(phase) {
  if (!phase || typeof phase !== 'string') return false;
  
  // Normalize "Groq" to "GroqCheck" for validation
  const normalizedPhase = phase === "Groq" ? "GroqCheck" : phase;
  return VALID_PHASES.includes(normalizedPhase);
}

/**
 * Ensures a phase value is valid and normalized
 * @param {string} phase - The phase to normalize
 * @returns {string|null} Normalized phase value or null if invalid
 */
export function normalizePhase(phase) {
  if (!phase || typeof phase !== 'string') return null;
  
  // Handle case variations
  const mappedPhase = VALID_PHASES.find(
    validPhase => validPhase.toLowerCase() === phase.toLowerCase()
  );
  
  if (mappedPhase) return mappedPhase;
  
  // Special case: map "Groq" to "GroqCheck"
  if (phase.toLowerCase() === "groq") return "GroqCheck";
  
  return null;
}

/**
 * Get an array of valid phases with their display names
 * @returns {Array<{value: string, label: string}>} Phase options
 */
export function getPhaseOptions() {
  return [
    { value: "Submission", label: "Submission" },
    { value: "GroqCheck", label: "GroqCheck" },
    { value: "Voting", label: "Voting" },
    { value: "Completed", label: "Completed" }
  ];
}
