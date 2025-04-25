/**
 * Utility for accessing environment variables
 */

// Contract addresses
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x012499D995eB88BeD9350dB5ec37EC5CCC975555";
export const VOTING_ADDRESS = import.meta.env.VITE_VOTING_ADDRESS || "0x5cE016f2731e1c6877542Ddef36c7285b6c64F19";

// API URL
export const API_URL = import.meta.env.VITE_API_URL || "https://lumos-mz9a.onrender.com";

/**
 * Get owner addresses from environment variables
 * @returns {string[]} Array of lowercase owner addresses
 */
export const getOwnerAddresses = () => {
  const ownerAddressesStr = import.meta.env.VITE_OWNER_ADDRESSES || "";
  const addresses = ownerAddressesStr
    .split(',')
    .map(addr => addr.trim().toLowerCase())
    .filter(addr => addr.length > 0);
  
  // Provide default for development if no addresses configured
  if (addresses.length === 0) {
    console.warn("No owner addresses configured. Using default for development.");
    addresses.push("0x3d179638Dd963beff0e69698F0a3E33f71f7bfE3");
  }
  
  return addresses;
};

/**
 * Get admin addresses from environment variables
 * @returns {string[]} Array of lowercase admin addresses
 */
export const getAdminAddresses = () => {
  // All owners are admins
  const ownerAddresses = getOwnerAddresses();
  
  // Additional admin addresses
  const adminAddressesStr = import.meta.env.VITE_ADMIN_ADDRESSES || "";
  const additionalAdmins = adminAddressesStr
    .split(',')
    .map(addr => addr.trim().toLowerCase())
    .filter(addr => addr.length > 0 && !ownerAddresses.includes(addr));
  
  return [...ownerAddresses, ...additionalAdmins];
};

/**
 * Check if an address is an owner
 * @param {string} address - Ethereum address to check
 * @returns {boolean} Whether the address is an owner
 */
export const isOwnerAddress = (address) => {
  if (!address) return false;
  return getOwnerAddresses().includes(address.toLowerCase());
};

/**
 * Check if an address is an admin
 * @param {string} address - Ethereum address to check
 * @returns {boolean} Whether the address is an admin
 */
export const isAdminAddress = (address) => {
  if (!address) return false;
  return getAdminAddresses().includes(address.toLowerCase());
};
