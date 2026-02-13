import { sdk } from 'https://esm.sh/@farcaster/frame-sdk';

// Farcaster SDK hazır
sdk.actions.ready();

// Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const scoreDisplay = document.getElementById('score-display');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const restartBtn = document.getElementById('restart-btn');

// Oyun sabitleri
const GRAVITY = 0.45;
const JUMP_FORCE = -7.5;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const PIPE_SPEED = 2.5;
const PIPE_SPAWN_INTERVAL = 1800;
const GROUND_HEIGHT = 80;

// Oyun durumu
let bird, pipes, score, bestScore, gameState, lastPipeTime, bgOffset;

// Renkler
const SKY_TOP = '#4EC0CA';
const SKY_BOTTOM = '#71C8D4';
const GROUND_COLOR = '#DED895';
const GROUND_DARK = '#DAD085';
const PIPE_COLOR = '#73BF2E';
const PIPE_DARK = '#5A9E1F';
const PIPE_LIP = '#8AD841';
const BIRD_BODY = '#F5C842';
const BIRD_WING = '#E8A028';
const BIRD_EYE = '#fff';
const BIRD_PUPIL = '#000';
const BIRD_BEAK = '#E84545';

bestScore = parseInt(localStorage.getItem('flappy_best') || '0');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function init() {
  bird = {
    x: canvas.width * 0.25,
    y: canvas.height * 0.4,
    w: 38,
    h: 28,
    vy: 0,
    rotation: 0,
    flapFrame: 0
  };
  pipes = [];
  score = 0;
  bgOffset = 0;
  lastPipeTime = 0;
  scoreDisplay.textContent = '0';
  gameOverScreen.classList.add('hidden');
  startScreen.style.display = 'flex';
  gameState = 'idle'; // idle, playing, dead
}

function jump() {
  if (gameState === 'idle') {
    gameState = 'playing';
    startScreen.style.display = 'none';
    bird.vy = JUMP_FORCE;
    lastPipeTime = performance.now();
    return;
  }
  if (gameState === 'playing') {
    bird.vy = JUMP_FORCE;
    bird.flapFrame = 6;
  }
}

function spawnPipe() {
  const minY = 80;
  const maxY = canvas.height - GROUND_HEIGHT - PIPE_GAP - 80;
  const topHeight = minY + Math.random() * (maxY - minY);
  pipes.push({
    x: canvas.width + 10,
    topH: topHeight,
    scored: false
  });
}

function update(dt, now) {
  if (gameState !== 'playing') return;

  // Kuş fiziği
  bird.vy += GRAVITY;
  bird.y += bird.vy;
  bird.rotation = Math.min(Math.max(bird.vy * 3, -30), 70);
  if (bird.flapFrame > 0) bird.flapFrame--;

  // Arka plan kaydırma
  bgOffset = (bgOffset + PIPE_SPEED * 0.5) % 24;

  // Boru oluşturma
  if (now - lastPipeTime > PIPE_SPAWN_INTERVAL) {
    spawnPipe();
    lastPipeTime = now;
  }

  // Boru hareketi
  for (let i = pipes.length - 1; i >= 0; i--) {
    pipes[i].x -= PIPE_SPEED;

    // Skor
    if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < bird.x) {
      pipes[i].scored = true;
      score++;
      scoreDisplay.textContent = score;
    }

    // Ekran dışı
    if (pipes[i].x + PIPE_WIDTH < -10) {
      pipes.splice(i, 1);
    }
  }

  // Çarpışma - zemin
  if (bird.y + bird.h / 2 > canvas.height - GROUND_HEIGHT) {
    die();
    return;
  }

  // Çarpışma - tavan
  if (bird.y - bird.h / 2 < 0) {
    bird.y = bird.h / 2;
    bird.vy = 0;
  }

  // Çarpışma - borular
  const bx = bird.x - bird.w / 2;
  const by = bird.y - bird.h / 2;
  const bw = bird.w;
  const bh = bird.h;
  const margin = 4; // küçük tolerans

  for (const pipe of pipes) {
    const px = pipe.x;
    const pw = PIPE_WIDTH;
    const topBottom = pipe.topH;
    const botTop = pipe.topH + PIPE_GAP;

    if (bx + bw - margin > px && bx + margin < px + pw) {
      if (by + margin < topBottom || by + bh - margin > botTop) {
        die();
        return;
      }
    }
  }
}

function die() {
  gameState = 'dead';
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('flappy_best', bestScore);
  }
  finalScoreEl.textContent = score;
  bestScoreEl.textContent = bestScore;
  gameOverScreen.classList.remove('hidden');
}

