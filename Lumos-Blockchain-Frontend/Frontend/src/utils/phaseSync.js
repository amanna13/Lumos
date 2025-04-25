/**
 * Utility for synchronizing application phase across multiple devices
 */

import { ethers } from 'ethers';
import GrantManagerV2ABI from '../contracts/GrantManagerV2.json';

// Contract address - must match deployed GrantManagerV2
const GRANT_MANAGER_ADDRESS = "0x012499D995eB88BeD9350dB5ec37EC5CCC975555";

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
