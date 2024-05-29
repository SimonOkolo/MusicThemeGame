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

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    handleMessage(ws, data);
  });

  ws.on('close', () => {
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
  if (!playerName) {
    ws.send(JSON.stringify({ type: 'error', message: 'Name field cannot be empty' }));
    return;
  }
  const sessionCode = generateSessionCode();
  sessions.set(sessionCode, { players: [{ name: playerName, ws, team: null }] });
  ws.send(JSON.stringify({ type: 'sessionCreated', sessionCode }));
}

function joinSession(data, ws) {
  const { sessionCode, playerName } = data;
  if (!sessionCode || !playerName) {
    ws.send(JSON.stringify({ type: 'error', message: 'Session code and name fields cannot be empty' }));
    return;
  }
  if (!sessions.has(sessionCode)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
    return;
  }
  const session = sessions.get(sessionCode);
  session.players.push({ name: playerName, ws, team: null });
  sessions.set(sessionCode, session);
  updateLobby(sessionCode);
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
    updateLobby(sessionCode);
  } else {
    ws.send(JSON.stringify({ type: 'error', message: 'Player not found' }));
  }
}

function updateLobby(sessionCode) {
  const session = sessions.get(sessionCode);
  if (session) {
    session.players.forEach((player) => {
      player.ws.send(JSON.stringify({ type: 'updateLobby', players: session.players.map(p => ({ name: p.name, team: p.team })) }));
    });
  }
}

function generateSessionCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
