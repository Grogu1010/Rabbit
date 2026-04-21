import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import {
  getDatabase,
  ref,
  get,
  onValue,
  set,
  update,
  push,
  serverTimestamp,
  runTransaction
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js';
import { buildPromptDeck, buildHostVoiceLibrary } from './content.js';

const firebaseConfig = window.RABBIT_FIREBASE_CONFIG || {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME.firebaseapp.com',
  databaseURL: 'https://REPLACE_ME-default-rtdb.firebaseio.com',
  projectId: 'REPLACE_ME',
  appId: 'REPLACE_ME'
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const deck = buildPromptDeck(150);
const hostVoice = buildHostVoiceLibrary();

const state = {
  role: null,
  roomCode: new URLSearchParams(location.search).get('room')?.toUpperCase() || '',
  playerId: localStorage.getItem('rabbitPlayerId') || crypto.randomUUID(),
  playerName: localStorage.getItem('rabbitPlayerName') || '',
  room: null
};
localStorage.setItem('rabbitPlayerId', state.playerId);

const lobbyScreen = document.querySelector('#lobby-screen');
const gameScreen = document.querySelector('#game-screen');

renderEntry();
if (state.roomCode) subscribeToRoom(state.roomCode);

function renderEntry() {
  lobbyScreen.innerHTML = `
    <h2>Enter The Answering Machine</h2>
    <div class="grid">
      <div>
        <label>Name</label>
        <input id="name" value="${state.playerName}" placeholder="Your chaos name" />
      </div>
      <div>
        <label>Room code</label>
        <input id="room" value="${state.roomCode}" placeholder="ABCD" maxlength="4" />
      </div>
    </div>
    <div class="row" style="margin-top:12px;">
      <button class="primary" id="host-btn">Host game</button>
      <button id="join-btn">Join game</button>
    </div>
    <p><small>Host creates a room. Everyone else joins on phones with the same URL.</small></p>
  `;

  document.querySelector('#host-btn').onclick = hostGame;
  document.querySelector('#join-btn').onclick = joinGame;
}

async function hostGame() {
  const name = readName();
  const roomCode = generateCode();
  state.role = 'host';
  state.roomCode = roomCode;
  state.playerName = name;
  const roomRef = ref(db, `rooms/${roomCode}`);
  await set(roomRef, {
    createdAt: Date.now(),
    hostId: state.playerId,
    phase: 'lobby',
    round: 1,
    hostLine: random(hostVoice.anyTime),
    deck,
    matchQueue: [],
    currentMatch: null,
    players: {
      [state.playerId]: playerObj(name)
    },
    scoreLog: []
  });
  history.replaceState({}, '', `?room=${roomCode}`);
  subscribeToRoom(roomCode);
}

async function joinGame() {
  const name = readName();
  const roomCode = document.querySelector('#room').value.trim().toUpperCase();
  if (!roomCode) return alert('Enter room code.');
  state.role = 'player';
  state.roomCode = roomCode;
  state.playerName = name;

  const playerRef = ref(db, `rooms/${roomCode}/players/${state.playerId}`);
  await set(playerRef, playerObj(name));
  history.replaceState({}, '', `?room=${roomCode}`);
  subscribeToRoom(roomCode);
}

function subscribeToRoom(code) {
  onValue(ref(db, `rooms/${code}`), (snap) => {
    state.room = snap.val();
    if (!state.room) {
      renderEntry();
      return;
    }
    render();
  });
}

function render() {
  lobbyScreen.classList.remove('hidden');
  gameScreen.classList.remove('hidden');
  const players = Object.entries(state.room.players || {});
  const me = state.room.players[state.playerId];
  const isHost = state.room.hostId === state.playerId;

  lobbyScreen.innerHTML = `
    <h2>Room <span class="pill">${state.roomCode}</span></h2>
    <p>${players.length} players connected.</p>
    <div class="qr-wrap" id="qr"></div>
    <div class="host-voice">Host: ${state.room.hostLine || ''}</div>
    <ul>${players.map(([, p]) => `<li>${p.name} — ${p.score || 0} pts</li>`).join('')}</ul>
    ${isHost && state.room.phase === 'lobby' ? '<button class="primary" id="start-btn">Start game</button>' : ''}
  `;

  renderQR();
  if (isHost && state.room.phase === 'lobby') document.querySelector('#start-btn').onclick = startGame;

  renderPhaseView(me, isHost);
}

function renderPhaseView(me, isHost) {
  const { phase, currentMatch, round } = state.room;
  if (phase === 'lobby') {
    gameScreen.innerHTML = '<h3>Waiting for host to begin…</h3>';
    return;
  }

  if (phase === 'finished') {
    gameScreen.innerHTML = `<h3>Game over 🎉</h3><p>Winner: <b>${state.room.winnerName}</b></p>`;
    return;
  }

  const myTurnToAnswer = currentMatch?.answerers?.includes(state.playerId);
  const canVote = phase === 'vote' && currentMatch && !currentMatch.answerers.includes(state.playerId);
  gameScreen.innerHTML = `
    <p class="pill">Round ${round}${round === 5 ? ' (Final)' : ''}</p>
    <h2>☎️ ${currentMatch?.prompt || 'Loading...'}</h2>
    <div id="timer">${currentMatch?.timeLeft || 0}s</div>
    ${phase === 'answer' && myTurnToAnswer ? `
      <textarea id="answer" rows="3" maxlength="180" placeholder="Answer before the beep..."></textarea>
      <button class="primary" id="send-answer">Send answer</button>
    ` : ''}
    ${phase === 'vote' ? `
      <div class="answer-grid">
        ${(currentMatch?.answers || []).map((a, i) => `<button class="answer-card" data-vote="${i}">${a.text || '(no answer)'}</button>`).join('')}
      </div>
      <p><small>${canVote ? 'Tap to vote.' : 'You cannot vote in your own matchup.'}</small></p>
    ` : ''}
    ${phase === 'reveal' ? `<p>Winner: <b>${currentMatch?.winnerName || 'TBD'}</b></p>` : ''}
    ${isHost ? '<button id="advance">Advance</button>' : ''}
  `;

  if (phase === 'answer' && myTurnToAnswer) {
    document.querySelector('#send-answer').onclick = submitAnswer;
  }
  if (phase === 'vote' && canVote) {
    [...document.querySelectorAll('[data-vote]')].forEach((btn) => {
      btn.onclick = () => submitVote(Number(btn.dataset.vote));
    });
  }
  if (isHost) {
    const adv = document.querySelector('#advance');
    if (adv) adv.onclick = hostAdvance;
  }
}

async function startGame() {
  const queue = buildRoundQueue(1, Object.keys(state.room.players));
  await update(ref(db, `rooms/${state.roomCode}`), {
    phase: 'answer',
    round: 1,
    matchQueue: queue,
    currentMatch: nextMatch(queue, state.room.deck),
    hostLine: chooseHostLine('any')
  });
}

function buildRoundQueue(round, players) {
  if (round === 5) {
    const topTwo = topPlayers(players, 2);
    return [{ answerers: topTwo, seenBy: [], votes: {}, answers: [] }];
  }
  const targets = Object.fromEntries(players.map((p) => [p, 2]));
  const queue = [];
  let guard = 0;
  while (Object.values(targets).some((n) => n > 0) && guard < 300) {
    const sorted = players
      .filter((p) => targets[p] > 0)
      .sort((a, b) => targets[b] - targets[a]);
    const a = sorted[0];
    const b = sorted.find((p) => p !== a && targets[p] > 0) || sorted[1];
    if (!a || !b) break;
    queue.push({ answerers: [a, b], seenBy: [], votes: {}, answers: [] });
    targets[a] -= 1;
    targets[b] -= 1;
    guard += 1;
  }
  return queue;
}

function nextMatch(queue, deckRef) {
  if (!queue.length) return null;
  const match = queue[0];
  return {
    ...match,
    prompt: deckRef[Math.floor(Math.random() * deckRef.length)],
    timeLeft: 15
  };
}

async function submitAnswer() {
  const text = document.querySelector('#answer').value.trim();
  if (!text) return;
  const matchRef = ref(db, `rooms/${state.roomCode}/currentMatch/answers`);
  const curr = state.room.currentMatch.answers || [];
  if (curr.find((a) => a.playerId === state.playerId)) return;
  await set(matchRef, [...curr, { playerId: state.playerId, text }]);
}

async function submitVote(index) {
  const voteRef = ref(db, `rooms/${state.roomCode}/currentMatch/votes/${state.playerId}`);
  await set(voteRef, index);
}

async function hostAdvance() {
  const room = state.room;
  if (room.phase === 'answer') {
    await update(ref(db, `rooms/${state.roomCode}`), { phase: 'vote', hostLine: chooseHostLine('any') });
    return;
  }
  if (room.phase === 'vote') {
    const winner = tally(room.currentMatch, room.players);
    const winnerPath = `rooms/${state.roomCode}/players/${winner.playerId}/score`;
    await runTransaction(ref(db, winnerPath), (s) => (s || 0) + winner.points);
    await update(ref(db, `rooms/${state.roomCode}`), {
      phase: 'reveal',
      currentMatch: { ...room.currentMatch, winnerName: winner.name },
      hostLine: chooseOutcomeLine(winner)
    });
    return;
  }
  if (room.phase === 'reveal') {
    const queue = [...room.matchQueue];
    queue.shift();
    if (queue.length > 0) {
      await update(ref(db, `rooms/${state.roomCode}`), {
        phase: 'answer',
        matchQueue: queue,
        currentMatch: nextMatch(queue, room.deck),
        hostLine: chooseHostLine('any')
      });
      return;
    }
    const nextRound = room.round + 1;
    if (nextRound <= 4) {
      const players = Object.keys(room.players);
      const nextQueue = buildRoundQueue(nextRound, players);
      await update(ref(db, `rooms/${state.roomCode}`), {
        round: nextRound,
        phase: 'answer',
        matchQueue: nextQueue,
        currentMatch: nextMatch(nextQueue, room.deck),
        hostLine: players.length === 3 ? random(hostVoice.playerCount[3]) : chooseHostLine('any')
      });
      return;
    }
    if (nextRound === 5) {
      const players = Object.keys(room.players);
      const finalQ = buildRoundQueue(5, players);
      await update(ref(db, `rooms/${state.roomCode}`), {
        round: 5,
        phase: 'answer',
        matchQueue: finalQ,
        currentMatch: nextMatch(finalQ, room.deck),
        hostLine: 'Final round. Top two enter, one ego leaves.'
      });
      return;
    }
    const ranked = Object.values(room.players).sort((a, b) => (b.score || 0) - (a.score || 0));
    await update(ref(db, `rooms/${state.roomCode}`), {
      phase: 'finished',
      winnerName: ranked[0]?.name || 'Nobody'
    });
  }
}

function chooseHostLine(type) {
  if (type === 'any') return random(hostVoice.anyTime);
  return random(hostVoice.anyTime);
}

function chooseOutcomeLine(winner) {
  const players = Object.values(state.room.players || {});
  const top = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  const leader = top[0];
  const second = top[1];
  if (leader && second && (leader.score || 0) - (second.score || 0) >= 6) return random(hostVoice.comeback).replace('{name}', winner.name);
  const streak = winner.streak || 0;
  if (streak >= 3) return random(hostVoice.streak).replace('{name}', winner.name);
  const perfect = top.every((p, idx) => idx === 0 || (p.score || 0) === 0);
  if (perfect) return random(hostVoice.perfect).replace('{name}', winner.name);
  return chooseHostLine('any');
}

function tally(match, playersMap) {
  const votes = Object.values(match.votes || {});
  const c0 = votes.filter((v) => v === 0).length;
  const c1 = votes.filter((v) => v === 1).length;
  const winIndex = c0 >= c1 ? 0 : 1;
  const winner = match.answers?.[winIndex];
  const player = playersMap[winner?.playerId] || { name: 'Unknown' };
  return { playerId: winner?.playerId, name: player.name, points: Math.max(c0, c1) || 1 };
}

function topPlayers(players, n) {
  return [...players]
    .sort((a, b) => ((state.room.players[b]?.score || 0) - (state.room.players[a]?.score || 0)))
    .slice(0, n);
}

function playerObj(name) {
  return {
    name,
    score: 0,
    wins: 0,
    joinedAt: Date.now(),
    lastSeen: serverTimestamp()
  };
}

function readName() {
  const name = document.querySelector('#name').value.trim() || `Player-${Math.floor(Math.random() * 99)}`;
  localStorage.setItem('rabbitPlayerName', name);
  return name;
}

function generateCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function renderQR() {
  if (!window.QRCode) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.onload = drawQR;
    document.body.append(script);
  } else drawQR();
}

function drawQR() {
  const mount = document.querySelector('#qr');
  if (!mount) return;
  mount.innerHTML = '';
  const joinUrl = `${location.origin}${location.pathname}?room=${state.roomCode}`;
  new window.QRCode(mount, { text: joinUrl, width: 140, height: 140 });
}

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
