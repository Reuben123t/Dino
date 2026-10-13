// --- Web Audio API Synth Sound Effects ---
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playJump() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.12);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playScoreMilestone() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.12, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.11);
    });
  }

  playHit() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.28);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

const sounds = new SoundManager();

// --- Game Logic & Rendering ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const highScoreEl = document.getElementById('highScore');
const currentScoreEl = document.getElementById('currentScore');
const speedValEl = document.getElementById('speedVal');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreEl = document.getElementById('finalScore');
const newRecordBadge = document.getElementById('newRecordBadge');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const soundBtn = document.getElementById('soundBtn');

// Saved Highscore
let highScore = parseInt(localStorage.getItem('cyber_dino_highscore') || '0', 10);
highScoreEl.textContent = String(highScore).padStart(5, '0');

// Environment & Ground Constants
const GROUND_Y = 270;
let baseSpeed = 6;
let currentSpeed = baseSpeed;
let score = 0;
let lastMilestone = 0;
let isPlaying = false;
let isGameOver = false;
let animationFrameId = null;

// Dynamic Background Elements
let stars = [];
for (let i = 0; i < 40; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * (GROUND_Y - 40),
    size: Math.random() * 2 + 1,
    speed: Math.random() * 0.8 + 0.2,
    alpha: Math.random() * 0.7 + 0.3
  });
}

// Dino State
const dino = {
  x: 70,
  y: GROUND_Y - 56,
  width: 48,
  height: 56,
  normalHeight: 56,
  duckHeight: 34,
  velocityY: 0,
  gravity: 0.72,
  jumpStrength: -14.5,
  isGrounded: true,
  isDucking: false,
  legAnim: 0,
  color: '#00f0ff',
  glowColor: 'rgba(0, 240, 255, 0.7)',

  jump() {
    if (this.isGrounded && !this.isDucking) {
      this.velocityY = this.jumpStrength;
      this.isGrounded = false;
      sounds.playJump();
      createParticles(this.x + this.width / 2, this.y + this.height, '#00f0ff', 6);
    }
  },

  duck(state) {
    if (this.isDucking === state) return;
    this.isDucking = state;
    if (state) {
      this.height = this.duckHeight;
      this.y = GROUND_Y - this.height;
      if (!this.isGrounded) {
        // Fast drop
        this.velocityY += 7;
      }
    } else {
      this.height = this.normalHeight;
      this.y = GROUND_Y - this.height;
    }
  },

  update() {
    // Physics
    this.y += this.velocityY;
    this.velocityY += this.gravity;

    if (this.y >= GROUND_Y - this.height) {
      this.y = GROUND_Y - this.height;
      this.velocityY = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    if (this.isGrounded) {
      this.legAnim += 0.25 * (currentSpeed / 6);
    }
  },

  draw() {
    ctx.save();
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 12;

    const x = this.x;
    const y = this.y;
    const w = this.width;
    const h = this.height;

    if (!this.isDucking) {
      // Body (Cybernetic Rex)
      ctx.fillStyle = '#00f0ff';
      // Head
      ctx.fillRect(x + 18, y, 26, 20);
      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 36, y + 4, 6, 4);
      // Cyber Jaw
      ctx.fillStyle = '#0084ff';
      ctx.fillRect(x + 28, y + 15, 16, 5);

      // Torso
      ctx.fillStyle = '#00c3ff';
      ctx.fillRect(x + 10, y + 18, 22, 24);

      // Tail
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(x, y + 26, 12, 10);
      ctx.fillRect(x - 6, y + 22, 8, 8);

      // Hands
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(x + 30, y + 25, 7, 4);

      // Glowing Core
      ctx.fillStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 15;
      ctx.fillRect(x + 16, y + 24, 7, 7);

      // Legs / Running cycle
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur = 10;
      const legStep = Math.sin(this.legAnim) > 0;
      if (this.isGrounded) {
        if (legStep) {
          ctx.fillRect(x + 12, y + 42, 6, 14);
          ctx.fillRect(x + 22, y + 42, 6, 8);
        } else {
          ctx.fillRect(x + 12, y + 42, 6, 8);
          ctx.fillRect(x + 22, y + 42, 6, 14);
        }
      } else {
        // In air
        ctx.fillRect(x + 12, y + 42, 6, 10);
        ctx.fillRect(x + 22, y + 40, 6, 8);
      }
    } else {
      // Ducking Dino
      ctx.fillStyle = '#00f0ff';
      // Low head & body
      ctx.fillRect(x + 18, y + 6, 30, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 42, y + 8, 5, 4); // Eye
      ctx.fillStyle = '#00c3ff';
      ctx.fillRect(x, y + 12, 22, 14); // Torso & Tail
      
      // Core
      ctx.fillStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 12;
      ctx.fillRect(x + 18, y + 14, 6, 6);

      // Duck legs
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur = 8;
      const legStep = Math.sin(this.legAnim) > 0;
      ctx.fillRect(x + 12, y + 26, 7, 8);
      ctx.fillRect(x + 24, y + (legStep ? 28 : 25), 7, 7);
    }

    ctx.restore();
  },

  getBounds() {
    // Precise hit box slightly smaller than outer sprite
    const paddingX = 6;
    const paddingTop = 4;
    return {
      x: this.x + paddingX,
      y: this.y + paddingTop,
      width: this.width - paddingX * 2,
      height: this.height - paddingTop
    };
  }
};

