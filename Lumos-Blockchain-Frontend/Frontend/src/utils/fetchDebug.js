/**
 * Debugging utilities for API fetch operations
 */

/**
 * Test the connection to the render.com API endpoint
 */
export const testRenderEndpoint = async () => {
  console.log("Testing connection to render.com endpoint...");
  
  try {
    const startTime = performance.now();
    const response = await fetch('https://lumos-mz9a.onrender.com/proposals/allproposals', {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    console.log(`Response status: ${response.status} (${responseTime}ms)`);
    
    if (response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          console.log(`Successfully fetched ${data.length} proposals`);
          return {
            success: true,
            status: response.status,
            responseTime,
            count: data.length,
            data
          };
        } else {
          console.warn("Response is not an array:", data);
          return {
            success: false,
            status: response.status,
            responseTime,
            error: "Response is not an array"
          };
        }
      } catch (parseError) {
        console.error("Failed to parse JSON:", parseError);
        return {
          success: false,
          status: response.status,
          responseTime,
          error: "Invalid JSON response",
          responseText: text.substring(0, 100) + (text.length > 100 ? "..." : "")
        };
      }
    } else {
      console.error(`Failed with status: ${response.status}`);
      return {
        success: false,
        status: response.status,
        responseTime,
        error: `HTTP error: ${response.status}`
      };
    }
  } catch (error) {
    console.error("Fetch error:", error);
    return {
      success: false,
      error: error.message || "Unknown fetch error"
    };
  }
};

/**
 * Display network information
 */
export const getNetworkInfo = () => {
  return {
    online: navigator.onLine,
    userAgent: navigator.userAgent,
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
      saveData: navigator.connection.saveData
    } : "Not available"
  };
};

export default {
  testRenderEndpoint,
  getNetworkInfo
};
