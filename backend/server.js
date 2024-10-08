require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const mongoUrl = process.env.MONGO_URI;
const dbName = process.env.APP_DB;
let db;

// Store client connections with their usernames
const clients = new Map();

async function connectToMongo() {
  try {
    const client = await MongoClient.connect(mongoUrl);
    db = client.db(dbName);
    await createIndexes();
    console.log('Connected to MongoDB and created indexes');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
  }
}

async function createIndexes() {
  try {
    await db.collection('messages').createIndexes([
      { key: { from: 1, to: 1 }, name: 'from_to_index' },
      { key: { timestamp: 1 }, name: 'timestamp_index' }
    ]);

    await db.collection('users').createIndexes([
      { key: { username: 1 }, unique: true, name: 'username_unique_index' },
      { key: { lastSeen: 1 }, name: 'lastSeen_index' }
    ]);

    console.log('Indexes created successfully');
  } catch (err) {
    console.error('Error creating indexes:', err);
  }
}

connectToMongo();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

wss.on('connection', (ws) => {
  let userName = '';

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      console.log('Received message:', message);  // Debug log

      switch (message.type) {
        case 'join':
          userName = message.userName;
          clients.set(userName, ws);
          
          // Save user to database
          await db.collection('users').updateOne(
            { username: userName },
            { 
              $set: { 
                username: userName, 
                lastSeen: new Date(),
                status: 'online'
              } 
            },
            { upsert: true }
          );
          
          await broadcastUserList();
          
          // Send message history
          const history = await getMessageHistory(userName);
          ws.send(JSON.stringify({
            type: 'history',
            messages: history
          }));
          break;

        case 'chat':
          if (!userName) {
            console.error('Attempting to send message without username');
            return;
          }

          const chatMessage = {
            type: 'chat',
            from: userName,  // Ensure this is set
            to: message.to,
            content: message.content,
            timestamp: new Date().toISOString()
          };

          console.log('Sending chat message:', chatMessage);  // Debug log

          // Save to database
          await db.collection('messages').insertOne(chatMessage);

          // Send to recipient
          const targetClient = clients.get(message.to);
          if (targetClient && targetClient.readyState === WebSocket.OPEN) {
            targetClient.send(JSON.stringify(chatMessage));
          }

          // Echo back to sender
          ws.send(JSON.stringify(chatMessage));
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', async () => {
    if (userName) {
      await db.collection('users').updateOne(
        { username: userName },
        { 
          $set: { 
            lastSeen: new Date(),
            status: 'offline'
          } 
        }
      );
      
      clients.delete(userName);
      await broadcastUserList();
    }
  });
});

async function broadcastUserList() {
  try {
    const users = await db.collection('users')
      .find(
        {}, 
        { 
          projection: { 
            username: 1, 
            lastSeen: 1, 
            status: 1,
            _id: 0 
          } 
        }
      )
      .toArray();
    
    const message = JSON.stringify({
      type: 'userList',
      users: users
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } catch (error) {
    console.error('Error broadcasting user list:', error);
  }
}

async function getMessageHistory(username) {
  try {
    return await db.collection('messages').find({
      $or: [
        { from: username },
        { to: username }
      ]
    })
    .sort({ timestamp: 1 })
    .limit(100)
    .toArray();
  } catch (error) {
    console.error('Error getting message history:', error);
    return [];
  }
}

server.listen(8080, () => {
  console.log('Server running on port 8080');
});