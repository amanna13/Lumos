// This file configures a proxy for development mode to avoid CORS errors

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Create proxy middleware for all API routes
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://lumos-mz9a.onrender.com',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // Remove /api prefix
      },
      // Add better error handling
      onProxyReq: function(proxyReq, req, res) {
        // Add cache control headers
        proxyReq.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        proxyReq.setHeader('Pragma', 'no-cache');
      },
      onProxyRes: function(proxyRes, req, res) {
        // Log successful responses for debugging
        console.log(`Proxy response from ${req.path}: ${proxyRes.statusCode}`);
      },
      onError: function(err, req, res) {
        console.error('Proxy error:', err.message || err);
        
        // Check if we've already sent headers
        if (!res.headersSent) {
          res.writeHead(502, {
            'Content-Type': 'application/json'
          });
          
          const errorResponse = {
            error: 'API Connection Error',
            message: 'Could not connect to the backend API. The application will use offline mode.',
            code: err.code || 'UNKNOWN_ERROR',
            timestamp: new Date().toISOString(),
            path: req.path
          };
          
          res.end(JSON.stringify(errorResponse));
        }
      }
    })
  );

  // Direct endpoints to avoid the api prefix - with better error handling
  const directEndpoints = [
    '/current-phase',
    '/update-phase',
    '/evaluation',
    '/ws-progress',
    '/proposals',
    '/health'
  ];

  // Fix: Remove websocket support for /ws-progress endpoint
  directEndpoints.forEach(endpoint => {
    app.use(
      endpoint,
      createProxyMiddleware({
        target: 'https://lumos-mz9a.onrender.com',
        changeOrigin: true,
        // ws: endpoint === '/ws-progress', // Remove WebSocket proxying
        onProxyReq: function(proxyReq) {
          proxyReq.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          proxyReq.setHeader('Pragma', 'no-cache');
        },
        onError: function(err, req, res) {
          console.error(`Proxy error for ${endpoint}:`, err.message);
          
          if (!res.headersSent) {
            res.writeHead(502, {
              'Content-Type': 'application/json'
            });
            
            const errorResponse = {
              error: 'API Connection Error',
              message: 'Could not connect to the backend API. Using fallback local data.',
              code: err.code || 'UNKNOWN_ERROR',
              path: req.originalUrl || endpoint
            };
            
            res.end(JSON.stringify(errorResponse));
          }
        }
      })
    );
  });

  // Add a health check endpoint that always returns OK
  app.use('/local-health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      mode: 'local'
    });
  });
};
