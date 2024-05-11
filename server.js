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

// WebSocket connection handling
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    handleMessage(ws, data);
  });
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
  broadcastToAll({ type: 'updateLobby', players });
  ws.send(JSON.stringify({ type: 'sessionCreated', sessionCode }));

  // Send updated lobby list to all players
  const players = Array.from(sessions.values())
    .flatMap(session => session.players.map(player => ({ name: player.name })));
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

  // Send updated lobby list to all players
  const players = session.players.map(player => ({ name: player.name }));
  broadcastToSession(sessionCode, { type: 'updateLobby', players });

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'leftSession') {
      session.players = session.players.filter(player => player.ws !== ws);
      broadcastToSession(sessionCode, { type: 'updateLobby', players: session.players.map(player => ({ name: player.name })) });
    }
  });

  // If no players left in session, destroy it
  if (session.players.length === 0) {
    sessions.delete(sessionCode);
  }
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
