const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
    case 'joinTeam':
      joinTeam(data, ws);
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
    players: [{ ws, name: playerName, team: null }],
    started: false,
  };
  sessions.set(sessionCode, sessionData);
  ws.send(JSON.stringify({ type: 'sessionCreated', sessionCode }));

  // Send updated lobby list to all players
  broadcastToAll({ type: 'updateLobby', players: getAllPlayers() });
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

  session.players.push({ ws, name: playerName, team: null });
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

function getSessionPlayers(sessionCode) {
  const session = sessions.get(sessionCode);
  if (session) {
    return session.players.map(player => ({ name: player.name, team: player.team }));
  }
  return [];
}

function joinTeam(data, ws) {
  const { sessionCode, playerName, team } = data;
  if (!sessionCode || !playerName || !team) {
    ws.send(JSON.stringify({ type: 'error', message: 'Session code, player name, and team cannot be empty' }));
    return;
  }
  if (!sessions.has(sessionCode)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
    return;
  }
  const session = sessions.get(sessionCode);
  const player = session.players.find(p => p.name === playerName);
  if (player) {
    player.team = team;
    sessions.set(sessionCode, session);
    session.players.forEach((p) => {
      p.ws.send(JSON.stringify({ type: 'updateLobby', players: session.players.map(pl => ({ name: pl.name, team: pl.team })) }));
    });
  } else {
    ws.send(JSON.stringify({ type: 'error', message: 'Player not found' }));
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
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Handle root route ("/")
app.get('/', (req, res) => {
  res.send('Welcome to Multiplayer Game Server');
});

function getAllPlayers() {
  return Array.from(sessions.values())
    .flatMap(session => session.players.map(player => ({ name: player.name, team: player.team })));
}

// Log total connected clients and active sessions with player names every 1 second
setInterval(() => {
  console.log(`Total connected clients: ${connectedClients}, Active sessions: ${sessions.size}`);

  // Log player names for each active session
  sessions.forEach((session, sessionCode) => {
    const playerNames = getSessionPlayerNames(sessionCode);
    console.log(`Session ${sessionCode} Players: ${playerNames.join(', ')}`);
  });
}, 1000); // Log every 1 second

function getSessionPlayerNames(sessionCode) {
  const session = sessions.get(sessionCode);
  if (session) {
    return session.players.map(player => player.name);
  }
  return [];
}

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});