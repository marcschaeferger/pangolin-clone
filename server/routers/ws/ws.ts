const express = require('express');
const router = express.Router();
const WebSocket = require('ws');
const wss = new WebSocket.Server({ noServer: true });

// Token verification middleware
const verifyToken = (token) => {
  // This is where you'd implement your token verification logic
  // For example, verify JWT, check against database, etc.
  // Return true if token is valid, false otherwise
  return true; // Placeholder return
};

// Handle WebSocket upgrade requests
router.get('/ws', (req, res) => {
  // WebSocket upgrade will be handled by the server
  res.status(200).send('WebSocket endpoint');
});

// Set up WebSocket server handling
const handleWSUpgrade = (server) => {
  server.on('upgrade', (request, socket, head) => {
    // Extract token from query parameters or headers
    const token = request.url.includes('?') 
      ? new URLSearchParams(request.url.split('?')[1]).get('token')
      : request.headers['sec-websocket-protocol'];

    // Verify the token
    if (!token || !verifyToken(token)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
};

// WebSocket connection handler
wss.on('connection', (ws, request) => {
  console.log('Client connected');

  // Set up message handler
  ws.on('message', (message) => {
    console.log('Received:', message.toString());
    
    // Echo the message back
    ws.send(`Server received: ${message}`);
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Export both the router and the upgrade handler
module.exports = {
  router,
  handleWSUpgrade
};