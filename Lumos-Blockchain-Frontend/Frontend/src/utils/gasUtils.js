/**
 * Utilities for managing gas fees to speed up transactions
 */

import { ethers } from 'ethers';

// Define gas fee settings (50 gwei) for faster confirmations on Base Sepolia
export const HIGH_PRIORITY_GAS_PRICE = ethers.parseUnits("50", "gwei");
export const ULTRA_PRIORITY_GAS_PRICE = ethers.parseUnits("75", "gwei");
export const DEFAULT_HIGH_GAS_LIMIT = 300000; // Higher gas limit for safety

/**
 * Returns transaction options with high gas fees for fast confirmations
 * @returns {Object} Transaction options with high gas price
 */
export const getHighGasTransactionOptions = () => {
  return {
    gasPrice: HIGH_PRIORITY_GAS_PRICE,
    gasLimit: DEFAULT_HIGH_GAS_LIMIT,
  };
};

/**
 * Returns transaction options with ultra high gas fees for immediate confirmations
 * @returns {Object} Transaction options with ultra high gas price
 */
export const getUltraFastTransactionOptions = () => {
  return {
    gasPrice: ULTRA_PRIORITY_GAS_PRICE,
    gasLimit: DEFAULT_HIGH_GAS_LIMIT,
  };
};

/**
 * Returns EIP-1559 compatible transaction options for fast confirmations
 * Fallbacks to legacy gas price if EIP-1559 fields cause issues
 * @param {Object} provider - Ethers provider to get fee data from
 * @returns {Promise<Object>} Transaction options with appropriate fee structure
 */
export const getFastEIP1559TransactionOptions = async (provider) => {
  try {
    const feeData = await provider.getFeeData();
    
    // If maxFeePerGas is available (EIP-1559 network)
    if (feeData.maxFeePerGas) {
      // Calculate priority fees (at least 50 gwei)
      const baseMaxPriorityFee = ethers.parseUnits("5", "gwei");
      const baseMaxFee = ethers.parseUnits("50", "gwei");
      
      // Ensure our fees are higher than network fees
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas > baseMaxPriorityFee ? 
        feeData.maxPriorityFeePerGas * 2n : baseMaxPriorityFee;
      
      const maxFeePerGas = feeData.maxFeePerGas > baseMaxFee ?
        feeData.maxFeePerGas * 2n : baseMaxFee;
      
      console.log(`Using EIP-1559 gas fees:
        maxFeePerGas: ${ethers.formatUnits(maxFeePerGas, "gwei")} gwei
        maxPriorityFeePerGas: ${ethers.formatUnits(maxPriorityFeePerGas, "gwei")} gwei`);
        
      return {
        maxFeePerGas,
        maxPriorityFeePerGas,
        gasLimit: DEFAULT_HIGH_GAS_LIMIT
      };
    }
    
    // Fallback to legacy gas price
    console.log(`Using legacy gas price: ${ethers.formatUnits(HIGH_PRIORITY_GAS_PRICE, "gwei")} gwei`);
    return getHighGasTransactionOptions();
    
  } catch (error) {
    console.warn("Error getting EIP-1559 fees:", error);
    // Fallback to legacy gas price
    return getHighGasTransactionOptions();
  }
};

/**
 * Gets the current gas price from the network and suggests a higher value
 * @param {Object} provider - Ethers provider
 * @returns {Promise<Object>} Current and suggested gas prices
 */
export const getGasPriceInfo = async (provider) => {
  try {
    const feeData = await provider.getFeeData();
    const currentGasPrice = feeData.gasPrice || ethers.parseUnits("1", "gwei");
    const recommendedGasPrice = currentGasPrice < HIGH_PRIORITY_GAS_PRICE ? 
      HIGH_PRIORITY_GAS_PRICE : currentGasPrice * 2n;
    
    return {
      current: {
        wei: currentGasPrice,
        gwei: ethers.formatUnits(currentGasPrice, "gwei")
      },
      recommended: {
        wei: recommendedGasPrice,
        gwei: ethers.formatUnits(recommendedGasPrice, "gwei")
      },
      baseSepoliaRecommended: {
        wei: HIGH_PRIORITY_GAS_PRICE,
        gwei: ethers.formatUnits(HIGH_PRIORITY_GAS_PRICE, "gwei")
      }
    };
  } catch (error) {
    console.warn("Error getting gas price info:", error);
    return {
      current: { wei: 0n, gwei: "unknown" },
      recommended: { 
        wei: HIGH_PRIORITY_GAS_PRICE, 
        gwei: ethers.formatUnits(HIGH_PRIORITY_GAS_PRICE, "gwei")
      },
      baseSepoliaRecommended: {
        wei: HIGH_PRIORITY_GAS_PRICE,
        gwei: ethers.formatUnits(HIGH_PRIORITY_GAS_PRICE, "gwei")
      }
    };
  }
};

export default {
  getHighGasTransactionOptions,
  getUltraFastTransactionOptions,
  getFastEIP1559TransactionOptions,
  getGasPriceInfo,
  HIGH_PRIORITY_GAS_PRICE,
  ULTRA_PRIORITY_GAS_PRICE,
  DEFAULT_HIGH_GAS_LIMIT
};
