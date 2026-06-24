'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
  '#9e9e9e', // N - tuerca (gris metálico)
];

const SKINS = {
  retro: {
    mode: 'retro',
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#90caf9', '#ffb74d', '#9e9e9e'],
  },
  neon: {
    mode: 'neon',
    colors: [null, '#00f0ff', '#fff700', '#ff00e6', '#39ff14', '#ff0033', '#00aaff', '#ff8c00', '#e0e0e0'],
  },
  pastel: {
    mode: 'pastel',
    colors: [null, '#b5ead7', '#fff1ba', '#e0bbe4', '#c7ceea', '#ffb7b2', '#a8d8ea', '#ffdac1', '#d6d6d6'],
  },
  pixel: {
    mode: 'pixel',
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#90caf9', '#ffb74d', '#9e9e9e'],
  },
};

let currentSkin = SKINS.retro;

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const pauseMenu = document.getElementById('pause-menu');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const showControlsBtn = document.getElementById('show-controls-btn');
const pauseControlsList = document.getElementById('pause-controls-list');
const startLevelSelect = document.getElementById('start-level-select');

const startOverlay = document.getElementById('start-overlay');
const playBtn = document.getElementById('play-btn');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const startLeaderboardEl = document.getElementById('start-leaderboard');
const startStatsEl = document.getElementById('start-stats');
const gameoverLeaderboardEl = document.getElementById('gameover-leaderboard');
const gameoverStatsEl = document.getElementById('gameover-stats');
const saveScoreForm = document.getElementById('save-score-form');
const playerNameInput = document.getElementById('player-name');
const saveScoreBtn = document.getElementById('save-score-btn');

const LEADERBOARD_KEY = 'tetris-leaderboard';
const STATS_KEY = 'tetris-stats';
const MAX_LEADERBOARD_ENTRIES = 5;

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, startLevel;
let combo, maxCombo;
let started = false;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    combo++;
    if (combo > maxCombo) maxCombo = combo;
    updateHUD();
  } else {
    combo = 0;
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const skin = currentSkin || SKINS.retro;
  const color = skin.colors[colorIndex] || COLORS[colorIndex];
  const px = x * size + 1;
  const py = y * size + 1;
  const w = size - 2;
  const h = size - 2;

  context.save();
  context.globalAlpha = alpha ?? 1;

  switch (skin.mode) {
    case 'neon':
      context.shadowColor = color;
      context.shadowBlur = size * 0.6;
      context.fillStyle = color;
      context.fillRect(px, py, w, h);
      // second pass for a stronger glow core
      context.shadowBlur = size * 0.3;
      context.fillRect(px, py, w, h);
      context.shadowBlur = 0;
      context.fillStyle = 'rgba(255,255,255,0.25)';
      context.fillRect(px, py, w, 4);
      break;

    case 'pastel': {
      const radius = Math.min(6, w / 3, h / 3);
      context.beginPath();
      context.moveTo(px + radius, py);
      context.arcTo(px + w, py, px + w, py + h, radius);
      context.arcTo(px + w, py + h, px, py + h, radius);
      context.arcTo(px, py + h, px, py, radius);
      context.arcTo(px, py, px + w, py, radius);
      context.closePath();
      context.fillStyle = color;
      context.fill();
      context.fillStyle = 'rgba(255,255,255,0.35)';
      context.beginPath();
      context.moveTo(px + radius, py);
      context.arcTo(px + w, py, px + w, py + h, radius);
      context.lineTo(px + w, py + 4);
      context.lineTo(px, py + 4);
      context.arcTo(px, py, px + w, py, radius);
      context.closePath();
      context.fill();
      break;
    }

    case 'pixel': {
      context.fillStyle = color;
      context.fillRect(px, py, w, h);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(px, py, w, 4);
      // checker sub-grid texture overlay
      const cell = Math.max(2, Math.floor(size / 6));
      for (let yy = py; yy < py + h; yy += cell) {
        for (let xx = px; xx < px + w; xx += cell) {
          const col = Math.floor((xx - px) / cell);
          const row = Math.floor((yy - py) / cell);
          const cw = Math.min(cell, px + w - xx);
          const ch = Math.min(cell, py + h - yy);
          context.fillStyle = (row + col) % 2 === 0
            ? 'rgba(0,0,0,0.10)'
            : 'rgba(255,255,255,0.08)';
          context.fillRect(xx, yy, cw, ch);
        }
      }
      break;
    }

    case 'retro':
    default:
      context.fillStyle = color;
      context.fillRect(px, py, w, h);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(px, py, w, 4);
      break;
  }

  context.restore();
}