function drawBackground() {
  // Gökyüzü gradyan
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height - GROUND_HEIGHT);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(1, SKY_BOTTOM);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height - GROUND_HEIGHT);

  // Bulutlar
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  const cloudPositions = [
    { x: 80, y: 80, w: 100, h: 30 },
    { x: 300, y: 120, w: 80, h: 24 },
    { x: 500, y: 60, w: 120, h: 32 },
    { x: 200, y: 200, w: 90, h: 26 }
  ];
  for (const c of cloudPositions) {
    const cx = ((c.x - bgOffset * 2) % (canvas.width + 200)) - 50;
    ctx.beginPath();
    ctx.ellipse(cx, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround() {
  const gY = canvas.height - GROUND_HEIGHT;

  // Zemin
  ctx.fillStyle = GROUND_COLOR;
  ctx.fillRect(0, gY, canvas.width, GROUND_HEIGHT);

  // Zemin çizgileri
  ctx.fillStyle = GROUND_DARK;
  ctx.fillRect(0, gY, canvas.width, 4);

  // Çim deseni
  for (let x = -bgOffset; x < canvas.width + 24; x += 24) {
    ctx.fillStyle = '#A8C256';
    ctx.beginPath();
    ctx.moveTo(x, gY);
    ctx.lineTo(x + 12, gY - 10);
    ctx.lineTo(x + 24, gY);
    ctx.fill();
  }
}

function drawPipe(x, topH) {
  const lipW = 8;
  const lipH = 26;
  const botY = topH + PIPE_GAP;

  // Üst boru gövde
  ctx.fillStyle = PIPE_COLOR;
  ctx.fillRect(x, 0, PIPE_WIDTH, topH);
  ctx.fillStyle = PIPE_DARK;
  ctx.fillRect(x, 0, 6, topH);
  ctx.fillRect(x + PIPE_WIDTH - 6, 0, 6, topH);

  // Üst boru dudak
  ctx.fillStyle = PIPE_LIP;
  ctx.fillRect(x - lipW, topH - lipH, PIPE_WIDTH + lipW * 2, lipH);
  ctx.fillStyle = PIPE_DARK;
  ctx.fillRect(x - lipW, topH - lipH, PIPE_WIDTH + lipW * 2, 4);
  ctx.fillRect(x - lipW, topH - 4, PIPE_WIDTH + lipW * 2, 4);

  // Alt boru gövde
  const botH = canvas.height - GROUND_HEIGHT - botY;
  ctx.fillStyle = PIPE_COLOR;
  ctx.fillRect(x, botY, PIPE_WIDTH, botH);
  ctx.fillStyle = PIPE_DARK;
  ctx.fillRect(x, botY, 6, botH);
  ctx.fillRect(x + PIPE_WIDTH - 6, botY, 6, botH);

  // Alt boru dudak
  ctx.fillStyle = PIPE_LIP;
  ctx.fillRect(x - lipW, botY, PIPE_WIDTH + lipW * 2, lipH);
  ctx.fillStyle = PIPE_DARK;
  ctx.fillRect(x - lipW, botY, PIPE_WIDTH + lipW * 2, 4);
  ctx.fillRect(x - lipW, botY + lipH - 4, PIPE_WIDTH + lipW * 2, 4);
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate((bird.rotation * Math.PI) / 180);

  // Gövde
  ctx.fillStyle = BIRD_BODY;
  ctx.beginPath();
  ctx.ellipse(0, 0, bird.w / 2, bird.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Kanat
  ctx.fillStyle = BIRD_WING;
  const wingY = bird.flapFrame > 0 ? -8 : 2;
  ctx.beginPath();
  ctx.ellipse(-4, wingY, 12, 7, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Göz (beyaz)
  ctx.fillStyle = BIRD_EYE;
  ctx.beginPath();
  ctx.arc(10, -6, 7, 0, Math.PI * 2);
  ctx.fill();

  // Göz bebeği
  ctx.fillStyle = BIRD_PUPIL;
  ctx.beginPath();
  ctx.arc(12, -5, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Gaga
  ctx.fillStyle = BIRD_BEAK;
  ctx.beginPath();
  ctx.moveTo(16, -1);
  ctx.lineTo(26, 3);
  ctx.lineTo(16, 7);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  for (const pipe of pipes) {
    drawPipe(pipe.x, pipe.topH);
  }

  drawGround();
  drawBird();
}

// Idle animasyon
let idleAngle = 0;
function idleAnimation() {
  idleAngle += 0.04;
  bird.y = canvas.height * 0.4 + Math.sin(idleAngle) * 12;
}

// Oyun döngüsü
let lastTime = 0;
function gameLoop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  if (gameState === 'idle') {
    idleAnimation();
  }

  update(dt, timestamp);
  draw();
  requestAnimationFrame(gameLoop);
}

// Kontroller
function handleInput(e) {
  e.preventDefault();
  if (gameState === 'dead') return;
  jump();
}

canvas.addEventListener('touchstart', handleInput, { passive: false });
canvas.addEventListener('mousedown', handleInput);
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (gameState === 'dead') return;
    jump();
  }
});

restartBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  init();
});

restartBtn.addEventListener('touchstart', (e) => {
  e.stopPropagation();
});

// Başlat
init();
requestAnimationFrame(gameLoop);
