// Game states
const GAME_STATE = {
  LOADING: 'loading',
  START: 'start',
  LEVEL_INTRO: 'level_intro',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
  WIN: 'win',
  GAME_COMPLETED: 'game_completed'
};

// Level configurations
const LEVEL_CONFIGS = [
  // Level 1 - Basic introduction
  {
    sheepCount: 10,
    requiredPercentage: 80,
    timeLimit: 60,
    obstacles: [
      { x: 400, y: 300, width: 50, height: 50 }
    ],
    wolves: 0
  },
  // Level 2 - More sheep
  {
    sheepCount: 15,
    requiredPercentage: 80,
    timeLimit: 60,
    obstacles: [
      { x: 300, y: 200, width: 50, height: 50 },
      { x: 500, y: 400, width: 50, height: 50 }
    ],
    wolves: 0
  },
  // Level 3 - More obstacles
  {
    sheepCount: 20,
    requiredPercentage: 80,
    timeLimit: 70,
    obstacles: [
      { x: 300, y: 200, width: 50, height: 50 },
      { x: 500, y: 400, width: 50, height: 50 },
      { x: 400, y: 300, width: 50, height: 50 },
      { x: 200, y: 500, width: 50, height: 50 }
    ],
    wolves: 0
  },
  // Level 4 - Introduce wolves
  {
    sheepCount: 20,
    requiredPercentage: 80,
    timeLimit: 80,
    obstacles: [
      { x: 300, y: 200, width: 50, height: 50 },
      { x: 500, y: 400, width: 50, height: 50 },
      { x: 400, y: 300, width: 50, height: 50 }
    ],
    wolves: 1
  },
  // Level 5 - More sheep and wolves
  {
    sheepCount: 25,
    requiredPercentage: 80,
    timeLimit: 90,
    obstacles: [
      { x: 300, y: 200, width: 50, height: 50 },
      { x: 500, y: 400, width: 50, height: 50 },
      { x: 400, y: 300, width: 50, height: 50 },
      { x: 200, y: 500, width: 50, height: 50 }
    ],
    wolves: 2
  },
  // Level 6 - Complex obstacle pattern
  {
    sheepCount: 30,
    requiredPercentage: 80,
    timeLimit: 100,
    obstacles: [
      { x: 300, y: 200, width: 50, height: 150 },
      { x: 500, y: 300, width: 150, height: 50 },
      { x: 200, y: 400, width: 100, height: 50 }
    ],
    wolves: 2
  },
  // Level 7 - Maze-like obstacles
  {
    sheepCount: 35,
    requiredPercentage: 80,
    timeLimit: 110,
    obstacles: [
      { x: 200, y: 100, width: 50, height: 200 },
      { x: 400, y: 100, width: 50, height: 200 },
      { x: 600, y: 100, width: 50, height: 200 },
      { x: 300, y: 400, width: 200, height: 50 }
    ],
    wolves: 2
  },
  // Level 8 - More wolves
  {
    sheepCount: 40,
    requiredPercentage: 80,
    timeLimit: 120,
    obstacles: [
      { x: 200, y: 100, width: 50, height: 200 },
      { x: 400, y: 300, width: 200, height: 50 },
      { x: 600, y: 100, width: 50, height: 200 }
    ],
    wolves: 3
  },
  // Level 9 - Complex environment
  {
    sheepCount: 45,
    requiredPercentage: 80,
    timeLimit: 130,
    obstacles: [
      { x: 200, y: 100, width: 50, height: 200 },
      { x: 400, y: 300, width: 200, height: 50 },
      { x: 600, y: 100, width: 50, height: 200 },
      { x: 300, y: 500, width: 300, height: 50 }
    ],
    wolves: 3
  },
  // Level 10 - Final challenge
  {
    sheepCount: 50,
    requiredPercentage: 80,
    timeLimit: 150,
    obstacles: [
      { x: 200, y: 100, width: 50, height: 200 },
      { x: 400, y: 300, width: 200, height: 50 },
      { x: 600, y: 100, width: 50, height: 200 },
      { x: 300, y: 500, width: 300, height: 50 },
      { x: 100, y: 400, width: 100, height: 50 }
    ],
    wolves: 4
  }
];

class Game {
  constructor() {
    // Get canvas and context
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Game state
    this.state = GAME_STATE.LOADING;
    this.score = 0;
    this.sheepInPen = 0;
    this.requiredSheepCount = 0;
    this.timeRemaining = 0;
    this.level = 1;
    
    // Game entities
    this.sheep = [];
    this.obstacles = [];
    this.wolves = [];
    this.dog = null;
    this.pen = null;
    
    // Game timing
    this.lastFrameTime = 0;
    this.gameTimer = null;
    
    // Initialize game
    this.initializeGame();
    
    // Start game loop
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }
  