function drawGrid() {
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--grid-line').trim();
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function getLeaderboard() {
  try {
    const raw = JSON.parse(localStorage.getItem(LEADERBOARD_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveLeaderboard(list) {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(list));
}

function getStats() {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY));
    return raw && typeof raw === 'object'
      ? { bestCombo: raw.bestCombo || 0, maxLines: raw.maxLines || 0 }
      : { bestCombo: 0, maxLines: 0 };
  } catch {
    return { bestCombo: 0, maxLines: 0 };
  }
}

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function addLeaderboardEntry(entry) {
  const list = getLeaderboard();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  list.length = Math.min(list.length, MAX_LEADERBOARD_ENTRIES);
  saveLeaderboard(list);
  return list;
}

function resetRecords() {
  localStorage.removeItem(LEADERBOARD_KEY);
  localStorage.removeItem(STATS_KEY);
}

function renderLeaderboard(containerEl, highlightEntry) {
  const list = getLeaderboard();
  containerEl.innerHTML = '';
  if (!list.length) {
    const empty = document.createElement('li');
    empty.className = 'leaderboard-empty';
    empty.textContent = 'Sin récords todavía';
    containerEl.appendChild(empty);
    return;
  }
  list.forEach((entry, i) => {
    const li = document.createElement('li');
    const isNew = !!highlightEntry &&
      entry.name === highlightEntry.name &&
      entry.score === highlightEntry.score &&
      entry.lines === highlightEntry.lines;
    if (isNew) li.classList.add('is-new');
    const rank = document.createElement('span');
    rank.className = 'lb-rank';
    rank.textContent = `${i + 1}.`;
    const name = document.createElement('span');
    name.className = 'lb-name';
    name.textContent = entry.name;
    const sc = document.createElement('span');
    sc.className = 'lb-score';
    sc.textContent = entry.score.toLocaleString();
    li.appendChild(rank);
    li.appendChild(name);
    li.appendChild(sc);
    containerEl.appendChild(li);
  });
}

function renderStats(containerEl) {
  const stats = getStats();
  containerEl.innerHTML = '';
  const comboSpan = document.createElement('div');
  comboSpan.innerHTML = `Mejor combo: <span>${stats.bestCombo}</span>`;
  const linesSpan = document.createElement('div');
  linesSpan.innerHTML = `Máx. líneas: <span>${stats.maxLines}</span>`;
  containerEl.appendChild(comboSpan);
  containerEl.appendChild(linesSpan);
}

function refreshLeaderboards(highlightEntry) {
  renderLeaderboard(startLeaderboardEl, highlightEntry);
  renderStats(startStatsEl);
  renderLeaderboard(gameoverLeaderboardEl, highlightEntry);
  renderStats(gameoverStatsEl);
}

function qualifiesForLeaderboard(candidateScore) {
  const list = getLeaderboard();
  if (list.length < MAX_LEADERBOARD_ENTRIES) return true;
  return candidateScore > list[list.length - 1].score;
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  pauseMenu.classList.add('hidden');
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  restartBtn.classList.remove('hidden');

  const stats = getStats();
  if (maxCombo > stats.bestCombo) stats.bestCombo = maxCombo;
  if (lines > stats.maxLines) stats.maxLines = lines;
  saveStats(stats);

  if (qualifiesForLeaderboard(score)) {
    saveScoreForm.classList.remove('hidden');
    playerNameInput.value = '';
  } else {
    saveScoreForm.classList.add('hidden');
  }

  refreshLeaderboards(null);
  overlay.classList.remove('hidden');
}

function openPauseMenu() {
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'PAUSA';
  overlayScore.textContent = '';
  restartBtn.classList.add('hidden');
  pauseControlsList.classList.add('hidden');
  saveScoreForm.classList.add('hidden');
  pauseMenu.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

function closePauseMenu() {
  pauseMenu.classList.add('hidden');
  overlay.classList.add('hidden');
  lastTime = performance.now();
  loop(lastTime);
}

function togglePause() {
  if (!started || gameOver) return;
  paused = !paused;
  if (!paused) {
    closePauseMenu();
  } else {
    openPauseMenu();
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  if (gameOver) return;
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  started = true;
  board = createBoard();
  score = 0;
  lines = 0;
  level = startLevel;
  paused = false;
  gameOver = false;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  combo = 0;
  maxCombo = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  pauseMenu.classList.add('hidden');
  restartBtn.classList.remove('hidden');
  saveScoreForm.classList.add('hidden');
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (!started || paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

startLevel = 1;

for (let lvl = 1; lvl <= 10; lvl++) {
  const opt = document.createElement('option');
  opt.value = lvl;
  opt.textContent = lvl;
  startLevelSelect.appendChild(opt);
}
startLevelSelect.value = String(startLevel);

startLevelSelect.addEventListener('change', () => {
  startLevel = Number(startLevelSelect.value);
});

resumeBtn.addEventListener('click', () => {
  if (!paused) return;
  paused = false;
  closePauseMenu();
});

pauseRestartBtn.addEventListener('click', () => {
  paused = false;
  init();
});

showControlsBtn.addEventListener('click', () => {
  pauseControlsList.classList.toggle('hidden');
});

playBtn.addEventListener('click', () => {
  startOverlay.classList.add('hidden');
  init();
});

resetRecordsBtn.addEventListener('click', () => {
  if (confirm('¿Seguro que quieres borrar todos los récords?')) {
    resetRecords();
    refreshLeaderboards(null);
  }
});

saveScoreBtn.addEventListener('click', () => {
  const name = playerNameInput.value.trim() || 'Anónimo';
  const entry = { name, score, lines };
  addLeaderboardEntry(entry);
  saveScoreForm.classList.add('hidden');
  refreshLeaderboards(entry);
});

const themeToggle = document.getElementById('theme-toggle');
const toggleIcon = themeToggle.querySelector('.toggle-icon');
const toggleLabel = themeToggle.querySelector('.toggle-label');

function applyTheme(isLight) {
  if (isLight) {
    document.body.classList.add('light-mode');
    toggleIcon.textContent = '☀';
    toggleLabel.textContent = 'DARK';
  } else {
    document.body.classList.remove('light-mode');
    toggleIcon.textContent = '☾';
    toggleLabel.textContent = 'LIGHT';
  }
}

const savedTheme = localStorage.getItem('tetris-theme');
applyTheme(savedTheme === 'light');

themeToggle.addEventListener('click', () => {
  const isLight = !document.body.classList.contains('light-mode');
  applyTheme(isLight);
  localStorage.setItem('tetris-theme', isLight ? 'light' : 'dark');
});

const skinSelect = document.getElementById('skin-select');

function applySkin(skinId) {
  const skin = SKINS[skinId] || SKINS.retro;
  currentSkin = skin;
  document.body.classList.remove('skin-retro', 'skin-neon', 'skin-pastel', 'skin-pixel');
  document.body.classList.add(`skin-${skin.mode}`);
  skinSelect.value = SKINS[skinId] ? skinId : 'retro';
  if (typeof current !== 'undefined' && current) draw();
  if (typeof next !== 'undefined' && next) drawNext();
}

const savedSkin = localStorage.getItem('tetris-skin');
applySkin(SKINS[savedSkin] ? savedSkin : 'retro');

skinSelect.addEventListener('change', () => {
  const skinId = SKINS[skinSelect.value] ? skinSelect.value : 'retro';
  localStorage.setItem('tetris-skin', skinId);
  applySkin(skinId);
});

refreshLeaderboards(null);