// Obstacles & Birds
let obstacles = [];
let nextObstacleDistance = 0;

function createObstacle() {
  const typeRand = Math.random();
  // 0: Small Cactus, 1: Double Cactus, 2: Cyber Drone/Pterodactyl
  if (typeRand > 0.65 && score > 150) {
    // Flying Drone
    const flyingHeights = [GROUND_Y - 45, GROUND_Y - 78];
    const altitude = flyingHeights[Math.floor(Math.random() * flyingHeights.length)];
    obstacles.push({
      type: 'drone',
      x: canvas.width + 20,
      y: altitude,
      width: 36,
      height: 24,
      frame: 0
    });
  } else if (typeRand > 0.35) {
    // Double Cactus
    obstacles.push({
      type: 'cactus_double',
      x: canvas.width + 20,
      y: GROUND_Y - 48,
      width: 38,
      height: 48
    });
  } else {
    // Single Cactus
    obstacles.push({
      type: 'cactus_single',
      x: canvas.width + 20,
      y: GROUND_Y - 42,
      width: 22,
      height: 42
    });
  }

  // Calculate random gap based on current speed
  nextObstacleDistance = Math.floor(Math.random() * 240 + 260) + currentSpeed * 10;
}

// Particle System (Sparkles / Death explosion / Dust)
let particles = [];
function createParticles(x, y, color, count = 8, speedMult = 1) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6 * speedMult,
      vy: (Math.random() - 0.5) * 6 * speedMult,
      size: Math.random() * 3 + 1.5,
      color,
      alpha: 1,
      decay: Math.random() * 0.03 + 0.02
    });
  }
}

function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;

    if (p.alpha <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.restore();
  }
}

// Ground Grid & Lines
let groundOffset = 0;
function drawCyberGround() {
  groundOffset = (groundOffset + currentSpeed) % 40;

  ctx.save();
  // Neon ground horizon line
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(canvas.width, GROUND_Y);
  ctx.stroke();

  // Perspective vertical grid dashes
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;

  for (let x = -groundOffset; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x - 20, canvas.height);
    ctx.stroke();
  }

  // Horizontal sub-lines
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + 16);
  ctx.lineTo(canvas.width, GROUND_Y + 16);
  ctx.moveTo(0, GROUND_Y + 34);
  ctx.lineTo(canvas.width, GROUND_Y + 34);
  ctx.stroke();

  ctx.restore();
}

