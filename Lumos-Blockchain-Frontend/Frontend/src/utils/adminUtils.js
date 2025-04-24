import { ethers } from 'ethers';
import path from 'path';
import fs from 'fs';
import VotingABI from '../contracts/Voting.json';

// Contract address - ensure it matches your deployed contract
const VOTING_ADDRESS = "0x5cE016f2731e1c6877542Ddef36c7285b6c64F19";

/**
 * Process gasless proposal submissions as admin
 * This function should be run by the admin to process queued submissions
 * @param {string} adminPrivateKey - The admin's private key
 * @returns {Promise<Array>} Results of processing
 */
export const processGaslessQueue = async (adminPrivateKey) => {
  try {
    // Set up provider and signer for admin
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
    const adminWallet = new ethers.Wallet(adminPrivateKey, provider);
    const adminAddress = await adminWallet.getAddress();
    
    console.log(`Processing gasless queue as admin: ${adminAddress}`);
    
    // Connect to voting contract
    const votingContract = new ethers.Contract(
      VOTING_ADDRESS,
      VotingABI.abi || VotingABI,
      adminWallet
    );
    
    // Read the queue file
    const dataDir = path.join(process.cwd(), 'data');
    const queuePath = path.join(dataDir, 'gasless-queue.json');
    
    if (!fs.existsSync(queuePath)) {
      console.log("No gasless queue file found");
      return [];
    }
    
    const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    if (!queue.length) {
      console.log("Gasless queue is empty");
      return [];
    }
    
    console.log(`Found ${queue.length} gasless submissions to process`);
    
    // Process each queued submission
    const results = [];
    const processedIndices = [];
    
    for (let i = 0; i < queue.length; i++) {
      const submission = queue[i];
      
      // Skip already processed items
      if (submission.processed) {
        continue;
      }
      
      try {
        console.log(`Processing submission ${i+1}/${queue.length} from ${submission.userAddress}`);
        
        // Verify signature (in production, you'd implement proper signature verification)
        // For demo purposes, we'll assume the signature is valid
        
        // Submit the proposal using the admin wallet
        const tx = await votingContract.submitProposalFor(
          submission.userAddress,
          submission.title,
          submission.description
        );
        
        const receipt = await tx.wait();
        console.log(`Transaction confirmed: ${receipt.transactionHash}`);
        
        // Mark as processed
        submission.processed = true;
        submission.processedAt = new Date().toISOString();
        submission.transactionHash = receipt.transactionHash;
        
        processedIndices.push(i);
        results.push({
          success: true,
          index: i,
          transactionHash: receipt.transactionHash,
          userAddress: submission.userAddress
        });
      } catch (error) {
        console.error(`Error processing submission ${i}:`, error);
        results.push({
          success: false,
          index: i,
          error: error.message,
          userAddress: submission.userAddress
        });
      }
    }
    
    // Update the queue file
    fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2), 'utf8');
    console.log(`Processed ${processedIndices.length} gasless submissions`);
    
    return results;
  } catch (error) {
    console.error("Error processing gasless queue:", error);
    throw error;
  }
};