  initializeGame() {
    // Resize canvas to fit window
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Mouse position
    this.mousePosition = { x: 0, y: 0 };
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    
    // Touch events for mobile
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.handleTouchMove(e);
    }, { passive: false });
    
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleTouchStart(e);
    }, { passive: false });
    
    // Set up UI event listeners
    this.setupUIEventListeners();
    
    // Load assets and show start screen
    this.loadAssets();
    this.showScreen(GAME_STATE.START);
    
    // Load saved progress
    this.loadProgress();
  }
  
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    // If we're in the middle of a game, adjust entity positions
    if (this.state === GAME_STATE.PLAYING) {
      this.adjustEntitiesForResize();
    }
  }
  
  adjustEntitiesForResize() {
    // This would adjust entity positions when the window is resized
    // For simplicity, we'll just reinitialize the level
    if (this.level > 0) {
      this.initLevel(this.level);
    }
  }
  
  loadProgress() {
    const savedLevel = localStorage.getItem('highestLevel');
    if (savedLevel) {
      const highestLevel = parseInt(savedLevel, 10);
      if (highestLevel > 1) {
        // Show continue button if there's saved progress
        document.getElementById('continueButton').style.display = 'block';
      } else {
        document.getElementById('continueButton').style.display = 'none';
      }
    } else {
      document.getElementById('continueButton').style.display = 'none';
    }
  }
  
  saveProgress() {
    const currentHighestLevel = parseInt(localStorage.getItem('highestLevel') || '1', 10);
    if (this.level > currentHighestLevel) {
      localStorage.setItem('highestLevel', this.level.toString());
    }
  }
  
  initLevel(level) {
    try {
      console.log("Initializing level", level);
      
      // Make sure canvas is properly sized
      this.resizeCanvas();
      
      // Clear existing entities
      this.sheep = [];
      this.wolves = [];
      this.obstacles = [];
      
      // Get level configuration
      const levelConfig = LEVEL_CONFIGS[level - 1];
      if (!levelConfig) {
        console.error("Invalid level:", level);
        return;
      }
      
      // Set up level parameters
      this.timeRemaining = levelConfig.timeLimit;
      this.sheepInPen = 0;
      this.score = 0;
      
      // Calculate required sheep count
      const requiredPercentage = levelConfig.requiredPercentage / 100;
      this.requiredSheepCount = Math.ceil(levelConfig.sheepCount * requiredPercentage);
      
      // Create pen
      const penWidth = Math.min(this.canvas.width * 0.2, 200);
      const penHeight = Math.min(this.canvas.height * 0.2, 200);
      this.pen = new Pen(
        this.canvas.width - penWidth - 50,
        this.canvas.height - penHeight - 50,
        penWidth,
        penHeight,
        this
      );
      
      // Create dog
      this.dog = new Dog(
        this.canvas.width / 2,
        this.canvas.height / 2,
        10,
        this
      );
      
      // Create sheep
      const startX = this.canvas.width * 0.2;
      const startY = this.canvas.height * 0.2;
      const spread = 100;
      
      for (let i = 0; i < levelConfig.sheepCount; i++) {
        this.sheep.push(new Sheep(
          startX + Math.random() * spread,
          startY + Math.random() * spread,
          8,
          this
        ));
      }
      
      // Create obstacles
      levelConfig.obstacles.forEach(obstacleConfig => {
        // Scale obstacle positions based on canvas size
        const x = (obstacleConfig.x / 800) * this.canvas.width;
        const y = (obstacleConfig.y / 600) * this.canvas.height;
        const width = (obstacleConfig.width / 800) * this.canvas.width;
        const height = (obstacleConfig.height / 600) * this.canvas.height;
        
        this.obstacles.push(new Obstacle(x, y, width, height, this));
      });
      
      // Create wolves
      for (let i = 0; i < levelConfig.wolves; i++) {
        // Place wolves at the edges of the screen
        let wolfX, wolfY;
        
        // Randomly choose which edge to place the wolf
        const edge = Math.floor(Math.random() * 4);
        
        switch (edge) {
          case 0: // Top edge
            wolfX = Math.random() * this.canvas.width;
            wolfY = 20;
            break;
          case 1: // Right edge
            wolfX = this.canvas.width - 20;
            wolfY = Math.random() * this.canvas.height;
            break;
          case 2: // Bottom edge
            wolfX = Math.random() * this.canvas.width;
            wolfY = this.canvas.height - 20;
            break;
          case 3: // Left edge
            wolfX = 20;
            wolfY = Math.random() * this.canvas.height;
            break;
        }
        
        this.wolves.push(new Wolf(wolfX, wolfY, 12, this));
      }
      
      // Update UI
      document.getElementById('levelNumber').textContent = level;
      document.getElementById('sheepTarget').textContent = levelConfig.requiredPercentage;
      document.getElementById('timer').textContent = this.formatTime(this.timeRemaining);
      document.getElementById('penCount').textContent = this.sheepInPen;
      document.getElementById('totalSheep').textContent = this.sheep.length;
      document.getElementById('score').textContent = this.score;
      document.getElementById('currentLevel').textContent = level;
      
      // Show HUD and level display
      document.getElementById('hud').style.display = 'block';
      document.getElementById('levelDisplay').style.display = 'block';
      
      // Start timer
      this.startTimer();
      
      console.log("Level initialized successfully");
    } catch (error) {
      console.error("Error initializing level:", error);
    }
  }
  
  startTimer() {
    // Clear any existing timer
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
    }
    
    // Set up new timer
    this.gameTimer = setInterval(() => {
      this.timeRemaining--;
      document.getElementById('timer').textContent = this.formatTime(this.timeRemaining);
      
      if (this.timeRemaining <= 0) {
        clearInterval(this.gameTimer);
        this.checkGameOver();
      }
    }, 1000);
  }
  
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }
  
  handleMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
  
  handleMouseDown(event) {
    if (this.state === GAME_STATE.PLAYING && this.dog) {
      this.dog.bark();
    }
  }
  
  handleTouchMove(event) {
    if (event.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePosition = {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top
      };
    }
  }
  
  handleTouchStart(event) {
    if (this.state === GAME_STATE.PLAYING && this.dog) {
      this.dog.bark();
    }
  }
  
  gameLoop(timestamp) {
    // Calculate delta time
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = timestamp;
    }
    
    const deltaTime = (timestamp - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = timestamp;
    
    // Update game state
    this.update(deltaTime);
    
    // Render game
    this.render();
    
    // Request next frame
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }
  
  update(deltaTime) {
    // Cap delta time to prevent large jumps
    const cappedDeltaTime = Math.min(deltaTime, 0.1);
    
    // Update based on game state
    if (this.state === GAME_STATE.PLAYING) {
      // Update dog
      if (this.dog) {
        this.dog.update(cappedDeltaTime);
      }
      
      // Update sheep
      this.sheep.forEach(sheep => {
        sheep.update(cappedDeltaTime);
      });
      
      // Update wolves
      this.wolves.forEach(wolf => {
        wolf.update(cappedDeltaTime);
      });
      
      // Check for sheep in pen
      this.checkSheepInPen();
      
      // Check win condition
      this.checkWinCondition();
    }
  }
  
  checkSheepInPen() {
    let newSheepInPen = 0;
    
    this.sheep.forEach(sheep => {
      if (this.pen && this.pen.containsPoint(sheep.x, sheep.y)) {
        if (!sheep.inPen) {
          sheep.inPen = true;
          this.score += 10;
          document.getElementById('score').textContent = this.score;
        }
        newSheepInPen++;
      }
    });
    
    if (newSheepInPen !== this.sheepInPen) {
      this.sheepInPen = newSheepInPen;
      document.getElementById('penCount').textContent = this.sheepInPen;
    }
  }
  
  checkWinCondition() {
    if (this.sheepInPen >= this.requiredSheepCount) {
      // Level completed
      clearInterval(this.gameTimer);
      this.state = GAME_STATE.WIN;
      this.updateWinScreen();
      this.showScreen(GAME_STATE.WIN);
      
      // Save progress
      this.saveProgress();
    }
  }
  
  checkGameOver() {
    if (this.sheepInPen < this.requiredSheepCount) {
      // Game over
      this.state = GAME_STATE.GAME_OVER;
      this.updateGameOverScreen();
      this.showScreen(GAME_STATE.GAME_OVER);
    } else {
      // Win by time expiration
      this.checkWinCondition();
    }
  }
  
  render() {
    // Clear canvas
    this.ctx.fillStyle = '#4a7c59'; // Grass green
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render game elements
    if (this.state === GAME_STATE.PLAYING) {
      this.renderGameScreen();
    }
  }
  
  renderGameScreen() {
    // Draw pen
    if (this.pen) {
      this.pen.draw(this.ctx);
    }
    
    // Draw obstacles
    this.obstacles.forEach(obstacle => {
      obstacle.draw(this.ctx);
    });
    
    // Draw sheep
    this.sheep.forEach(sheep => {
      sheep.draw(this.ctx);
    });
    
    // Draw wolves
    this.wolves.forEach(wolf => {
      wolf.draw(this.ctx);
    });
    
    // Draw dog
    if (this.dog) {
      this.dog.draw(this.ctx);
    }
  }
  
  setupUIEventListeners() {
    // Start screen buttons
    document.getElementById('startButton').addEventListener('click', () => {
      this.level = 1;
      this.showScreen(GAME_STATE.LEVEL_INTRO);
    });
    
    document.getElementById('continueButton').addEventListener('click', () => {
      const savedLevel = parseInt(localStorage.getItem('highestLevel') || '1', 10);
      this.level = savedLevel;
      this.showScreen(GAME_STATE.LEVEL_INTRO);
    });
    
    // Level screen buttons
    document.getElementById('startLevelButton').addEventListener('click', () => {
      this.initLevel(this.level);
      this.state = GAME_STATE.PLAYING;
      this.showScreen(GAME_STATE.PLAYING);
    });
    
    // Game over screen buttons
    document.getElementById('restartButton').addEventListener('click', () => {
      this.initLevel(this.level);
      this.state = GAME_STATE.PLAYING;
      this.showScreen(GAME_STATE.PLAYING);
    });
    
    document.getElementById('mainMenuButton').addEventListener('click', () => {
      this.state = GAME_STATE.START;
      this.showScreen(GAME_STATE.START);
    });
    
    // Win screen buttons
    document.getElementById('nextLevelButton').addEventListener('click', () => {
      this.level++;
      
      if (this.level > LEVEL_CONFIGS.length) {
        // Game completed
        this.state = GAME_STATE.GAME_COMPLETED;
        this.updateGameCompletedScreen();
        this.showScreen(GAME_STATE.GAME_COMPLETED);
      } else {
        // Next level
        this.showScreen(GAME_STATE.LEVEL_INTRO);
      }
    });
    
    document.getElementById('winMenuButton').addEventListener('click', () => {
      this.state = GAME_STATE.START;
      this.showScreen(GAME_STATE.START);
    });
    
    // Game completed screen buttons
    document.getElementById('playAgainButton').addEventListener('click', () => {
      this.level = 1;
      this.showScreen(GAME_STATE.LEVEL_INTRO);
    });
  }
  
  updateWinScreen() {
    document.getElementById('sheepCount').textContent = `${this.sheepInPen}/${this.sheep.length}`;
    document.getElementById('finalScore').textContent = this.score;
  }
  
  updateGameOverScreen() {
    document.getElementById('gameOverSheepCount').textContent = `${this.sheepInPen}/${this.requiredSheepCount}`;
    document.getElementById('gameOverScore').textContent = this.score;
  }
  
  updateGameCompletedScreen() {
    document.getElementById('totalScore').textContent = this.score;
  }
  
  showScreen(screenName) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
      screen.style.display = 'none';
    });
    
    // Hide HUD and level display
    document.getElementById('hud').style.display = 'none';
    document.getElementById('levelDisplay').style.display = 'none';
    
    // Show the requested screen
    switch (screenName) {
      case GAME_STATE.START:
        document.getElementById('startScreen').style.display = 'flex';
        break;
      case GAME_STATE.LEVEL_INTRO:
        document.getElementById('levelScreen').style.display = 'flex';
        break;
      case GAME_STATE.PLAYING:
        // No screen to show, but show HUD and level display
        document.getElementById('hud').style.display = 'block';
        document.getElementById('levelDisplay').style.display = 'block';
        break;
      case GAME_STATE.GAME_OVER:
        document.getElementById('gameOverScreen').style.display = 'flex';
        break;
      case GAME_STATE.WIN:
        document.getElementById('winScreen').style.display = 'flex';
        break;
      case GAME_STATE.GAME_COMPLETED:
        document.getElementById('gameCompletedScreen').style.display = 'flex';
        break;
    }
  }
  
  loadAssets() {
    // For this simple version, we don't need to load any assets
    // This would be where you'd load images, sounds, etc.
    this.state = GAME_STATE.START;
  }
}

