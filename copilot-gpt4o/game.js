const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const dog = { x: canvas.width / 2, y: canvas.height / 2, radius: 10 };
const sheep = [];
const numSheep = 50;
const pen = { x: canvas.width - 100, y: canvas.height - 100, width: 100, height: 100 };
let score = 0;
let gameOver = false;
let gameWon = false;
let timer = 60; // 60 seconds to herd the sheep

const obstacles = [
  { x: 200, y: 200, width: 50, height: 50 },
  { x: 400, y: 300, width: 100, height: 100 }
];

let level = 1;
const maxLevels = 10;
const wolves = [];

function init() {
  const startX = canvas.width / 4;
  const startY = canvas.height / 4;
  const spread = 50;

  for (let i = 0; i < numSheep; i++) {
    sheep.push({
      x: startX + Math.random() * spread,
      y: startY + Math.random() * spread,
      radius: 5,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2
    });
  }
  if (level > 1) {
    for (let i = 0; i < level - 1; i++) {
      wolves.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 10,
        vx: 0,
        vy: 0
      });
    }
  }

  // Place obstacles at random locations
  obstacles.length = 0;
  for (let i = 0; i < level + 1; i++) {
    obstacles.push({
      x: Math.random() * (canvas.width - 100),
      y: Math.random() * (canvas.height - 100),
      width: 50 + Math.random() * 50,
      height: 50 + Math.random() * 50
    });
  }

  setInterval(update, 1000 / 60);
  setInterval(() => {
    if (timer > 0) timer--;
    else gameOver = true;
  }, 1000);
}

function update() {
  if (gameOver || gameWon) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'green';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawDog();
  drawSheep();
  drawPen();
  drawObstacles();
  drawWolves();
  drawUI();
  updateSheep();
  updateWolves();
  checkWin();
}

function drawDog() {
  ctx.beginPath();
  ctx.arc(dog.x, dog.y, dog.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'brown';
  ctx.fill();
  ctx.closePath();
}

function drawSheep() {
  sheep.forEach(s => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  });
}

function drawPen() {
  ctx.beginPath();
  ctx.rect(pen.x, pen.y, pen.width, pen.height);
  ctx.strokeStyle = 'black';
  ctx.stroke();
  ctx.closePath();
}

function drawObstacles() {
  obstacles.forEach(obstacle => {
    ctx.beginPath();
    ctx.rect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    ctx.fillStyle = 'gray';
    ctx.fill();
    ctx.closePath();
  });
}

function drawWolves() {
  wolves.forEach(wolf => {
    ctx.beginPath();
    ctx.arc(wolf.x, wolf.y, wolf.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'black';
    ctx.fill();
    ctx.closePath();
  });
}

function drawUI() {
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  ctx.fillText(`Score: ${score}`, 10, 30);
  ctx.fillText(`Time: ${timer}`, 10, 60);
}

function checkWin() {
  let sheepInPen = 0;
  sheep.forEach(s => {
    if (s.x > pen.x && s.x < pen.x + pen.width && s.y > pen.y && s.y < pen.y + pen.height) {
      if (!s.inPen) {
        sheepInPen++;
        // Sheep remain in the pen at a random location and do not move
        s.vx = 0;
        s.vy = 0;
        s.x = pen.x + Math.random() * pen.width;
        s.y = pen.y + Math.random() * pen.height;
        s.inPen = true;
      }
    }
  });
  score = sheepInPen;
  if (sheepInPen >= numSheep) {
    gameWon = true;
    if (level < maxLevels) {
      level++;
      alert('You win! Click to proceed to the next level.');
      resetGame();
    } else {
      alert('Congratulations! You have completed all levels!');
    }
  }
}

function resetGame() {
  gameWon = false;
  score = 0;
  timer = 60;
  sheep.length = 0;
  wolves.length = 0;
  init();
}

function updateSheep() {
  sheep.forEach(s => {
    if (s.inPen) return; // Skip sheep that are in the pen

    // Flocking behavior
    let separation = { x: 0, y: 0 };
    let alignment = { x: 0, y: 0 };
    let cohesion = { x: 0, y: 0 };
    let count = 0;

    sheep.forEach(other => {
      if (s !== other) {
        const dx = other.x - s.x;
        const dy = other.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 50) {
          // Separation
          if (dist < 20) {
            separation.x -= dx;
            separation.y -= dy;
          }
          // Alignment
          alignment.x += other.vx;
          alignment.y += other.vy;
          // Cohesion
          cohesion.x += other.x;
          cohesion.y += other.y;
          count++;
        }
      }
    });

    if (count > 0) {
      // Average the values
      separation.x /= count;
      separation.y /= count;
      alignment.x /= count;
      alignment.y /= count;
      cohesion.x /= count;
      cohesion.y /= count;

      // Cohesion - steer towards the average position
      cohesion.x = (cohesion.x - s.x) / 50; // Increased cohesion factor
      cohesion.y = (cohesion.y - s.y) / 50; // Increased cohesion factor
    }

    // Avoid the shepherd (dog)
    const dxDog = s.x - dog.x;
    const dyDog = s.y - dog.y;
    const distDog = Math.sqrt(dxDog * dxDog + dyDog * dyDog);
    if (distDog < 100) {
      separation.x += dxDog / distDog * 2;
      separation.y += dyDog / distDog * 2;
    }

    // Apply the behaviors
    s.vx += separation.x * 0.05 + alignment.x * 0.05 + cohesion.x * 0.02;
    s.vy += separation.y * 0.05 + alignment.y * 0.05 + cohesion.y * 0.02;

    // Limit speed
    const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
    const maxSpeed = 2;
    if (speed > maxSpeed) {
      s.vx = (s.vx / speed) * maxSpeed;
      s.vy = (s.vy / speed) * maxSpeed;
    }

    // Avoid obstacles
    obstacles.forEach(obstacle => {
      if (s.x > obstacle.x && s.x < obstacle.x + obstacle.width && s.y > obstacle.y && s.y < obstacle.y + obstacle.height) {
        s.vx = -s.vx;
        s.vy = -s.vy;
      }
    });

    // Move sheep
    s.x += s.vx;
    s.y += s.vy;

    // Keep sheep within canvas bounds
    if (s.x < 0 || s.x > canvas.width) s.vx = -s.vx;
    if (s.y < 0 || s.y > canvas.height) s.vy = -s.vy;
  });
}

