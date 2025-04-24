/**
 * Utility for synchronizing application phase across multiple devices
 */

import { ethers } from 'ethers';
import GrantManagerABI from '../contracts/GrantManager.json';
import GrantManagerV2ABI from '../contracts/GrantManagerV2.json';

// Contract addresses - ensure they match those in BlockchainContext
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
    // V2 has setPhase and GroqCheck phase
    return typeof grantManagerV2.setPhase === 'function' && typeof grantManagerV2.getCurrentPhase === 'function';
  } catch {
    return false;
  }
}

/**
 * Fetches the current phase from the smart contract (V2 preferred)
 * @returns {Promise<string>} The current phase
 */
export async function fetchCurrentPhaseFromContract() {
  if (!window.ethereum) throw new Error('Wallet not available');
  const provider = new ethers.BrowserProvider(window.ethereum);

  // Try V2 contract
  try {
    const grantManagerV2 = new ethers.Contract(
      GRANT_MANAGER_ADDRESS,
      GrantManagerV2ABI.abi || GrantManagerV2ABI,
      provider
    );
    if (typeof grantManagerV2.getCurrentPhase === 'function') {
      return await grantManagerV2.getCurrentPhase();
    }
    if (typeof grantManagerV2.currentPhaseString === 'function') {
      return await grantManagerV2.currentPhaseString();
    }
  } catch (e) {
    // fallback to V1
  }

  // Try V1 contract
  const grantManager = new ethers.Contract(
    GRANT_MANAGER_ADDRESS,
    GrantManagerABI.abi || GrantManagerABI,
    provider
  );
  if (typeof grantManager.getCurrentPhase === 'function') {
    return await grantManager.getCurrentPhase();
  }
  throw new Error('No contract phase method available');
}

/**
 * Update the phase on the contract (V2: setPhase, V1: advancePhase)
 * @param {string} phase - The new phase
 * @returns {Promise<void>}
 */
export async function updatePhaseOnContract(phase) {
  if (!window.ethereum) throw new Error('Wallet not available');
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // Always map "Groq" to "GroqCheck"
  let mappedPhase = phase === "Groq" ? "GroqCheck" : phase;

  // Detect contract version
  let isV2 = false;
  try {
    const grantManagerV2 = new ethers.Contract(
      GRANT_MANAGER_ADDRESS,
      GrantManagerV2ABI.abi || GrantManagerV2ABI,
      provider
    );
    isV2 = typeof grantManagerV2.setPhase === 'function';
  } catch {}

  if (isV2) {
    // --- V2: setPhase supports all phases ---
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
    // If GroqCheck, trigger evaluation/start endpoint
    if (mappedPhase === "GroqCheck") {
      // Optionally trigger GroqCheck evaluation via API if needed
      try {
        await fetch('https://lumos-mz9a.onrender.com/evaluation/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        });
      } catch {}
    }
    return;
  }

  // --- V1: Only supports Submission -> Voting -> Completed ---
  if (mappedPhase === "GroqCheck") {
    throw new Error('GroqCheck phase is not supported on this contract');
  }
  const grantManager = new ethers.Contract(
    GRANT_MANAGER_ADDRESS,
    GrantManagerABI.abi || GrantManagerABI,
    signer
  );
  const currentPhase = await grantManager.getCurrentPhase();
  if (currentPhase === mappedPhase) {
    return;
  } else if (currentPhase === "Submission" && mappedPhase === "Voting") {
    const tx = await grantManager.advancePhase();
    await tx.wait();
    return;
  } else if (currentPhase === "Voting" && mappedPhase === "Completed") {
    const tx = await grantManager.advancePhase();
    await tx.wait();
    return;
  } else {
    throw new Error('Unsupported phase transition on contract');
  }
}
