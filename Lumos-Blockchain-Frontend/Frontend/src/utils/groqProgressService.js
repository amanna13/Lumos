/**
 * Standalone Groq progress service with HTTP polling only
 */

// Constants
const GROQ_API_BASE = 'https://lumos-mz9a.onrender.com';
const STORAGE_KEY = 'groq_evaluation_state';
const POLLING_INTERVAL = 5000; // Fallback polling interval in ms

/**
 * Class to handle Groq evaluation progress with HTTP Polling only (WebSocket removed)
 */
class GroqProgressService {
  constructor() {
    this.listeners = [];
    this.status = 'idle';
    this.progress = 0;
    this.message = '';
    this.isConnected = false; // No WebSocket, always false
    this.usePolling = true;
    this.pollingInterval = null;
    this.maxRetries = 3;
    this.retryCount = 0;
    // Load from localStorage
    this.loadFromStorage();
  }

  /**
   * Load saved state from localStorage
   */
  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.progress = data.percent || 0;
        this.status = data.status || 'idle';
        this.message = data.message || '';
      }
    } catch (err) {
      console.warn('Error loading Groq progress from storage:', err);
    }
  }

  /**
   * Save state to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        percent: this.progress,
        status: this.status,
        message: this.message,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.warn('Error saving Groq progress to storage:', err);
    }
  }

  /**
   * Update progress states and notify listeners
   */
  updateState(data) {
    let updated = false;
    
    if (typeof data.percent === 'number' && !isNaN(data.percent)) {
      this.progress = Math.round(data.percent);
      updated = true;
    }
    
    if (data.status) {
      this.status = data.status;
      updated = true;
    }
    
    if (data.message) {
      this.message = data.message;
      updated = true;
    }
    
    if (updated) {
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Notify all listeners of state changes
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener({
          percent: this.progress,
          status: this.status,
          message: this.message,
          isConnected: this.isConnected,
          usePolling: this.usePolling
        });
      } catch (err) {
        console.warn('Error in Groq progress listener:', err);
      }
    });
  }

  /**
   * Add a listener for progress updates
   * @param {Function} listener - Callback function
   * @returns {Function} - Function to remove the listener
   */
  subscribe(listener) {
    if (typeof listener !== 'function') {
      console.warn('Groq progress listener must be a function');
      return () => {};
    }
    
    this.listeners.push(listener);
    
    // Immediately notify with current state
    listener({
      percent: this.progress,
      status: this.status,
      message: this.message,
      isConnected: this.isConnected,
      usePolling: this.usePolling
    });
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Start HTTP polling for progress updates
   */
  startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    this.usePolling = true;
    // Immediately fetch once
    this.fetchProgressUpdate();
    // Then set up interval
    this.pollingInterval = setInterval(() => {
      if (this.status !== 'completed' && this.status !== 'error') {
        this.fetchProgressUpdate();
      } else {
        this.stopPolling();
      }
    }, POLLING_INTERVAL);
  }

  /**
   * Stop HTTP polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Fetch progress via HTTP API
   */
  async fetchProgressUpdate() {
    try {
      const timestamp = Date.now();
      const response = await fetch(`${GROQ_API_BASE}/evaluation/progress?_=${timestamp}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        }
      });
      if (response.ok) {
        const data = await response.json();
        this.updateState(data);
      }
    } catch (err) {
      console.warn('Error fetching Groq progress:', err);
    }
  }

  /**
   * Start monitoring progress - HTTP polling only
   */
  start() {
    if (this.status === 'completed' || this.status === 'error') {
      return;
    }
    if (this.status === 'idle') {
      this.updateState({ status: 'running' });
    }
    this.startPolling();
  }

  /**
   * Stop monitoring progress
   */
  stop() {
    this.stopPolling();
  }

  /**
   * Reset progress state
   */
  reset() {
    this.progress = 0;
    this.status = 'idle';
    this.message = '';
    this.saveToStorage();
    this.notifyListeners();
  }
}

// Create singleton instance
const groqProgressService = new GroqProgressService();
export default groqProgressService;