function updateWolves() {
  wolves.forEach(wolf => {
    // Wolves move randomly
    wolf.vx += (Math.random() - 0.5) * 0.5;
    wolf.vy += (Math.random() - 0.5) * 0.5;

    // Move wolves
    wolf.x += wolf.vx;
    wolf.y += wolf.vy;

    // Keep wolves within canvas bounds
    if (wolf.x < 0 || wolf.x > canvas.width) wolf.vx = -wolf.vx;
    if (wolf.y < 0 || wolf.y > canvas.height) wolf.vy = -wolf.vy;

    // Scare sheep
    sheep.forEach(s => {
      const dx = s.x - wolf.x;
      const dy = s.y - wolf.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100) {
        s.vx += dx / dist * 2;
        s.vy += dy / dist * 2;
      }
    });
  });
}

canvas.addEventListener('mousemove', (e) => {
  dog.x = e.clientX;
  dog.y = e.clientY;
});

canvas.addEventListener('click', () => {
  sheep.forEach(s => {
    const dx = s.x - dog.x;
    const dy = s.y - dog.y;
    const dist = Math.sqrt(dx * dy + dy * dy);
    if (dist < 100) {
      s.vx += dx / dist * 2;
      s.vy += dy / dist * 2;
    }
  });
});

function showStartScreen() {
  ctx.fillStyle = 'black';
  ctx.font = '40px Arial';
  ctx.fillText('Shepherd\'s Dog', canvas.width / 2 - 100, canvas.height / 2 - 20);
  ctx.font = '20px Arial';
  ctx.fillText('Click to Start', canvas.width / 2 - 50, canvas.height / 2 + 20);
}

function showGameOverScreen() {
  ctx.fillStyle = 'black';
  ctx.font = '40px Arial';
  ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2 - 20);
  ctx.font = '20px Arial';
  ctx.fillText('Click to Restart', canvas.width / 2 - 60, canvas.height / 2 + 20);
}

function showWinScreen() {
  ctx.fillStyle = 'black';
  ctx.font = '40px Arial';
  ctx.fillText('You Win!', canvas.width / 2 - 80, canvas.height / 2 - 20);
  ctx.font = '20px Arial';
  ctx.fillText('Click to Next Level', canvas.width / 2 - 70, canvas.height / 2 + 20);
}

canvas.addEventListener('click', () => {
  if (gameOver) {
    gameOver = false;
    resetGame();
  } else if (gameWon) {
    resetGame();
  }
  localStorage.setItem('level', level);
});

function loadProgress() {
  const savedLevel = localStorage.getItem('level');
  if (savedLevel) {
    level = parseInt(savedLevel, 10);
  }
}

loadProgress();
showStartScreen();
init();
