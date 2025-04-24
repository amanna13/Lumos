import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

// Ensure the data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Phase state storage file
const PHASE_FILE = path.join(dataDir, 'current-phase.json');

// Function to read current phase from file
const readPhaseFromFile = () => {
  try {
    if (fs.existsSync(PHASE_FILE)) {
      const phaseData = JSON.parse(fs.readFileSync(PHASE_FILE, 'utf8'));
      return phaseData.currentPhase || "Submission";
    }
  } catch (error) {
    console.error("Error reading phase file:", error);
  }
  return "Submission";
};

// Function to write current phase to file
const writePhaseToFile = (phase, clientId) => {
  try {
    fs.writeFileSync(PHASE_FILE, JSON.stringify({ 
      currentPhase: phase, 
      timestamp: new Date().toISOString(),
      lastUpdatedBy: clientId || 'server'
    }), 'utf8');
    return true;
  } catch (error) {
    console.error("Error writing phase file:", error);
    return false;
  }
};

// Initialize phase from file if it exists
let currentPhase = readPhaseFromFile();
console.log(`Starting server with phase: ${currentPhase}`);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0', // Bind to all available network interfaces, not just specific IP
    port: 5173, 
    cors: true,
    hmr: {
      // Improve HMR stability
      protocol: 'ws',
      timeout: 10000, // Increase timeout to 10 seconds
      overlay: true,
    },
    proxy: {
      '/api': {
        target: 'https://lumos-mz9a.onrender.com',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying:', req.method, req.url, 'to', proxyReq.path);
            
            // Add CORS headers to the proxy request
            proxyReq.setHeader('Origin', 'https://lumos-mz9a.onrender.com');
            proxyReq.setHeader('Access-Control-Request-Method', req.method);
            proxyReq.setHeader('Access-Control-Request-Headers', 'Content-Type,Authorization');
          });
          
          // Handle error events to prevent crashes
          proxy.on('error', (err, req, res) => {
            console.warn('API proxy error:', err);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
            }
          });
        },
      },
      '/api/gasless-submit': {
        bypass: (req, res) => {
          // Set CORS headers
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          
          // Handle preflight
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return true;
          }
          
          // Only handle POST requests
          if (req.method === 'POST') {
            // Read the request body
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            
            req.on('end', async () => {
              try {
                // Parse the request body
                const data = JSON.parse(body);
                const { userAddress, title, description, signature, messageHash } = data;
                
                // Verify required fields
                if (!userAddress || !title || !description || !signature || !messageHash) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing required fields' }));
                  return;
                }
                
                console.log(`Received gasless proposal submission from ${userAddress}`);
                
                // In a production environment, you'd use an admin wallet to submit the transaction
                // For demo purposes, we'll just return success with a mock hash
                // The proper implementation would validate the signature and use the admin wallet 
                // to submit the transaction to the blockchain
                
                // For now, just add to a queue file that the admin could process later
                try {
                  const queuePath = path.join(dataDir, 'gasless-queue.json');
                  const queue = fs.existsSync(queuePath) 
                    ? JSON.parse(fs.readFileSync(queuePath, 'utf8')) 
                    : [];
                  
                  queue.push({
                    ...data,
                    receivedAt: new Date().toISOString()
                  });
                  
                  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2), 'utf8');
                  console.log("Added proposal to gasless queue");
                } catch (fsError) {
                  console.error("Failed to save to queue:", fsError);
                }
                
                // Return success response
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  transactionHash: `mock-tx-${Date.now().toString(16)}`,
                  proposalId: Date.now().toString(),
                  message: "Proposal queued for submission by admin",
                  queuePosition: "pending"
                }));
              } catch (error) {
                console.error("Error processing gasless submission:", error);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Server error processing request' }));
              }
            });
            return true;
          }
          
          // Method not allowed
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return true;
        }
      }
    }
  },
  define: {
    // Fix for SockJS: define global as window for browser builds
    global: 'window',
  },
})
