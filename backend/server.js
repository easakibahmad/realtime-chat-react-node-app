// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// handle cors issue
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// Store client connections with their usernames
const clients = new Map();

wss.on('connection', (ws) => {
  let userName = '';

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    switch (message.type) {
      case 'join':
        userName = message.userName;
        clients.set(userName, ws);
        broadcastUserList();
        break;
      
      case 'chat':
        const targetClient = clients.get(message.to);
        if (targetClient && targetClient.readyState === WebSocket.OPEN) {
          const chatMessage = JSON.stringify({
            type: 'chat',
            from: userName,
            content: message.content,
            timestamp: new Date().toISOString()
          });
          targetClient.send(chatMessage);
          ws.send(chatMessage); // Echo back to sender
        }
        break;
    }
  });

  ws.on('close', () => {
    clients.delete(userName);
    broadcastUserList();
  });

  function broadcastUserList() {
    const userList = Array.from(clients.keys());
    const message = JSON.stringify({
      type: 'userList',
      users: userList
    });
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
});

server.listen(8080, () => {
  console.log('Server running on port 8080');
});