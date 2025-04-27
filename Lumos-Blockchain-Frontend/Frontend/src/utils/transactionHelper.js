import { ethers } from 'ethers';

/**
 * Helper functions for managing transactions on Base Sepolia
 */

// Default high gas settings for Base Sepolia
export const HIGH_GAS_PRICE = ethers.parseUnits("50", "gwei");
export const ULTRA_HIGH_GAS_PRICE = ethers.parseUnits("100", "gwei");
export const DEFAULT_GAS_LIMIT = 250000;

/**
 * Creates transaction overrides with high gas price for Base Sepolia
 * 
 * @param {Object} provider - ethers provider to get network info 
 * @returns {Promise<Object>} Transaction overrides for Base Sepolia
 */
export const getBaseSepoliaGasOverrides = async (provider) => {
  try {
    // First check if we're on Base Sepolia
    const network = await provider.getNetwork();
    if (network.chainId !== 84532n && network.chainId !== 84532) {
      console.warn("Not on Base Sepolia network - gas settings may not be appropriate");
    }

    // Get current network gas prices
    const feeData = await provider.getFeeData();
    console.log("Current network gas price:", ethers.formatUnits(feeData.gasPrice || 0, "gwei"), "gwei");
    
    // Use EIP-1559 if available (maxFeePerGas & maxPriorityFeePerGas)
    if (feeData.maxFeePerGas) {
      // Double the base gas settings to ensure transaction goes through
      const maxFeePerGas = feeData.maxFeePerGas * 2n;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * 2n;
      
      console.log(`Using EIP-1559 gas settings:
        maxFeePerGas: ${ethers.formatUnits(maxFeePerGas, "gwei")} gwei
        maxPriorityFeePerGas: ${ethers.formatUnits(maxPriorityFeePerGas, "gwei")} gwei`);
      
      return {
        maxFeePerGas,
        maxPriorityFeePerGas,
        gasLimit: DEFAULT_GAS_LIMIT
      };
    }
    
    // Fall back to legacy gas price if EIP-1559 not available
    // Use the higher of current gas price * 2 or our default high gas price
    const recommendedGasPrice = feeData.gasPrice ? 
      (feeData.gasPrice < HIGH_GAS_PRICE ? HIGH_GAS_PRICE : feeData.gasPrice * 2n) : 
      HIGH_GAS_PRICE;
    
    console.log(`Using legacy gas price: ${ethers.formatUnits(recommendedGasPrice, "gwei")} gwei`);
    
    return {
      gasPrice: recommendedGasPrice,
      gasLimit: DEFAULT_GAS_LIMIT
    };
  } catch (error) {
    console.warn("Error getting gas settings:", error);
    // Fallback to simple high gas price if anything fails
    return {
      gasPrice: HIGH_GAS_PRICE,
      gasLimit: DEFAULT_GAS_LIMIT
    };
  }
};

/**
 * Verifies a transaction hash on Base Sepolia by checking if it exists
 * 
 * @param {Object} provider - ethers provider
 * @param {string} txHash - transaction hash to verify
 * @returns {Promise<Object>} status of the transaction verification
 */
export const verifyTransactionOnBaseSepolia = async (provider, txHash) => {
  try {
    if (!txHash) {
      return { exists: false, message: "No transaction hash provided" };
    }
    
    // Try to get receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (receipt) {
      return {
        exists: true,
        confirmed: receipt.confirmations > 1,
        status: receipt.status === 1 ? "success" : "failed",
        blockNumber: receipt.blockNumber,
        message: `Transaction found: ${receipt.status === 1 ? 'successful' : 'failed'}`
      };
    }
    
    // If we can't get receipt, try to get the transaction to see if it's pending
    const tx = await provider.getTransaction(txHash);
    
    if (tx) {
      return {
        exists: true,
        confirmed: false,
        status: "pending",
        blockNumber: null,
        message: "Transaction is pending confirmation"
      };
    }
    
    // If we couldn't find the transaction at all
    return {
      exists: false,
      message: "Transaction not found on Base Sepolia. It may not have been broadcast correctly."
    };
  } catch (error) {
    console.error("Error verifying transaction:", error);
    return {
      exists: false,
      error: error.message,
      message: "Error verifying transaction"
    };
  }
};

export default {
  getBaseSepoliaGasOverrides,
  verifyTransactionOnBaseSepolia,
  HIGH_GAS_PRICE,
  ULTRA_HIGH_GAS_PRICE,
  DEFAULT_GAS_LIMIT
};
