const socket = new WebSocket('ws://192.168.1.189:3000');

socket.addEventListener('open', (event) => {
  console.log('WebSocket connection established:', event);
});

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Received message:', data);
  handleMessage(data);
});

function handleMessage(data) {
  switch (data.type) {
    case 'sessionCreated':
      showLobby(data.sessionCode);
      break;
    case 'sessionJoined':
      showLobby(data.sessionCode);
      break;
    case 'updateLobby':
      updateLobby(data.players);
      break;
    case 'gameStarted':
      goToGamePage();
      break;
    case 'gameEnded':
      goToHomePage();
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

function startGame() {
  const sessionCode = document.getElementById('sessionCode').innerText.split(': ')[1];
  socket.send(JSON.stringify({ type: 'startGame', sessionCode }));
}

function endGame() {
  const sessionCode = document.getElementById('sessionCode').innerText.split(': ')[1];
  socket.send(JSON.stringify({ type: 'endGame', sessionCode }));
}

function joinTeam(team) {
  const sessionCode = document.getElementById('sessionCode').innerText.split(': ')[1];
  const username = document.getElementById('username').value;
  socket.send(JSON.stringify({ type: 'joinTeam', sessionCode, playerName: username, team }));
}

function leaveSession() {
  const sessionCode = document.getElementById('sessionCode').innerText.split(': ')[1];
  socket.send(JSON.stringify({ type: 'leaveSession', sessionCode }));
  goToHomePage();
}

function showLobby(sessionCode) {
  document.getElementById('home').style.display = 'none';
  document.getElementById('clientLobby').style.display = 'block';
  document.getElementById('sessionCode').innerText = `Session Code: ${sessionCode}`;
  updateLobby([]);
}

function updateLobby(players) {
  const lobbyPlayers = document.getElementById('lobbyPlayers');
  lobbyPlayers.innerHTML = ''; // Clear lobbyPlayers div content

  players.forEach((player) => {
    const playerElement = document.createElement('p');
    playerElement.innerText = `${player.name} - ${player.team ? player.team : 'No team'}`;
    lobbyPlayers.appendChild(playerElement);
  });

  const currentUser = players.find(p => p.name === document.getElementById('username').value);
  // Assuming hostControls exists in the lobby page
  const hostControls = document.getElementById('hostControls');
  if (currentUser && currentUser.isHost && hostControls) {
    hostControls.style.display = 'block';
  } else if (hostControls) {
    hostControls.style.display = 'none';
  }
}

function goToGamePage() {
  console.log('Navigating to game page...');
  document.getElementById('clientLobby').style.display = 'none';
  document.getElementById('gamePage').style.display = 'block';
}

function goToHomePage() {
  document.getElementById('clientLobby').style.display = 'none';
  document.getElementById('gamePage').style.display = 'none';
  document.getElementById('home').style.display = 'block';
}
