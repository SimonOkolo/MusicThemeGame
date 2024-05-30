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
    handleDisconnection(ws);
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
    case 'startGame':
      startGame(data, ws);
      break;
    case 'endGame':
      endGame(data, ws);
      break;
    case 'leaveSession':
      leaveSession(data, ws);
      break;
  }
}

function createSession(data, ws) {
  const { playerName } = data;
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

  updateLobbyForAllPlayers(sessionCode);
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
  ws.send(JSON.stringify({ type: 'sessionJoined', sessionCode }));
  updateLobbyForAllPlayers(sessionCode);
}

function joinTeam(data, ws) {
  const { sessionCode, playerName, team } = data;
  if (!sessionCode || !playerName || !team) {
    ws.send(JSON.stringify({ type: 'error', message: 'Session code, player name, and team cannot be empty' }));
    return;
  }

  const session = sessions.get(sessionCode);
  if (!session) {
    ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
    return;
  }

  const player = session.players.find(p => p.ws === ws);
  if (player) {
    player.team = team;
    updateLobbyForAllPlayers(sessionCode);
  } else {
    ws.send(JSON.stringify({ type: 'error', message: 'Player not found' }));
  }
}

function startGame(data, ws) {
  const { sessionCode } = data;
  const session = sessions.get(sessionCode);
  if (!session) {
    ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
    return;
  }
  if (session.owner !== ws) {
    ws.send(JSON.stringify({ type: 'error', message: 'Only the host can start the game' }));
    return;
  }

  session.started = true;
  session.players.forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({ type: 'gameStarted' }));
    }
  });
}

function endGame(data, ws) {
  const { sessionCode } = data;
  const session = sessions.get(sessionCode);
  if (!session) {
    ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
    return;
  }
  if (session.owner !== ws) {
    ws.send(JSON.stringify({ type: 'error', message: 'Only the host can end the game' }));
    return;
  }

  session.players.forEach(player => {
    player.ws.send(JSON.stringify({ type: 'gameEnded' }));
  });

  sessions.delete(sessionCode);
}

function leaveSession(data, ws) {
  const { sessionCode } = data;
  const session = sessions.get(sessionCode);
  if (!session) {
    ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
    return;
  }

  session.players = session.players.filter(player => player.ws !== ws);
  if (session.players.length === 0) {
    sessions.delete(sessionCode);
  } else {
    updateLobbyForAllPlayers(sessionCode);
  }
}

function handleDisconnection(ws) {
  sessions.forEach((session, sessionCode) => {
    const playerIndex = session.players.findIndex(player => player.ws === ws);
    if (playerIndex !== -1) {
      session.players.splice(playerIndex, 1);
      if (session.players.length === 0) {
        sessions.delete(sessionCode);
      } else {
        updateLobbyForAllPlayers(sessionCode);
      }
    }
  });
}

function updateLobbyForAllPlayers(sessionCode) {
  const session = sessions.get(sessionCode);
  if (session) {
    const players = session.players.map(player => ({ name: player.name, team: player.team, isHost: player.ws === session.owner }));
    session.players.forEach(player => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify({ type: 'updateLobby', players }));
      }
    });
  }
}


function generateSessionCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

app.get('/', (req, res) => {
  res.send('Welcome to Multiplayer Game Server');
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});