const urlParams = new URLSearchParams(window.location.search);
const sessionCode = urlParams.get('sessionCode');
const username = localStorage.getItem('username');
const socket = new WebSocket('ws://192.168.1.189:3000');

socket.addEventListener('open', (event) => {
  console.log('WebSocket connection established:', event);
  if (username && sessionCode) {
    socket.send(JSON.stringify({ type: 'joinSession', sessionCode, playerName: username }));
  }
});

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  handleMessage(data);
});

function handleMessage(data) {
  switch (data.type) {
    case 'updateLobby':
      updateLobby(data.players);
      break;
    case 'error':
      console.error(data.message);
      break;
  }
}

function joinTeam(team) {
  if (sessionCode && username) {
    socket.send(JSON.stringify({ type: 'joinTeam', sessionCode, playerName: username, team }));
  } else {
    console.error('Session code, player name, and team cannot be empty');
  }
}

function updateLobby(players) {
  const lobbyPlayers = document.getElementById('lobbyPlayers');
  lobbyPlayers.innerHTML = ''; // Clear lobbyPlayers div content

  players.forEach((player) => {
    const playerElement = document.createElement('p');
    playerElement.innerText = `${player.name} - Team ${player.team || 'None'}`;
    lobbyPlayers.appendChild(playerElement);
  });
}

function endGame() {
  window.location.href = 'index.html';
}
