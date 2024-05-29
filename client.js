const socket = new WebSocket('ws://192.168.1.189:3000');

socket.addEventListener('open', (event) => {
  console.log('WebSocket connection established:', event);
});

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  handleMessage(data);
});

function handleMessage(data) {
  switch (data.type) {
    case 'sessionCreated':
      showLobby(data.sessionCode);
      break;
    case 'sessionJoined':
      console.log('Session joined');
      break;
    case 'playerJoined':
      addPlayerToLobby(data.playerName);
      break;
    case 'updateLobby':
      updateLobby(data.players);
      break;
    case 'error':
      console.error(data.message);
      break;
  }
}

function createSession() {
  const username = document.getElementById('username').value;
  if (!username) {
    console.error('Name field cannot be empty');
    return;
  }
  playerElement = null;
  socket.send(JSON.stringify({ type: 'createSession', playerName: username }));
}

function joinSession() {
  const sessionCode = document.getElementById('sessionCodeInput').value;
  const username = document.getElementById('username').value;
  if (!sessionCode || !username) {
    console.error('Name field and session code cannot be empty');
    return;
  }
  socket.send(JSON.stringify({ type: 'joinSession', sessionCode, playerName: username }));
}

function navigateToGame() {
  const sessionCode = document.getElementById('sessionCode').innerText.replace('Session Code: ', '');
  window.location.href = `game.html?sessionCode=${sessionCode}`;
}

function showLobby(sessionCode) {
  // Hide the home screen and display the client lobby screen
  document.getElementById('home').style.display = 'none';
  document.getElementById('clientLobby').style.display = 'block';

  // Reset lobbyPlayers content
  const lobbyPlayers = document.getElementById('lobbyPlayers');
  lobbyPlayers.innerHTML = ''; // Clear lobbyPlayers div content

  // Display the session code
  document.getElementById('sessionCode').innerText = `Session Code: ${sessionCode}`;
}

function addPlayerToLobby(playerName) {
  document.getElementById('home').style.display = 'none';
  document.getElementById('clientLobby').style.display = 'block';
  const lobbyPlayers = document.getElementById('lobbyPlayers');
  const playerElement = document.createElement('p');
  playerElement.innerText = playerName;
  lobbyPlayers.appendChild(playerElement);
}

function updateLobby(players) {
  const lobbyPlayers = document.getElementById('lobbyPlayers');
  lobbyPlayers.innerHTML = ''; // Clear lobbyPlayers div content

  players.forEach((player) => {
    addPlayerToLobby(player.name);
  });
}