class Sheep {
  constructor(x, y, radius, game) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.game = game;
    this.vx = 0;
    this.vy = 0;
    this.maxSpeed = 100;
    this.inPen = false;
    this.fleeRadius = 150;
    this.flockRadius = 100;
    this.separationWeight = 1.5;
    this.alignmentWeight = 1.0;
    this.cohesionWeight = 1.0;
    this.dogAvoidanceWeight = 2.0;
    this.wolfAvoidanceWeight = 2.5;
    this.obstacleAvoidanceWeight = 2.0;
    this.wanderWeight = 0.3;
    this.friction = 0.95;
    this.headAngle = 0;
  }
  
  update(deltaTime) {
    // If in pen, move randomly but slower
    if (this.inPen) {
      // Random movement in pen
      if (Math.random() < 0.05) {
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * this.maxSpeed * 0.3;
        this.vy = Math.sin(angle) * this.maxSpeed * 0.3;
      }
      
      // Apply friction
      this.vx *= this.friction;
      this.vy *= this.friction;
      
      // Update position
      this.x += this.vx * deltaTime;
      this.y += this.vy * deltaTime;
      
      // Keep within pen
      if (this.game.pen) {
        if (this.x < this.game.pen.x + this.radius) {
          this.x = this.game.pen.x + this.radius;
          this.vx *= -0.5;
        } else if (this.x > this.game.pen.x + this.game.pen.width - this.radius) {
          this.x = this.game.pen.x + this.game.pen.width - this.radius;
          this.vx *= -0.5;
        }
        
        if (this.y < this.game.pen.y + this.radius) {
          this.y = this.game.pen.y + this.radius;
          this.vy *= -0.5;
        } else if (this.y > this.game.pen.y + this.game.pen.height - this.radius) {
          this.y = this.game.pen.y + this.game.pen.height - this.radius;
          this.vy *= -0.5;
        }
      }
      
      return;
    }
    
    // Apply flocking behavior
    this.flock(deltaTime);
    
    // Apply friction
    this.vx *= this.friction;
    this.vy *= this.friction;
    
    // Update position
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    
    // Keep within canvas bounds
    if (this.x < this.radius) {
      this.x = this.radius;
      this.vx *= -0.5;
    } else if (this.x > this.game.canvas.width - this.radius) {
      this.x = this.game.canvas.width - this.radius;
      this.vx *= -0.5;
    }
    
    if (this.y < this.radius) {
      this.y = this.radius;
      this.vy *= -0.5;
    } else if (this.y > this.game.canvas.height - this.radius) {
      this.y = this.game.canvas.height - this.radius;
      this.vy *= -0.5;
    }
    
    // Update head angle
    if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
      this.headAngle = Math.atan2(this.vy, this.vx);
    }
  }
  
  flock(deltaTime) {
    // Calculate flocking forces
    const separation = this.calculateSeparation();
    const alignment = this.calculateAlignment();
    const cohesion = this.calculateCohesion();
    const dogAvoidance = this.calculateDogAvoidance();
    const wolfAvoidance = this.calculateWolfAvoidance();
    const obstacleAvoidance = this.calculateObstacleAvoidance();
    const wander = this.calculateWander();
    
    // Apply forces with weights
    this.vx += separation.x * this.separationWeight * deltaTime * 10;
    this.vy += separation.y * this.separationWeight * deltaTime * 10;
    
    this.vx += alignment.x * this.alignmentWeight * deltaTime * 10;
    this.vy += alignment.y * this.alignmentWeight * deltaTime * 10;
    
    this.vx += cohesion.x * this.cohesionWeight * deltaTime * 10;
    this.vy += cohesion.y * this.cohesionWeight * deltaTime * 10;
    
    this.vx += dogAvoidance.x * this.dogAvoidanceWeight * deltaTime * 10;
    this.vy += dogAvoidance.y * this.dogAvoidanceWeight * deltaTime * 10;
    
    this.vx += wolfAvoidance.x * this.wolfAvoidanceWeight * deltaTime * 10;
    this.vy += wolfAvoidance.y * this.wolfAvoidanceWeight * deltaTime * 10;
    
    this.vx += obstacleAvoidance.x * this.obstacleAvoidanceWeight * deltaTime * 10;
    this.vy += obstacleAvoidance.y * this.obstacleAvoidanceWeight * deltaTime * 10;
    
    this.vx += wander.x * this.wanderWeight * deltaTime * 10;
    this.vy += wander.y * this.wanderWeight * deltaTime * 10;
    
    // Limit speed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > this.maxSpeed) {
      this.vx = (this.vx / speed) * this.maxSpeed;
      this.vy = (this.vy / speed) * this.maxSpeed;
    }
    
    // If dog is barking, increase speed
    if (this.game.dog && this.game.dog.barkDuration > 0) {
      const distToDog = Math.sqrt(
        Math.pow(this.x - this.game.dog.x, 2) + 
        Math.pow(this.y - this.game.dog.y, 2)
      );
      
      if (distToDog < this.game.dog.barkRadius) {
        this.vx *= 1.5;
        this.vy *= 1.5;
      }
    }
  }
  
  calculateSeparation() {
    let steerX = 0;
    let steerY = 0;
    let count = 0;
    
    // Check distance to other sheep
    for (const otherSheep of this.game.sheep) {
      if (otherSheep === this) continue;
      
      const dx = this.x - otherSheep.x;
      const dy = this.y - otherSheep.y;
      const distSquared = dx * dx + dy * dy;
      
      // If within separation distance
      if (distSquared < this.radius * 10 * (this.radius * 10)) {
        // Weight by distance (closer = stronger)
        const dist = Math.sqrt(distSquared);
        steerX += (dx / dist) * (1.0 / Math.max(dist, 0.1));
        steerY += (dy / dist) * (1.0 / Math.max(dist, 0.1));
        count++;
      }
    }
    
    // Average
    if (count > 0) {
      steerX /= count;
      steerY /= count;
      
      // Normalize
      const magnitude = Math.sqrt(steerX * steerX + steerY * steerY);
      if (magnitude > 0) {
        steerX /= magnitude;
        steerY /= magnitude;
      }
    }
    
    return { x: steerX, y: steerY };
  }
  
  calculateAlignment() {
    let avgVX = 0;
    let avgVY = 0;
    let count = 0;
    
    // Check distance to other sheep
    for (const otherSheep of this.game.sheep) {
      if (otherSheep === this || otherSheep.inPen) continue;
      
      const dx = otherSheep.x - this.x;
      const dy = otherSheep.y - this.y;
      const distSquared = dx * dx + dy * dy;
      
      // If within alignment distance
      if (distSquared < this.flockRadius * this.flockRadius) {
        avgVX += otherSheep.vx;
        avgVY += otherSheep.vy;
        count++;
      }
    }
    
    // Average
    if (count > 0) {
      avgVX /= count;
      avgVY /= count;
      
      // Normalize
      const magnitude = Math.sqrt(avgVX * avgVX + avgVY * avgVY);
      if (magnitude > 0) {
        avgVX /= magnitude;
        avgVY /= magnitude;
      }
    }
    
    return { x: avgVX, y: avgVY };
  }
  
  calculateCohesion() {
    let avgX = 0;
    let avgY = 0;
    let count = 0;
    
    // Check distance to other sheep
    for (const otherSheep of this.game.sheep) {
      if (otherSheep === this || otherSheep.inPen) continue;
      
      const dx = otherSheep.x - this.x;
      const dy = otherSheep.y - this.y;
      const distSquared = dx * dx + dy * dy;
      
      // If within cohesion distance
      if (distSquared < this.flockRadius * this.flockRadius) {
        avgX += otherSheep.x;
        avgY += otherSheep.y;
        count++;
      }
    }
    
    // Calculate steering force towards center
    let steerX = 0;
    let steerY = 0;
    
    if (count > 0) {
      avgX /= count;
      avgY /= count;
      
      // Vector towards center
      steerX = avgX - this.x;
      steerY = avgY - this.y;
      
      // Normalize
      const magnitude = Math.sqrt(steerX * steerX + steerY * steerY);
      if (magnitude > 0) {
        steerX /= magnitude;
        steerY /= magnitude;
      }
    }
    
    return { x: steerX, y: steerY };
  }
  
  calculateDogAvoidance() {
    let steerX = 0;
    let steerY = 0;
    
    if (this.game.dog) {
      const dx = this.x - this.game.dog.x;
      const dy = this.y - this.game.dog.y;
      const distSquared = dx * dx + dy * dy;
      
      // If within flee distance
      if (distSquared < this.fleeRadius * this.fleeRadius) {
        const dist = Math.sqrt(distSquared);
        
        // Flee strength inversely proportional to distance
        const fleeStrength = 1.0 - (dist / this.fleeRadius);
        
        steerX = (dx / dist) * fleeStrength;
        steerY = (dy / dist) * fleeStrength;
      }
    }
    
    return { x: steerX, y: steerY };
  }
  
  calculateWolfAvoidance() {
    let steerX = 0;
    let steerY = 0;
    
    for (const wolf of this.game.wolves) {
      const dx = this.x - wolf.x;
      const dy = this.y - wolf.y;
      const distSquared = dx * dx + dy * dy;
      
      // Wolves are scarier than dogs
      const fleeRadiusFromWolf = this.fleeRadius * 1.5;
      
      // If within flee distance
      if (distSquared < fleeRadiusFromWolf * fleeRadiusFromWolf) {
        const dist = Math.sqrt(distSquared);
        
        // Flee strength inversely proportional to distance
        const fleeStrength = 1.0 - (dist / fleeRadiusFromWolf);
        
        steerX += (dx / dist) * fleeStrength * 2; // Stronger flee from wolves
        steerY += (dy / dist) * fleeStrength * 2;
      }
    }
    
    return { x: steerX, y: steerY };
  }
  
  calculateObstacleAvoidance() {
    let steerX = 0;
    let steerY = 0;
    
    for (const obstacle of this.game.obstacles) {
      // Calculate closest point on obstacle to sheep
      const closestX = Math.max(obstacle.x, Math.min(this.x, obstacle.x + obstacle.width));
      const closestY = Math.max(obstacle.y, Math.min(this.y, obstacle.y + obstacle.height));
      
      const dx = this.x - closestX;
      const dy = this.y - closestY;
      const distSquared = dx * dx + dy * dy;
      
      // If close to obstacle
      const avoidDistance = this.radius * 5;
      if (distSquared < avoidDistance * avoidDistance) {
        const dist = Math.sqrt(distSquared);
        
        // Avoid strength inversely proportional to distance
        const avoidStrength = 1.0 - (dist / avoidDistance);
        
        if (dist > 0) {
          steerX += (dx / dist) * avoidStrength;
          steerY += (dy / dist) * avoidStrength;
        } else {
          // If exactly on the obstacle, move in a random direction
          const angle = Math.random() * Math.PI * 2;
          steerX += Math.cos(angle);
          steerY += Math.sin(angle);
        }
      }
    }
    
    return { x: steerX, y: steerY };
  }
  
  calculateWander() {
    // Random wander force
    const wanderStrength = 0.5;
    const wanderX = (Math.random() * 2 - 1) * wanderStrength;
    const wanderY = (Math.random() * 2 - 1) * wanderStrength;
    
    return { x: wanderX, y: wanderY };
  }
  
  draw(ctx) {
    // Draw sheep body
    ctx.fillStyle = this.inPen ? '#DDDDDD' : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw sheep head (in direction of movement)
    const headLength = this.radius * 0.8;
    const headX = this.x + Math.cos(this.headAngle) * headLength;
    const headY = this.y + Math.sin(this.headAngle) * headLength;
    
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(headX, headY, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Dog {
  constructor(x, y, radius, game) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.game = game;
    this.speed = 300;
    this.barkRadius = 150;
    this.maxBarkDuration = 0.5; // seconds
    this.barkDuration = 0;
    this.maxBarkCooldown = 1.0; // seconds
    this.barkCooldown = 0;
    this.headAngle = 0;
  }
  
  update(deltaTime) {
    // Move dog towards mouse position
    const mousePos = this.game.mousePosition;
    const dx = mousePos.x - this.x;
    const dy = mousePos.y - this.y;
    const distSquared = dx * dx + dy * dy;
    
    if (distSquared > 1) {
      const dist = Math.sqrt(distSquared);
      const moveX = (dx / dist) * this.speed * deltaTime;
      const moveY = (dy / dist) * this.speed * deltaTime;
      
      this.x += moveX;
      this.y += moveY;
      
      // Update head angle
      this.headAngle = Math.atan2(dy, dx);
    }
    
    // Update bark duration and cooldown
    if (this.barkDuration > 0) {
      this.barkDuration -= deltaTime;
    }
    
    if (this.barkCooldown > 0) {
      this.barkCooldown -= deltaTime;
    }
    
    // Keep within canvas bounds
    if (this.x < this.radius) {
      this.x = this.radius;
    } else if (this.x > this.game.canvas.width - this.radius) {
      this.x = this.game.canvas.width - this.radius;
    }
    
    if (this.y < this.radius) {
      this.y = this.radius;
    } else if (this.y > this.game.canvas.height - this.radius) {
      this.y = this.game.canvas.height - this.radius;
    }
  }
  
  bark() {
    if (this.barkCooldown <= 0) {
      this.barkDuration = this.maxBarkDuration;
      this.barkCooldown = this.maxBarkCooldown;
    }
  }
  
  draw(ctx) {
    // Draw dog body
    ctx.fillStyle = '#8B4513'; // Brown
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw dog head (in direction of movement)
    const headLength = this.radius * 1.2;
    const headX = this.x + Math.cos(this.headAngle) * headLength;
    const headY = this.y + Math.sin(this.headAngle) * headLength;
    
    ctx.fillStyle = '#5D3A1A'; // Darker brown
    ctx.beginPath();
    ctx.arc(headX, headY, this.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw bark effect if barking
    if (this.barkDuration > 0) {
      const barkIntensity = this.barkDuration / this.maxBarkDuration;
      ctx.strokeStyle = `rgba(255, 255, 255, ${barkIntensity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.barkRadius * barkIntensity, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

class Pen {
  constructor(x, y, width, height, game) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.game = game;
    
    // Define entrance area
    this.entranceWidth = Math.min(width * 0.4, 80);
    this.entranceX = x + (width - this.entranceWidth) / 2;
    this.entranceY = y;
  }
  
  containsPoint(x, y) {
    // Check if point is inside pen
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }
  
  draw(ctx) {
    // Draw pen floor with a more visible color
    ctx.fillStyle = '#F5DEB3'; // Wheat color for pen floor
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Draw fence posts with thicker lines
    ctx.fillStyle = '#8B4513'; // Brown for fence
    
    const postWidth = 8;
    const postSpacing = 40;
    
    // Draw top fence (with entrance gap)
    for (let x = this.x; x < this.x + this.width; x += postSpacing) {
      // Skip posts at the entrance
      if (x >= this.entranceX - postWidth && x <= this.entranceX + this.entranceWidth) {
        continue;
      }
      ctx.fillRect(x, this.y - postWidth, postWidth, postWidth * 2);
    }
    
    // Draw bottom fence
    for (let x = this.x; x < this.x + this.width; x += postSpacing) {
      ctx.fillRect(x, this.y + this.height - postWidth, postWidth, postWidth * 2);
    }
    
    // Draw left fence
    for (let y = this.y; y < this.y + this.height; y += postSpacing) {
      ctx.fillRect(this.x - postWidth, y, postWidth * 2, postWidth);
    }
    
    // Draw right fence
    for (let y = this.y; y < this.y + this.height; y += postSpacing) {
      ctx.fillRect(this.x + this.width - postWidth, y, postWidth * 2, postWidth);
    }
    
    // Draw entrance markers
    ctx.fillStyle = '#A52A2A'; // Brown-red for entrance posts
    ctx.fillRect(this.entranceX - postWidth, this.y - postWidth * 2, postWidth * 2, postWidth * 3);
    ctx.fillRect(this.entranceX + this.entranceWidth - postWidth, this.y - postWidth * 2, postWidth * 2, postWidth * 3);
  }
}

class Obstacle {
  constructor(x, y, width, height, game) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.game = game;
    this.type = Math.floor(Math.random() * 3); // 0: rock, 1: tree, 2: bush
  }
  
  containsPoint(x, y, radius = 0) {
    return x + radius >= this.x && x - radius <= this.x + this.width &&
           y + radius >= this.y && y - radius <= this.y + this.height;
  }
  
  draw(ctx) {
    switch (this.type) {
      case 0: // Rock
        this.drawRock(ctx);
        break;
      case 1: // Tree
        this.drawTree(ctx);
        break;
      case 2: // Bush
        this.drawBush(ctx);
        break;
    }
  }
  
  drawRock(ctx) {
    // Draw rock
    ctx.fillStyle = '#888888';
    ctx.beginPath();
    ctx.ellipse(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.width / 2,
      this.height / 2,
      0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Add some texture
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x + this.width * 0.3, this.y + this.height * 0.3);
    ctx.lineTo(this.x + this.width * 0.7, this.y + this.height * 0.4);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(this.x + this.width * 0.4, this.y + this.height * 0.6);
    ctx.lineTo(this.x + this.width * 0.6, this.y + this.height * 0.7);
    ctx.stroke();
  }
  
  drawTree(ctx) {
    // Draw trunk
    const trunkWidth = this.width * 0.3;
    const trunkHeight = this.height * 0.6;
    const trunkX = this.x + (this.width - trunkWidth) / 2;
    const trunkY = this.y + this.height - trunkHeight;
    
    ctx.fillStyle = '#8B4513'; // Brown
    ctx.fillRect(trunkX, trunkY, trunkWidth, trunkHeight);
    
    // Draw foliage
    const foliageRadius = this.width * 0.6;
    const foliageX = this.x + this.width / 2;
    const foliageY = this.y + this.height * 0.4;
    
    ctx.fillStyle = '#228B22'; // Forest green
    ctx.beginPath();
    ctx.arc(foliageX, foliageY, foliageRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  drawBush(ctx) {
    // Draw bush as a cluster of circles
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    const radius = Math.min(this.width, this.height) / 2;
    
    ctx.fillStyle = '#228B22'; // Forest green
    
    // Main bush
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Additional smaller parts
    ctx.beginPath();
    ctx.arc(centerX - radius * 0.6, centerY - radius * 0.6, radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(centerX + radius * 0.6, centerY - radius * 0.4, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(centerX - radius * 0.4, centerY + radius * 0.6, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(centerX + radius * 0.5, centerY + radius * 0.5, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Wolf {
  constructor(x, y, radius, game) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.game = game;
    this.speed = 150;
    this.chaseSpeed = 250;
    this.targetSheep = null;
    this.vx = 0;
    this.vy = 0;
    this.headAngle = 0;
    this.detectionRadius = 200;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.wanderTimer = 0;
  }
  
  update(deltaTime) {
    // Find closest sheep to chase
    if (!this.targetSheep || this.targetSheep.inPen || Math.random() < 0.01) {
      let closestSheep = null;
      let closestDistance = Infinity;
      
      for (const sheep of this.game.sheep) {
        if (!sheep.inPen) {
          const dx = this.x - sheep.x;
          const dy = this.y - sheep.y;
          const distSquared = dx * dx + dy * dy;
          
          if (distSquared < this.detectionRadius * this.detectionRadius && distSquared < closestDistance) {
            closestDistance = distSquared;
            closestSheep = sheep;
          }
        }
      }
      
      this.targetSheep = closestSheep;
    }
    
    // Chase target sheep or wander
    if (this.targetSheep) {
      // Chase sheep
      const dx = this.targetSheep.x - this.x;
      const dy = this.targetSheep.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        this.vx = (dx / dist) * this.chaseSpeed;
        this.vy = (dy / dist) * this.chaseSpeed;
        this.headAngle = Math.atan2(dy, dx);
      }
    } else {
      // Wander behavior
      this.wanderTimer -= deltaTime;
      
      if (this.wanderTimer <= 0) {
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderTimer = 1 + Math.random() * 2; // 1-3 seconds
      }
      
      this.vx = Math.cos(this.wanderAngle) * this.speed;
      this.vy = Math.sin(this.wanderAngle) * this.speed;
      this.headAngle = this.wanderAngle;
    }
    
    // Update position
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    
    // Avoid obstacles
    this.avoidObstacles(deltaTime);
    
    // Keep within canvas bounds
    if (this.x < this.radius) {
      this.x = this.radius;
      this.wanderAngle = Math.PI - this.wanderAngle;
    } else if (this.x > this.game.canvas.width - this.radius) {
      this.x = this.game.canvas.width - this.radius;
      this.wanderAngle = Math.PI - this.wanderAngle;
    }
    
    if (this.y < this.radius) {
      this.y = this.radius;
      this.wanderAngle = -this.wanderAngle;
    } else if (this.y > this.game.canvas.height - this.radius) {
      this.y = this.game.canvas.height - this.radius;
      this.wanderAngle = -this.wanderAngle;
    }
  }
  
  avoidObstacles(deltaTime) {
    for (const obstacle of this.game.obstacles) {
      // Calculate closest point on obstacle to wolf
      const closestX = Math.max(obstacle.x, Math.min(this.x, obstacle.x + obstacle.width));
      const closestY = Math.max(obstacle.y, Math.min(this.y, obstacle.y + obstacle.height));
      
      const dx = this.x - closestX;
      const dy = this.y - closestY;
      const distSquared = dx * dx + dy * dy;
      
      // If close to obstacle
      const avoidDistance = this.radius * 5;
      if (distSquared < avoidDistance * avoidDistance) {
        const dist = Math.sqrt(distSquared);
        
        // Avoid strength inversely proportional to distance
        const avoidStrength = 1.0 - (dist / avoidDistance);
        
        if (dist > 0) {
          this.vx += (dx / dist) * avoidStrength * 500 * deltaTime;
          this.vy += (dy / dist) * avoidStrength * 500 * deltaTime;
        } else {
          // If exactly on the obstacle, move in a random direction
          const angle = Math.random() * Math.PI * 2;
          this.vx += Math.cos(angle) * 500 * deltaTime;
          this.vy += Math.sin(angle) * 500 * deltaTime;
        }
      }
    }
  }
  
  draw(ctx) {
    // Draw wolf body
    ctx.fillStyle = '#444444'; // Dark gray
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw wolf head (in direction of movement)
    const headLength = this.radius * 1.2;
    const headX = this.x + Math.cos(this.headAngle) * headLength;
    const headY = this.y + Math.sin(this.headAngle) * headLength;
    
    ctx.fillStyle = '#222222'; // Darker gray
    ctx.beginPath();
    ctx.arc(headX, headY, this.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw wolf ears
    const earSize = this.radius * 0.5;
    const earDistance = this.radius * 0.5;
    
    // Left ear
    const leftEarAngle = this.headAngle - Math.PI / 4;
    const leftEarX = headX + Math.cos(leftEarAngle) * earDistance;
    const leftEarY = headY + Math.sin(leftEarAngle) * earDistance;
    
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(leftEarX, leftEarY, earSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Right ear
    const rightEarAngle = this.headAngle + Math.PI / 4;
    const rightEarX = headX + Math.cos(rightEarAngle) * earDistance;
    const rightEarY = headY + Math.sin(rightEarAngle) * earDistance;
    
    ctx.beginPath();
    ctx.arc(rightEarX, rightEarY, earSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw wolf eyes (red)
    const eyeSize = this.radius * 0.2;
    const eyeDistance = this.radius * 0.3;
    
    // Left eye
    const leftEyeAngle = this.headAngle - Math.PI / 6;
    const leftEyeX = headX + Math.cos(leftEyeAngle) * eyeDistance;
    const leftEyeY = headY + Math.sin(leftEyeAngle) * eyeDistance;
    
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Right eye
    const rightEyeAngle = this.headAngle + Math.PI / 6;
    const rightEyeX = headX + Math.cos(rightEyeAngle) * eyeDistance;
    const rightEyeY = headY + Math.sin(rightEyeAngle) * eyeDistance;
    
    ctx.beginPath();
    ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Initialize game when page loads
window.addEventListener('load', () => {
  const game = new Game();
});
