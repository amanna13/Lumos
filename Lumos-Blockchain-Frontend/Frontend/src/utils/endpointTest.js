/**
 * Utility to test and validate the render.com endpoint
 */

// The correct render.com endpoint
const RENDER_API_ENDPOINT = 'https://lumos-mz9a.onrender.com/proposals/allproposals';

/**
 * Test the render.com endpoint connectivity
 * @returns {Promise<Object>} Test results
 */
export const testRenderEndpoint = async () => {
  console.log(`Testing connection to: ${RENDER_API_ENDPOINT}`);
  const results = {
    timestamp: new Date().toISOString(),
    endpoint: RENDER_API_ENDPOINT,
    success: false,
    statusCode: null,
    responseTime: null,
    errorMessage: null,
    dataReceived: false,
    itemCount: 0,
    dataSample: null
  };
  
  const startTime = performance.now();
  
  try {
    const response = await fetch(`${RENDER_API_ENDPOINT}?_=${Date.now()}`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store'
      }
    });
    
    results.statusCode = response.status;
    const endTime = performance.now();
    results.responseTime = Math.round(endTime - startTime);
    
    console.log(`Response status: ${response.status}, time: ${results.responseTime}ms`);
    
    if (response.ok) {
      const responseText = await response.text();
      console.log(`Response size: ${responseText.length} bytes`);
      
      if (responseText && responseText.trim() !== '') {
        try {
          const data = JSON.parse(responseText);
          results.dataReceived = true;
          
          if (Array.isArray(data)) {
            results.success = true;
            results.itemCount = data.length;
            results.dataSample = data.slice(0, 2); // First 2 items for sample
            console.log(`Successfully parsed ${data.length} proposals`);
          } else {
            results.errorMessage = "Response is not an array";
            console.warn("Response is not an array:", data);
          }
        } catch (parseError) {
          results.errorMessage = `JSON parse error: ${parseError.message}`;
          console.warn("JSON parse error:", parseError);
        }
      } else {
        results.errorMessage = "Empty response received";
        console.warn("Empty response received");
      }
    } else {
      results.errorMessage = `HTTP error: ${response.status}`;
      console.warn(`HTTP error: ${response.status}`);
    }
  } catch (error) {
    const endTime = performance.now();
    results.responseTime = Math.round(endTime - startTime);
    results.errorMessage = error.message;
    console.error("Fetch error:", error);
  }
  
  console.log("Test results:", results);
  return results;
};

/**
 * Add this to window for easy console debugging
 */
if (typeof window !== 'undefined') {
  window.testRenderEndpoint = testRenderEndpoint;
}

export default {
  testRenderEndpoint,
  RENDER_API_ENDPOINT
};
