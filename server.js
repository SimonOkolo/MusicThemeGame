const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Map to store active sessions
const sessions = new Map();

let connectedClients = 0;

// WebSocket connection handling
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    handleMessage(ws, data);
  });

  ws.on('close', () => {
    // Decrement the connected clients count when a client disconnects
    connectedClients--;
    console.log(`A client disconnected. Total connected clients: ${connectedClients}`);
  });
  
  connectedClients++;
  console.log(`A new client connected. Total connected clients: ${connectedClients}`);
});



function handleMessage(ws, data) {
  switch (data.type) {
    case 'createSession':
      createSession(data, ws);
      break;
    case 'joinSession':
      joinSession(data, ws);
      break;
  }
}

function createSession(data, ws) {
  const { playerName } = data;
  const previousSession = Array.from(sessions.values()).find(session => session.players.some(player => player.ws === ws));

  if (previousSession) {
    // Remove the host's WebSocket connection from the previous session
    previousSession.players = previousSession.players.filter(player => player.ws !== ws);
  }

  if (!playerName) {
    ws.send(JSON.stringify({ type: 'error', message: 'Name field cannot be empty' }));
    return;
  }

  const sessionCode = generateSessionCode();
  const sessionData = {
    sessionCode,
    owner: ws,
    players: [{ ws, name: playerName }],
    started: false,
  };
  sessions.set(sessionCode, sessionData);
  ws.send(JSON.stringify({ type: 'sessionCreated', sessionCode }));

  // Send updated lobby list to all players
  const players = []; // Initialize an empty array

  // Populate the players array with new values
  Array.from(sessions.values())
    .flatMap(session => session.players.map(player => ({ name: player.name })))
    .forEach(player => players.push(player)); // Add new players to the array
  
  broadcastToAll({ type: 'updateLobby', players });
}

function broadcastToAll(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

function joinSession(data, ws) {
  const { sessionCode, playerName } = data;
  const session = sessions.get(sessionCode);
  if (!session) {
    ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
    return;
  }
  if (!playerName) {
    ws.send(JSON.stringify({ type: 'error', message: 'Name field cannot be empty' }));
    return;
  }

  session.players.push({ ws, name: playerName });
  ws.send(JSON.stringify({ type: 'sessionJoined' }));
  session.owner.send(JSON.stringify({ type: 'playerJoined', playerName }));

  // Send updated lobby list to all players in the session
  broadcastToSession(sessionCode, { type: 'updateLobby', players: getSessionPlayers(sessionCode) });

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'leftSession') {
      session.players = session.players.filter(player => player.ws !== ws);
      broadcastToSession(sessionCode, { type: 'updateLobby', players: getSessionPlayers(sessionCode) });

      // If no players left in session, destroy it
      if (session.players.length === 0) {
        sessions.delete(sessionCode);
      }
    }
  });
}

function broadcastToSession(sessionCode, data) {
  const session = sessions.get(sessionCode);
  if (session) {
    session.players.forEach(player => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(data));
      }
    });
  }
}

function generateSessionCode() {
  // Generate a random 6-character alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Handle root route ("/")
app.get('/', (req, res) => {
  res.send('Welcome to Multiplayer Game Server');
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
