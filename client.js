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
  localStorage.setItem('username', username);
  socket.send(JSON.stringify({ type: 'createSession', playerName: username }));
}

function joinSession() {
  const sessionCode = document.getElementById('sessionCodeInput').value;
  const username = document.getElementById('username').value;
  if (!sessionCode || !username) {
    console.error('Name field and session code cannot be empty');
    return;
  }
  localStorage.setItem('username', username);
  socket.send(JSON.stringify({ type: 'joinSession', sessionCode, playerName: username }));
}

function navigateToGame() {
  const sessionCode = document.getElementById('sessionCode').innerText.replace('Session Code: ', '');
  window.location.href = `game.html?sessionCode=${sessionCode}`;
}

function showLobby(sessionCode) {
  const homeElement = document.getElementById('home');
  const clientLobbyElement = document.getElementById('clientLobby');
  const sessionCodeElement = document.getElementById('sessionCode');
  const hostControlsElement = document.getElementById('hostControls');

  if (!homeElement || !clientLobbyElement || !sessionCodeElement || !hostControlsElement) {
    console.error('One or more elements not found in the DOM');
    return;
  }

  homeElement.style.display = 'none';
  clientLobbyElement.style.display = 'block';
  sessionCodeElement.innerText = `Session Code: ${sessionCode}`;
  updateLobby([]);
}

function updateLobby(players) {
  const lobbyPlayers = document.getElementById('lobbyPlayers');
  if (!lobbyPlayers) {
    console.error('Lobby players element not found');
    return;
  }

  lobbyPlayers.innerHTML = ''; // Clear lobbyPlayers div content

  players.forEach((player) => {
    const playerElement = document.createElement('p');
    playerElement.innerText = `${player.name} - ${player.team ? player.team : 'No team'}`;
    lobbyPlayers.appendChild(playerElement);
  });

  const currentUser = players.find(p => p.name === document.getElementById('username').value);
  const hostControlsElement = document.getElementById('hostControls');
  if (hostControlsElement) {
    hostControlsElement.style.display = currentUser && currentUser.isHost ? 'block' : 'none';
  }
}

function navigateToGame() {
  const clientLobbyElement = document.getElementById('clientLobby');
  const gamePageElement = document.getElementById('gamePage');

  if (!clientLobbyElement || !gamePageElement) {
    console.error('Client lobby or game page element not found');
    return;
  }

  clientLobbyElement.style.display = 'none';
  gamePageElement.style.display = 'block';
}

function goToHomePage() {
  const homeElement = document.getElementById('home');
  const clientLobbyElement = document.getElementById('clientLobby');
  const gamePageElement = document.getElementById('gamePage');

  if (!homeElement || !clientLobbyElement || !gamePageElement) {
    console.error('Home, client lobby, or game page element not found');
    return;
  }

  clientLobbyElement.style.display = 'none';
  gamePageElement.style.display = 'none';
  homeElement.style.display = 'block';
}
