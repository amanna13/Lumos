/**
 * Utility for synchronizing vote data across devices
 */
import { getAllLocalVotes, storeLocalVote } from './localVoteStorage';

/**
 * Synchronize votes with the server
 * @returns {Promise<boolean>} Success status
 */
export const syncVotesWithServer = async () => {
  try {
    // Get all local votes
    const localVotes = getAllLocalVotes();
    
    // Upload to server
    const response = await fetch('https://lumos-mz9a.onrender.com/proposals/sync-votes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        votes: localVotes,
        deviceId: getDeviceIdentifier()
      })
    });
    
    if (!response.ok) {
      console.warn('Vote sync failed:', await response.text());
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error syncing votes with server:', err);
    return false;
  }
};

/**
 * Get votes from server
 * @returns {Promise<Object>} Vote data from server
 */
export const getVotesFromServer = async () => {
  try {
    const response = await fetch('https://lumos-mz9a.onrender.com/proposals/get-votes', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn('Getting votes from server failed:', await response.text());
      return null;
    }
    
    const data = await response.json();
    return data.votes || {};
  } catch (err) {
    console.error('Error getting votes from server:', err);
    return null;
  }
};

/**
 * Get a unique identifier for this device/browser
 * @returns {string} Device ID
 */
const getDeviceIdentifier = () => {
  let deviceId = localStorage.getItem('lumos_device_id');
  
  if (!deviceId) {
    // Generate a new device ID
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('lumos_device_id', deviceId);
  }
  
  return deviceId;
};

export default {
  syncVotesWithServer,
  getVotesFromServer
};
