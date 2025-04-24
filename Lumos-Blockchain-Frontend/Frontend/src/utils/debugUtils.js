/**
 * Debugging utilities to help diagnose connectivity and data issues
 */

/**
 * Attempt to ping multiple endpoints and log their status
 * @param {Array<string>} endpoints - Array of URLs to ping
 * @returns {Object} Results by endpoint
 */
export const diagnosePingEndpoints = async (endpoints = []) => {
  const defaultEndpoints = [
    'https://lumos-mz9a.onrender.com/proposals/allproposals',
    'https://lumos-mz9a.onrender.com/proposals/getAll'
  ];
  
  const targetEndpoints = endpoints.length > 0 ? endpoints : defaultEndpoints;
  const results = {};
  
  console.log("===== ENDPOINT DIAGNOSIS =====");
  
  for (const endpoint of targetEndpoints) {
    try {
      const startTime = performance.now();
      const response = await fetch(`${endpoint}?_=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
        },
        timeout: 5000
      });
      
      const endTime = performance.now();
      const pingTime = Math.round(endTime - startTime);
      
      results[endpoint] = {
        reachable: response.ok,
        status: response.status,
        pingTime: `${pingTime}ms`,
        headers: Object.fromEntries([...response.headers.entries()])
      };
      
      console.log(`[PING] ${endpoint}: ${response.ok ? 'REACHABLE' : 'FAILED'} (${response.status}, ${pingTime}ms)`);
    } catch (error) {
      results[endpoint] = {
        reachable: false,
        error: error.message
      };
      
      console.log(`[PING] ${endpoint}: ERROR - ${error.message}`);
    }
  }
  
  console.log("===== END DIAGNOSIS =====");
  return results;
};

/**
 * Check network status and capabilities
 * @returns {Object} Network diagnostics
 */
export const diagnoseNetworkStatus = () => {
  const status = {
    online: navigator.onLine,
    connection: navigator.connection ? {
      type: navigator.connection.type,
      effectiveType: navigator.connection.effectiveType,
      downlinkMbps: navigator.connection.downlink,
      rtt: navigator.connection.rtt
    } : 'Not available',
    serviceWorkerSupported: 'serviceWorker' in navigator,
    cors: typeof fetch !== 'undefined',
    localStorage: (() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    })()
  };
  
  console.log("NETWORK DIAGNOSTICS:", status);
  return status;
};

/**
 * Test the connection to the API and measure response time
 * @returns {Promise<Object>} Connection test results
 */
export const testApiConnection = async () => {
  const endpoints = [
    'https://lumos-mz9a.onrender.com/proposals/allproposals',
    '/api/allproposals',
    '/api/proposals/allproposals'
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      const startTime = performance.now();
      const response = await fetch(`${endpoint}?_=${Date.now()}`, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      let contentType = response.headers.get('content-type') || '';
      let isJson = contentType.includes('application/json');
      let dataSize = 0;
      let dataPreview = '';
      
      if (response.ok) {
        const text = await response.text();
        dataSize = text.length;
        dataPreview = text.substring(0, 100) + (text.length > 100 ? '...' : '');
        
        results[endpoint] = {
          success: true,
          status: response.status,
          responseTime: `${responseTime}ms`,
          contentType,
          isJson,
          dataSize: `${Math.round(dataSize / 1024 * 100) / 100} KB`,
          dataPreview
        };
        
        console.log(`[API TEST] ${endpoint}: SUCCESS (${responseTime}ms, ${dataSize} bytes)`);
      } else {
        results[endpoint] = {
          success: false,
          status: response.status,
          responseTime: `${responseTime}ms`,
          error: `HTTP ${response.status}`
        };
        
        console.log(`[API TEST] ${endpoint}: FAILED (${response.status}, ${responseTime}ms)`);
      }
    } catch (error) {
      results[endpoint] = {
        success: false,
        error: error.message
      };
      
      console.log(`[API TEST] ${endpoint}: ERROR - ${error.message}`);
    }
  }
  
  return {
    timestamp: new Date().toISOString(),
    networkStatus: diagnoseNetworkStatus(),
    endpoints: results
  };
};

/**
 * Run a complete diagnostic and return the results
 * @returns {Promise<Object>} Complete diagnostic results
 */
export const runDiagnostics = async () => {
  console.log("===== STARTING DIAGNOSTICS =====");
  const startTime = performance.now();
  
  // Network status
  const network = diagnoseNetworkStatus();
  
  // Endpoint pings
  const pings = await diagnosePingEndpoints();
  
  // API tests
  const apiTest = await testApiConnection();
  
  // Storage diagnostics
  const storage = {
    localStorageAvailable: (() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    })(),
    localStorageSize: (() => {
      try {
        let size = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          const value = localStorage.getItem(key);
          size += (key.length + value.length) * 2; // Unicode chars = 2 bytes
        }
        return `${Math.round(size / 1024 * 100) / 100} KB`;
      } catch (e) {
        return 'Error calculating';
      }
    })(),
    hasProposalsCache: !!localStorage.getItem('proposals_api_cache'),
    hasFallbackProposals: !!localStorage.getItem('fallbackProposals')
  };
  
  const endTime = performance.now();
  
  const results = {
    timestamp: new Date().toISOString(),
    diagnosticDuration: `${Math.round(endTime - startTime)}ms`,
    userAgent: navigator.userAgent,
    network,
    endpoints: pings,
    apiTest,
    storage
  };
  
  console.log("===== DIAGNOSTICS RESULTS =====", results);
  return results;
};

export default {
  diagnosePingEndpoints,
  diagnoseNetworkStatus,
  testApiConnection,
  runDiagnostics
};