// Draw Background Stars & Mountain Grid
function drawCyberBackground() {
  ctx.save();
  // Stars
  stars.forEach(s => {
    s.x -= s.speed * (currentSpeed / 6);
    if (s.x < 0) s.x = canvas.width;
    ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  });

  // Distant glowing neon sun/moon
  const grad = ctx.createRadialGradient(canvas.width - 120, 80, 10, canvas.width - 120, 80, 70);
  grad.addColorStop(0, 'rgba(255, 0, 127, 0.9)');
  grad.addColorStop(0.5, 'rgba(128, 0, 255, 0.4)');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(canvas.width - 120, 80, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Draw single obstacle
function drawObstacle(obs) {
  ctx.save();
  if (obs.type.startsWith('cactus')) {
    ctx.fillStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 12;

    if (obs.type === 'cactus_single') {
      // Stem
      ctx.fillRect(obs.x + 6, obs.y, 10, obs.height);
      // Left arm
      ctx.fillRect(obs.x, obs.y + 12, 6, 14);
      ctx.fillRect(obs.x, obs.y + 12, 8, 5);
      // Right arm
      ctx.fillRect(obs.x + 16, obs.y + 8, 6, 16);
      ctx.fillRect(obs.x + 12, obs.y + 19, 6, 5);
    } else {
      // Double Cactus
      ctx.fillRect(obs.x + 4, obs.y, 11, obs.height);
      ctx.fillRect(obs.x + 21, obs.y + 8, 11, obs.height - 8);
      // Crossbars
      ctx.fillRect(obs.x, obs.y + 16, 6, 12);
      ctx.fillRect(obs.x + 31, obs.y + 14, 7, 12);
    }
  } else if (obs.type === 'drone') {
    // Cyber Flying Drone / Pterodactyl
    obs.frame = (obs.frame || 0) + 0.15;
    const wingOffset = Math.sin(obs.frame) * 8;

    ctx.fillStyle = '#ffaa00';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 14;

    // Body
    ctx.fillRect(obs.x + 8, obs.y + 6, 18, 10);
    // Head & Scanner
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(obs.x, obs.y + 8, 8, 6);

    // Wings
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.moveTo(obs.x + 14, obs.y + 6);
    ctx.lineTo(obs.x + 22, obs.y - 6 + wingOffset);
    ctx.lineTo(obs.x + 28, obs.y + 6);
    ctx.fill();

    // Thruster trail
    createParticles(obs.x + 26, obs.y + 10, '#ffaa00', 1, 0.4);
  }
  ctx.restore();
}

// Collision Detection (AABB)
function checkCollision(boxA, boxB) {
  return (
    boxA.x < boxB.x + boxB.width &&
    boxA.x + boxA.width > boxB.x &&
    boxA.y < boxB.y + boxB.height &&
    boxA.y + boxA.height > boxB.y
  );
}

// Reset Game
function resetGame() {
  score = 0;
  lastMilestone = 0;
  currentSpeed = baseSpeed;
  obstacles = [];
  particles = [];
  nextObstacleDistance = 180;
  dino.y = GROUND_Y - dino.normalHeight;
  dino.velocityY = 0;
  dino.isGrounded = true;
  dino.duck(false);
  isGameOver = false;

  currentScoreEl.textContent = '00000';
  speedValEl.textContent = '1.0x';
  gameOverOverlay.classList.remove('active');
  startOverlay.classList.remove('active');
}

// Game Over handler
function triggerGameOver() {
  isGameOver = true;
  isPlaying = false;
  sounds.playHit();

  // Burst of cyber sparks
  createParticles(dino.x + dino.width / 2, dino.y + dino.height / 2, '#00f0ff', 25, 2.5);
  createParticles(dino.x + dino.width / 2, dino.y + dino.height / 2, '#ff007f', 20, 2);

  finalScoreEl.textContent = Math.floor(score);

  if (Math.floor(score) > highScore) {
    highScore = Math.floor(score);
    localStorage.setItem('cyber_dino_highscore', highScore);
    highScoreEl.textContent = String(highScore).padStart(5, '0');
    newRecordBadge.style.display = 'block';
  } else {
    newRecordBadge.style.display = 'none';
  }

  gameOverOverlay.classList.add('active');
}

// Main Game Loop
function gameLoop() {
  // Clear screen
  ctx.fillStyle = '#080a14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Background scenery
  drawCyberBackground();
  drawCyberGround();

  if (isPlaying) {
    // Increment Score & Speed
    score += 0.15 * (currentSpeed / 6);
    currentScoreEl.textContent = String(Math.floor(score)).padStart(5, '0');

    // Gradually speed up
    currentSpeed = baseSpeed + Math.min(Math.floor(score / 100) * 0.45, 12);
    speedValEl.textContent = (currentSpeed / baseSpeed).toFixed(1) + 'x';

    // Milestone sound every 100 points
    if (Math.floor(score / 100) > lastMilestone) {
      lastMilestone = Math.floor(score / 100);
      sounds.playScoreMilestone();
    }

    // Spawn Obstacles
    nextObstacleDistance -= currentSpeed;
    if (nextObstacleDistance <= 0) {
      createObstacle();
    }

    // Update Dino
    dino.update();

    // Update & check Obstacles
    const dinoBox = dino.getBounds();
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= currentSpeed;

      // Draw obstacle
      drawObstacle(obs);

      // Hitbox
      const obsBox = {
        x: obs.x + 4,
        y: obs.y + 4,
        width: obs.width - 8,
        height: obs.height - 4
      };

      if (checkCollision(dinoBox, obsBox)) {
        triggerGameOver();
        break;
      }

      // Remove out of screen
      if (obs.x + obs.width < -50) {
        obstacles.splice(i, 1);
      }
    }
  }

  // Draw Dino & particles even when game over or paused
  dino.draw();
  updateAndDrawParticles();

  animationFrameId = requestAnimationFrame(gameLoop);
}

// Controls & Event Listeners
function handleJumpAction() {
  if (!isPlaying) {
    if (startOverlay.classList.contains('active') || isGameOver) {
      resetGame();
      isPlaying = true;
    }
  } else {
    dino.jump();
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    handleJumpAction();
  } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
    e.preventDefault();
    if (isPlaying) {
      dino.duck(true);
    }
  } else if (e.code === 'KeyM') {
    const isMuted = sounds.toggleMute();
    soundBtn.textContent = isMuted ? '🔇' : '🔊';
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown' || e.code === 'KeyS') {
    dino.duck(false);
  }
});

// Canvas click / touch for mobile & mouse
canvas.addEventListener('mousedown', (e) => {
  e.preventDefault();
  handleJumpAction();
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  handleJumpAction();
}, { passive: false });

startBtn.addEventListener('click', () => {
  sounds.init();
  resetGame();
  isPlaying = true;
});

restartBtn.addEventListener('click', () => {
  sounds.init();
  resetGame();
  isPlaying = true;
});

soundBtn.addEventListener('click', () => {
  sounds.init();
  const isMuted = sounds.toggleMute();
  soundBtn.textContent = isMuted ? '🔇' : '🔊';
});

// Initial start loop
gameLoop();
