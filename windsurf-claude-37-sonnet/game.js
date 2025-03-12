// Game class
class Game {
  constructor() {
    // Game state
    this.state = GAME_STATE.LOADING;
    this.score = 0;
    this.sheepInPen = 0;
    this.requiredSheepCount = 0;
    this.timeRemaining = 0;
    this.level = 1;
    
    // Game objects
    this.dog = null;
    this.pen = null;
    this.sheep = [];
    this.wolves = [];
    this.obstacles = [];
    
    // Canvas and context
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Wait for DOM to be fully loaded before initializing
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeGame();
      });
    } else {
      this.initializeGame();
    }
  }
  
  // Initialize the game after DOM is loaded
  initializeGame() {
    // Resize canvas to fit window
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Mouse position
    this.mousePosition = { x: 0, y: 0 };
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    
    // Game loop variables
    this.lastFrameTime = 0;
    this.accumulator = 0;
    this.timeStep = 1 / 60; // 60 fps
    
    // Load assets
    this.loadAssets();
    
    // Set up UI event listeners
    this.setupUIEventListeners();
    
    // Start game loop
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }
  
  // Resize canvas to fit window
  resizeCanvas() {
    // Get the game screen element
    const gameScreen = document.getElementById('gameScreen');
    if (!gameScreen) return; // Safety check
    
    // Set canvas size to match the game screen
    const canvasWidth = gameScreen.clientWidth;
    const canvasHeight = gameScreen.clientHeight - 50; // Subtract space for HUD
    
    if (this.canvas.width !== canvasWidth || this.canvas.height !== canvasHeight) {
      this.canvas.width = canvasWidth;
      this.canvas.height = canvasHeight;
      
      console.log(`Canvas resized to ${canvasWidth}x${canvasHeight}`);
      
      // If we have a dog, update its position based on the new canvas size
      if (this.dog && this.state === GAME_STATE.PLAYING) {
        // Center the dog if it's outside the canvas
        if (this.dog.x < 0 || this.dog.x > this.canvas.width || 
            this.dog.y < 0 || this.dog.y > this.canvas.height) {
          this.dog.x = this.canvas.width / 2;
          this.dog.y = this.canvas.height / 2;
        }
      }
      
      // Force a redraw if we're already in the game
      if (this.state === GAME_STATE.PLAYING) {
        this.render();
      }
    }
  }
  
  // Initialize level
  initLevel(level) {
    try {
      console.log("Initializing level", level);
      
      // Make sure canvas is properly sized
      this.resizeCanvas();
      
      // Clear existing entities
      this.sheep = [];
      this.wolves = [];
      this.obstacles = [];
      
      // Set level parameters
      this.level = level;
      this.timeRemaining = LEVEL_TIME;
      this.sheepInPen = 0;
      
      // Level-specific settings
      const levelConfig = LEVEL_CONFIGS[level - 1] || LEVEL_CONFIGS[LEVEL_CONFIGS.length - 1];
      this.requiredSheepCount = levelConfig.requiredSheepCount;
      
      // Create pen - make it larger and more visible
      const penWidth = 200;
      const penHeight = 200;
      const penX = this.canvas.width - penWidth - 50;
      const penY = this.canvas.height - penHeight - 50;
      this.pen = new Pen(penX, penY, penWidth, penHeight, this);
      
      // Create dog at the cursor position
      const dogRadius = 15;
      // Use mouse position if available, otherwise use center of screen
      const dogX = this.mousePosition ? this.mousePosition.x : this.canvas.width / 2;
      const dogY = this.mousePosition ? this.mousePosition.y : this.canvas.height / 2;
      this.dog = new Dog(dogX, dogY, dogRadius, this);
      
      // Create sheep
      const sheepCount = levelConfig.sheepCount;
      const sheepRadius = 12;
      
      for (let i = 0; i < sheepCount; i++) {
        // Place sheep completely randomly across the canvas
        let sheepX = Math.random() * (this.canvas.width - 2 * sheepRadius) + sheepRadius;
        let sheepY = Math.random() * (this.canvas.height - 2 * sheepRadius) + sheepRadius;
        
        // Create sheep with random initial velocity
        const sheep = new Sheep(sheepX, sheepY, sheepRadius, this);
        
        // Give sheep a random initial velocity
        const angle = Math.random() * Math.PI * 2;
        const initialSpeed = Math.random() * 50 + 20; // Random speed between 20-70
        sheep.vx = Math.cos(angle) * initialSpeed;
        sheep.vy = Math.sin(angle) * initialSpeed;
        
        this.sheep.push(sheep);
      }
      
      // Create wolves (if any for this level)
      const wolfCount = levelConfig.wolfCount || 0;
      const wolfRadius = 18;
      
      for (let i = 0; i < wolfCount; i++) {
        // Place wolves at the edges of the screen
        let wolfX, wolfY;
        const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        
        switch (side) {
          case 0: // Top
            wolfX = Math.random() * this.canvas.width;
            wolfY = wolfRadius;
            break;
          case 1: // Right
            wolfX = this.canvas.width - wolfRadius;
            wolfY = Math.random() * this.canvas.height;
            break;
          case 2: // Bottom
            wolfX = Math.random() * this.canvas.width;
            wolfY = this.canvas.height - wolfRadius;
            break;
          case 3: // Left
            wolfX = wolfRadius;
            wolfY = Math.random() * this.canvas.height;
            break;
        }
        
        this.wolves.push(new Wolf(wolfX, wolfY, wolfRadius, this));
      }
      
      // Create obstacles
      const obstacleCount = levelConfig.obstacleCount || 0;
      
      for (let i = 0; i < obstacleCount; i++) {
        // Random obstacle size
        const width = Math.random() * 50 + 30;
        const height = Math.random() * 50 + 30;
        
        // Place obstacles randomly, but not too close to the pen or edges
        let obstacleX, obstacleY;
        let validPosition = false;
        let attempts = 0;
        
        while (!validPosition && attempts < 100) {
          attempts++;
          obstacleX = Math.random() * (this.canvas.width - width - 100) + 50;
          obstacleY = Math.random() * (this.canvas.height - height - 100) + 50;
          
          // Check distance from pen
          const dx = obstacleX - this.pen.x;
          const dy = obstacleY - this.pen.y;
          const distSquared = dx * dx + dy * dy;
          
          if (distSquared > 200 * 200) {
            validPosition = true;
            
            // Also check distance from other obstacles
            for (const obstacle of this.obstacles) {
              const ox = obstacleX - obstacle.x;
              const oy = obstacleY - obstacle.y;
              const oDistSquared = ox * ox + oy * oy;
              
              if (oDistSquared < 100 * 100) {
                validPosition = false;
                break;
              }
            }
          }
        }
        
        // If we couldn't find a valid position after 100 attempts, just place the obstacle somewhere
        if (!validPosition) {
          obstacleX = Math.random() * (this.canvas.width - width - 100) + 50;
          obstacleY = Math.random() * (this.canvas.height - height - 100) + 50;
        }
        
        this.obstacles.push(new Obstacle(obstacleX, obstacleY, width, height, this));
      }
      
      // Update HUD
      this.updateHUD();
      
      console.log("Level initialized successfully");
    } catch (error) {
      console.error("Error initializing level:", error);
    }
  }
  
  // Update HUD elements
  updateHUD() {
    document.getElementById('timeLeft').textContent = this.formatTime(this.timeRemaining);
    document.getElementById('sheepCount').textContent = `${this.sheepInPen}/${this.sheep.length}`;
    document.getElementById('currentLevel').textContent = this.level;
  }
  
  // Format time as MM:SS
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }
  
  // Load game assets
  loadAssets() {
    // Set up asset loading
    const assetsToLoad = 0; // Increment this when adding assets
    let assetsLoaded = 0;
    
    // Function to check if all assets are loaded
    const checkAllAssetsLoaded = () => {
      assetsLoaded++;
      if (assetsLoaded >= assetsToLoad) {
        // All assets loaded, show start screen
        this.state = GAME_STATE.START;
        this.showScreen(GAME_STATE.START);
      }
    };
    
    // If no assets to load, show start screen immediately
    if (assetsToLoad === 0) {
      this.state = GAME_STATE.START;
      this.showScreen(GAME_STATE.START);
    }
  }
  
  // Handle mouse movement
  handleMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
  
  // Handle mouse clicks
  handleMouseDown(event) {
    // Handle different game states
    switch (this.state) {
      case GAME_STATE.PLAYING:
        // Make the dog bark
        if (this.dog) {
          this.dog.bark();
        }
        break;
    }
  }
  
  // Main game loop
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
  
  // Update game state
  update(deltaTime) {
    // Cap delta time to prevent large jumps
    const cappedDeltaTime = Math.min(deltaTime, 0.1);
    
    // Update based on game state
    switch (this.state) {
      case GAME_STATE.PLAYING:
        // Make sure we have a dog and pen before updating
        if (!this.dog || !this.pen) {
          console.error("Dog or pen not initialized");
          return;
        }
        
        // Update time remaining
        this.timeRemaining -= cappedDeltaTime;
        if (this.timeRemaining <= 0) {
          // Check if player has won
          if (this.sheepInPen >= this.requiredSheepCount) {
            if (this.level < LEVEL_CONFIGS.length) {
              // Advance to next level
              this.state = GAME_STATE.WIN;
              this.showScreen(GAME_STATE.WIN);
            } else {
              // Player has completed all levels
              this.state = GAME_STATE.WIN;
              this.showScreen(GAME_STATE.WIN);
            }
          } else {
            // Game over
            this.state = GAME_STATE.GAME_OVER;
            this.showScreen(GAME_STATE.GAME_OVER);
          }
          return;
        }
        
        // Update dog
        if (this.dog) {
          this.dog.update(cappedDeltaTime);
        }
        
        // Update sheep
        for (const sheep of this.sheep) {
          sheep.update(cappedDeltaTime);
          
          // Check if sheep is in pen
          if (!sheep.inPen && this.pen && this.pen.containsPoint(sheep.x, sheep.y)) {
            sheep.inPen = true;
            this.sheepInPen++;
            
            // Add points for herding sheep
            this.score += 100;
            
            // Check if player has won the level
            if (this.sheepInPen >= this.requiredSheepCount) {
              // Add bonus points for remaining time
              const timeBonus = Math.floor(this.timeRemaining);
              this.score += timeBonus * 10;
              
              if (this.level < LEVEL_CONFIGS.length) {
                // Advance to next level
                this.state = GAME_STATE.WIN;
                this.showScreen(GAME_STATE.WIN);
              } else {
                // Player has completed all levels
                this.state = GAME_STATE.WIN;
                this.showScreen(GAME_STATE.WIN);
              }
            }
          } else if (sheep.inPen && this.pen && !this.pen.containsPoint(sheep.x, sheep.y)) {
            // Sheep has left the pen
            sheep.inPen = false;
            this.sheepInPen--;
          }
        }
        
        // Update wolves
        for (const wolf of this.wolves) {
          wolf.update(cappedDeltaTime);
        }
        
        // Update HUD
        this.updateHUD();
        break;
    }
  }
  
  // Render game
  render() {
    // Only render the game screen if we're in the playing state
    if (this.state === GAME_STATE.PLAYING) {
      // Clear canvas
      this.ctx.fillStyle = '#7fad71'; // Grass green
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Render game elements
      this.renderGameScreen();
    }
  }
  
  // Render game screen
  renderGameScreen() {
    // Only render if we're in the playing state
    if (this.state !== GAME_STATE.PLAYING) return;
    
    // Draw pen
    if (this.pen) {
      this.pen.draw(this.ctx);
    }
    
    // Draw obstacles
    for (const obstacle of this.obstacles) {
      obstacle.draw(this.ctx);
    }
    
    // Draw sheep
    for (const sheep of this.sheep) {
      sheep.draw(this.ctx);
    }
    
    // Draw wolves
    for (const wolf of this.wolves) {
      wolf.draw(this.ctx);
    }
    
    // Draw dog
    if (this.dog) {
      this.dog.draw(this.ctx);
    }
  }
  
  // Set up UI event listeners
  setupUIEventListeners() {
    // Start screen buttons
    document.getElementById('startButton').addEventListener('click', () => {
      console.log("Start button clicked");
      this.resizeCanvas(); // Ensure canvas is properly sized before starting
      this.initLevel(1);
      this.state = GAME_STATE.PLAYING;
      this.showScreen(GAME_STATE.PLAYING);
      
      // Force a redraw after a short delay to ensure everything is set up
      setTimeout(() => {
        console.log("Forcing redraw after start");
        this.resizeCanvas();
        this.render();
      }, 100);
    });
    
    document.getElementById('continueButton').addEventListener('click', () => {
      // Get highest unlocked level from localStorage
      this.resizeCanvas(); // Ensure canvas is properly sized before starting
      const highestLevel = localStorage.getItem('highestLevel') || 1;
      this.initLevel(parseInt(highestLevel));
      this.state = GAME_STATE.PLAYING;
      this.showScreen(GAME_STATE.PLAYING);
    });
    
    // Pause screen buttons
    document.getElementById('pauseButton').addEventListener('click', () => {
      this.state = GAME_STATE.PAUSED;
      this.showScreen('pauseScreen');
    });
    
    document.getElementById('resumeButton').addEventListener('click', () => {
      this.state = GAME_STATE.PLAYING;
      this.showScreen('gameScreen');
    });
    
    document.getElementById('restartButton').addEventListener('click', () => {
      this.initLevel(this.level);
      this.state = GAME_STATE.PLAYING;
      this.showScreen('gameScreen');
    });
    
    document.getElementById('quitButton').addEventListener('click', () => {
      this.state = GAME_STATE.START;
      this.showScreen('startScreen');
    });
    
    // Win screen buttons
    document.getElementById('nextLevelButton').addEventListener('click', () => {
      this.level++;
      this.initLevel(this.level);
      this.state = GAME_STATE.PLAYING;
      this.showScreen('gameScreen');
    });
    
    document.getElementById('replayLevelButton').addEventListener('click', () => {
      this.initLevel(this.level);
      this.state = GAME_STATE.PLAYING;
      this.showScreen('gameScreen');
    });
    
    document.getElementById('menuButton').addEventListener('click', () => {
      this.state = GAME_STATE.START;
      this.showScreen('startScreen');
    });
    
    // Game over screen buttons
    document.getElementById('tryAgainButton').addEventListener('click', () => {
      this.initLevel(this.level);
      this.state = GAME_STATE.PLAYING;
      this.showScreen('gameScreen');
    });
    
    document.getElementById('gameOverMenuButton').addEventListener('click', () => {
      this.state = GAME_STATE.START;
      this.showScreen('startScreen');
    });
    
    // Generate level buttons
    this.generateLevelButtons();
  }
  
  // Generate level selection buttons
  generateLevelButtons() {
    const levelButtonsContainer = document.getElementById('levelButtons');
    levelButtonsContainer.innerHTML = '';
    
    // Get highest unlocked level from localStorage
    const highestLevel = parseInt(localStorage.getItem('highestLevel') || 1);
    
    for (let i = 0; i < LEVEL_CONFIGS.length; i++) {
      const levelButton = document.createElement('button');
      levelButton.textContent = `Level ${i + 1}`;
      levelButton.classList.add('level-button');
      
      if (i + 1 > highestLevel) {
        levelButton.classList.add('locked');
        levelButton.disabled = true;
      } else {
        levelButton.addEventListener('click', () => {
          this.initLevel(i + 1);
          this.state = GAME_STATE.PLAYING;
          this.showScreen('gameScreen');
        });
      }
      
      levelButtonsContainer.appendChild(levelButton);
    }
  }
  
  // Show a specific screen
  showScreen(screenName) {
    console.log(`Showing screen: ${screenName}`);
    
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
      screen.style.display = 'none';
    });
    
    // Show the requested screen
    let screenId;
    
    switch (screenName) {
      case GAME_STATE.LOADING:
        screenId = 'loadingScreen';
        break;
      case GAME_STATE.START:
        screenId = 'startScreen';
        break;
      case GAME_STATE.PLAYING:
        screenId = 'gameScreen';
        // Ensure canvas is properly sized when showing game screen
        setTimeout(() => {
          console.log("Resizing canvas after showing game screen");
          this.resizeCanvas();
          this.render();
        }, 50);
        break;
      case GAME_STATE.WIN:
        screenId = 'winScreen';
        this.updateWinScreen();
        break;
      case GAME_STATE.GAME_OVER:
        screenId = 'gameOverScreen';
        this.updateGameOverScreen();
        break;
      case 'pauseScreen':
        screenId = 'pauseScreen';
        break;
      default:
        screenId = screenName;
    }
    
    document.getElementById(screenId).style.display = 'flex';
  }
  
  // Update win screen with current stats
  updateWinScreen() {
    document.getElementById('finalSheepCount').textContent = `${this.sheepInPen}/${this.sheep.length}`;
    
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = Math.floor(this.timeRemaining % 60);
    document.getElementById('timeRemaining').textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    
    document.getElementById('finalScore').textContent = this.score;
    
    // Save progress
    const highestLevel = parseInt(localStorage.getItem('highestLevel') || 1);
    if (this.level + 1 > highestLevel) {
      localStorage.setItem('highestLevel', this.level + 1);
      this.generateLevelButtons();
    }
  }
  
  // Update game over screen with current stats
  updateGameOverScreen() {
    document.getElementById('gameOverSheepCount').textContent = `${this.sheepInPen}/${this.sheep.length}`;
    document.getElementById('gameOverScore').textContent = this.score;
  }
}

// Constants
const GAME_STATE = {
  LOADING: 'loading',
  START: 'start',
  PLAYING: 'playing',
  PAUSED: 'paused',
  WIN: 'win',
  GAME_OVER: 'gameOver'
};

const LEVEL_TIME = 120; // 2 minutes per level

const LEVEL_CONFIGS = [
  {
    sheepCount: 4,
    requiredSheepCount: 3,
    wolfCount: 0,
    obstacleCount: 2
  },
  {
    sheepCount: 8,
    requiredSheepCount: 6,
    wolfCount: 0,
    obstacleCount: 4
  },
  {
    sheepCount: 10,
    requiredSheepCount: 8,
    wolfCount: 1,
    obstacleCount: 5
  },
  {
    sheepCount: 12,
    requiredSheepCount: 10,
    wolfCount: 2,
    obstacleCount: 6
  },
  {
    sheepCount: 15,
    requiredSheepCount: 12,
    wolfCount: 3,
    obstacleCount: 8
  }
];

// Sheep class
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
    this.fleeRadius = 100;
    this.fleeSpeed = 150;
    this.minSpeed = 15; // Minimum speed to ensure sheep always move
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
      
      // Slow down over time
      this.vx *= 0.95;
      this.vy *= 0.95;
      
      // Apply minimum speed if sheep is nearly stopped
      if (Math.abs(this.vx) < this.minSpeed && Math.abs(this.vy) < this.minSpeed) {
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * this.minSpeed;
        this.vy = Math.sin(angle) * this.minSpeed;
      }
      
      // Move sheep
      this.x += this.vx * deltaTime;
      this.y += this.vy * deltaTime;
      
      // Keep sheep in pen
      if (this.game.pen) {
        const pen = this.game.pen;
        
        if (this.x < pen.x + this.radius) {
          this.x = pen.x + this.radius;
          this.vx *= -0.8;
        } else if (this.x > pen.x + pen.width - this.radius) {
          this.x = pen.x + pen.width - this.radius;
          this.vx *= -0.8;
        }
        
        if (this.y < pen.y + this.radius) {
          this.y = pen.y + this.radius;
          this.vy *= -0.8;
        } else if (this.y > pen.y + pen.height - this.radius) {
          this.y = pen.y + pen.height - this.radius;
          this.vy *= -0.8;
        }
      }
      
      return;
    }
    
    // Skip movement if in pen
    if (this.inPen) {
      this.vx = 0;
      this.vy = 0;
      return;
    }
    
    // Apply flocking behaviors
    this.flock(deltaTime);
    
    // Update position
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    
    // Bounce sheep off canvas bounds instead of just stopping them
    if (this.x <= this.radius) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx) * 0.8; // Bounce with some energy loss
    } else if (this.x >= this.game.canvas.width - this.radius) {
      this.x = this.game.canvas.width - this.radius;
      this.vx = -Math.abs(this.vx) * 0.8; // Bounce with some energy loss
    }
    
    if (this.y <= this.radius) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy) * 0.8; // Bounce with some energy loss
    } else if (this.y >= this.game.canvas.height - this.radius) {
      this.y = this.game.canvas.height - this.radius;
      this.vy = -Math.abs(this.vy) * 0.8; // Bounce with some energy loss
    }
    
    // Slow down if not being chased (damping)
    if (!this.isBeingChased()) {
      this.vx *= 0.95;
      this.vy *= 0.95;
    }
    
    // Ensure sheep always have some minimum movement
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const minSpeed = this.maxSpeed * 0.1; // 10% of max speed as minimum
    
    if (speed < minSpeed) {
      // If moving too slowly, add a small random movement
      const angle = Math.random() * Math.PI * 2;
      this.vx += Math.cos(angle) * minSpeed * 0.5;
      this.vy += Math.sin(angle) * minSpeed * 0.5;
      
      // Normalize to minimum speed
      const newSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      this.vx = (this.vx / newSpeed) * minSpeed;
      this.vy = (this.vy / newSpeed) * minSpeed;
    }
  }
  
  isBeingChased() {
    // Check if dog is nearby
    if (this.game.dog) {
      const dx = this.x - this.game.dog.x;
      const dy = this.y - this.game.dog.y;
      const distSquared = dx * dx + dy * dy;
      
      if (distSquared < this.fleeRadius * this.fleeRadius) {
        return true;
      }
    }
    
    // Check if wolf is nearby
    for (const wolf of this.game.wolves) {
      const dx = this.x - wolf.x;
      const dy = this.y - wolf.y;
      const distSquared = dx * dx + dy * dy;
      
      if (distSquared < this.fleeRadius * this.fleeRadius) {
        return true;
      }
    }
    
    return false;
  }
  
  flock(deltaTime) {
    // Calculate flocking forces
    const separation = this.calculateSeparation();
    const alignment = this.calculateAlignment();
    const cohesion = this.calculateCohesion();
    const dogAvoidance = this.calculateDogAvoidance();
    const wolfAvoidance = this.calculateWolfAvoidance();
    const obstacleAvoidance = this.calculateObstacleAvoidance();
    
    // Apply forces with weights
    this.vx += separation.x * 1.5 +
               alignment.x * 1.0 +
               cohesion.x * 1.0 +
               dogAvoidance.x * 2.0 +
               wolfAvoidance.x * 2.5 +
               obstacleAvoidance.x * 2.0;
               
    this.vy += separation.y * 1.5 +
               alignment.y * 1.0 +
               cohesion.y * 1.0 +
               dogAvoidance.y * 2.0 +
               wolfAvoidance.y * 2.5 +
               obstacleAvoidance.y * 2.0;
    
    // Limit speed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const maxCurrentSpeed = this.isBeingChased() ? this.fleeSpeed : this.maxSpeed;
    
    if (speed > maxCurrentSpeed) {
      this.vx = (this.vx / speed) * maxCurrentSpeed;
      this.vy = (this.vy / speed) * maxCurrentSpeed;
    }
  }
  
  calculateSeparation() {
    let steerX = 0;
    let steerY = 0;
    let count = 0;
    
    for (const sheep of this.game.sheep) {
      if (sheep !== this) {
        const dx = this.x - sheep.x;
        const dy = this.y - sheep.y;
        const distSquared = dx * dx + dy * dy;
        
        if (distSquared < 900) {
          // Weight by distance (closer = stronger)
          const dist = Math.sqrt(distSquared);
          steerX += (dx / dist) * (30 - dist);
          steerY += (dy / dist) * (30 - dist);
          count++;
        }
      }
    }
    
    if (count > 0) {
      steerX /= count;
      steerY /= count;
    }
    
    return { x: steerX, y: steerY };
  }
  
  calculateAlignment() {
    let avgVX = 0;
    let avgVY = 0;
    let count = 0;
    
    for (const sheep of this.game.sheep) {
      if (sheep !== this && !sheep.inPen) {
        const dx = sheep.x - this.x;
        const dy = sheep.y - this.y;
        const distSquared = dx * dx + dy * dy;
        
        if (distSquared < 10000) {
          avgVX += sheep.vx;
          avgVY += sheep.vy;
          count++;
        }
      }
    }
    
    if (count > 0) {
      avgVX /= count;
      avgVY /= count;
      
      // Normalize and scale
      const len = Math.sqrt(avgVX * avgVX + avgVY * avgVY);
      if (len > 0) {
        avgVX = avgVX / len;
        avgVY = avgVY / len;
      }
    }
    
    return { x: avgVX, y: avgVY };
  }
  
  calculateCohesion() {
    let centerX = 0;
    let centerY = 0;
    let count = 0;
    
    for (const sheep of this.game.sheep) {
      if (sheep !== this && !sheep.inPen) {
        const dx = sheep.x - this.x;
        const dy = sheep.y - this.y;
        const distSquared = dx * dx + dy * dy;
        
        if (distSquared < 10000) {
          centerX += sheep.x;
          centerY += sheep.y;
          count++;
        }
      }
    }
    
    if (count > 0) {
      centerX /= count;
      centerY /= count;
      
      // Direction to center
      const dx = centerX - this.x;
      const dy = centerY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        return { x: dx / dist, y: dy / dist };
      }
    }
    
    return { x: 0, y: 0 };
  }
  
  calculateDogAvoidance() {
    if (!this.game.dog) {
      return { x: 0, y: 0 };
    }
    
    const dx = this.x - this.game.dog.x;
    const dy = this.y - this.game.dog.y;
    const distSquared = dx * dx + dy * dy;
    
    if (distSquared < this.fleeRadius * this.fleeRadius) {
      const dist = Math.sqrt(distSquared);
      
      // Flee force increases as dog gets closer
      const fleeFactor = 1.0 - dist / this.fleeRadius;
      
      // Increase flee speed if dog is barking
      const barkMultiplier = this.game.dog.barkDuration > 0 ? 2.0 : 1.0;
      
      return {
        x: (dx / dist) * fleeFactor * barkMultiplier,
        y: (dy / dist) * fleeFactor * barkMultiplier
      };
    }
    
    return { x: 0, y: 0 };
  }
  
  calculateWolfAvoidance() {
    let steerX = 0;
    let steerY = 0;
    
    for (const wolf of this.game.wolves) {
      const dx = this.x - wolf.x;
      const dy = this.y - wolf.y;
      const distSquared = dx * dx + dy * dy;
      
      if (distSquared < this.fleeRadius * this.fleeRadius) {
        const dist = Math.sqrt(distSquared);
        
        // Flee force increases as wolf gets closer
        const fleeFactor = 1.0 - dist / this.fleeRadius;
        
        steerX += (dx / dist) * fleeFactor;
        steerY += (dy / dist) * fleeFactor;
      }
    }
    
    return { x: steerX, y: steerY };
  }
  
  calculateObstacleAvoidance() {
    let steerX = 0;
    let steerY = 0;
    
    for (const obstacle of this.game.obstacles) {
      // Find closest point on obstacle to sheep
      const closestX = Math.max(obstacle.x, Math.min(this.x, obstacle.x + obstacle.width));
      const closestY = Math.max(obstacle.y, Math.min(this.y, obstacle.y + obstacle.height));
      
      const dx = this.x - closestX;
      const dy = this.y - closestY;
      const distSquared = dx * dx + dy * dy;
      
      if (distSquared < 2500) {
        const dist = Math.sqrt(distSquared);
        
        // Avoidance force increases as sheep gets closer to obstacle
        const avoidFactor = 1.0 - dist / 50;
        
        steerX += (dx / dist) * avoidFactor;
        steerY += (dy / dist) * avoidFactor;
      }
    }
    
    // Also avoid pen walls (except when already in pen)
    if (!this.inPen && this.game.pen) {
      const pen = this.game.pen;
      
      // Only avoid if close to pen but not inside
      if (!pen.containsPoint(this.x, this.y)) {
        // Find closest point on pen to sheep
        const closestX = Math.max(pen.x, Math.min(this.x, pen.x + pen.width));
        const closestY = Math.max(pen.y, Math.min(this.y, pen.y + pen.height));
        
        const dx = this.x - closestX;
        const dy = this.y - closestY;
        const distSquared = dx * dx + dy * dy;
        
        if (distSquared < 2500) {
          const dist = Math.sqrt(distSquared);
          
          // Avoidance force increases as sheep gets closer to pen
          const avoidFactor = 1.0 - dist / 50;
          
          steerX += (dx / dist) * avoidFactor;
          steerY += (dy / dist) * avoidFactor;
        }
      }
    }
    
    return { x: steerX, y: steerY };
  }
  
  draw(ctx) {
    // Draw sheep body
    ctx.fillStyle = this.inPen ? '#AAAAAA' : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw sheep head (in direction of movement)
    let headAngle = 0;
    if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
      headAngle = Math.atan2(this.vy, this.vx);
    }
    
    const headX = this.x + Math.cos(headAngle) * this.radius * 0.8;
    const headY = this.y + Math.sin(headAngle) * this.radius * 0.8;
    
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(headX, headY, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Dog class
class Dog {
  constructor(x, y, radius, game) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.game = game;
    this.speed = 300;
    this.barkRadius = 150;
    this.barkDuration = 0;
    this.barkCooldown = 0;
    this.maxBarkDuration = 0.5; // 0.5 seconds
    this.maxBarkCooldown = 1.5; // 1.5 seconds
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
      
      // Check for collision with obstacles
      let canMove = true;
      for (const obstacle of this.game.obstacles) {
        const newX = this.x + moveX;
        const newY = this.y + moveY;
        
        if (obstacle.containsPoint(newX, newY, this.radius)) {
          canMove = false;
          break;
        }
      }
      
      if (canMove) {
        this.x += moveX;
        this.y += moveY;
      }
      
      // Keep dog within canvas bounds
      this.x = Math.max(this.radius, Math.min(this.x, this.game.canvas.width - this.radius));
      this.y = Math.max(this.radius, Math.min(this.y, this.game.canvas.height - this.radius));
    }
    
    // Update bark
    if (this.barkDuration > 0) {
      this.barkDuration -= deltaTime;
    } else if (this.barkCooldown > 0) {
      this.barkCooldown -= deltaTime;
    }
  }
  
  bark() {
    if (this.barkCooldown <= 0) {
      this.barkDuration = this.maxBarkDuration;
      this.barkCooldown = this.maxBarkCooldown;
    }
  }
  
  draw(ctx) {
    // Draw dog
    ctx.fillStyle = '#8B4513'; // Brown
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw ears
    ctx.fillStyle = '#5D3A1A'; // Darker brown
    ctx.beginPath();
    ctx.ellipse(this.x - this.radius * 0.7, this.y - this.radius * 0.7, this.radius * 0.5, this.radius * 0.7, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(this.x + this.radius * 0.7, this.y - this.radius * 0.7, this.radius * 0.5, this.radius * 0.7, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eyes
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.2, this.radius * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(this.x + this.radius * 0.3, this.y - this.radius * 0.2, this.radius * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw nose
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.radius * 0.3, this.radius * 0.2, this.radius * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw bark effect if barking
    if (this.barkDuration > 0) {
      const opacity = this.barkDuration / this.maxBarkDuration;
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.barkRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw bark text
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('WOOF!', this.x, this.y - this.radius * 2);
    }
  }
}

// Pen class
class Pen {
  constructor(x, y, width, height, game) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.game = game;
    
    // Define entrance area
    this.entranceWidth = 80;
    this.entranceX = this.x + (this.width - this.entranceWidth) / 2;
    this.entranceY = this.y + this.height;
  }
  
  containsPoint(x, y) {
    // Check if point is inside pen
    const insidePen = x >= this.x && x <= this.x + this.width &&
                      y >= this.y && y <= this.y + this.height;
    
    // If the sheep is near the entrance, make it easier to enter
    const nearEntrance = x >= this.entranceX && x <= this.entranceX + this.entranceWidth &&
                         y >= this.entranceY - 20 && y <= this.entranceY + 10;
    
    // Return true if inside pen or if near entrance (to make it easier to enter)
    return insidePen || nearEntrance;
  }
  
  draw(ctx) {
    // Draw pen floor with a more visible color
    ctx.fillStyle = '#F5DEB3'; // Wheat color for pen floor
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Draw fence posts with thicker lines
    ctx.fillStyle = '#8B4513'; // Brown for fence
    
    const postWidth = 15; // Thicker posts
    const postSpacing = 40;
    
    // Draw horizontal fence posts (top and bottom)
    for (let x = this.x; x <= this.x + this.width; x += postSpacing) {
      // Top fence
      ctx.fillRect(x - postWidth / 2, this.y - postWidth, postWidth, postWidth);
      ctx.fillRect(x - postWidth / 2, this.y - postWidth * 3, postWidth, postWidth * 2);
      
      // Bottom fence - skip the entrance area
      if (x < this.entranceX - postWidth/2 || x > this.entranceX + this.entranceWidth + postWidth/2) {
        ctx.fillRect(x - postWidth / 2, this.y + this.height, postWidth, postWidth);
        ctx.fillRect(x - postWidth / 2, this.y + this.height + postWidth, postWidth, postWidth * 2);
      }
    }
    
    // Draw vertical fence posts (left and right)
    for (let y = this.y; y <= this.y + this.height; y += postSpacing) {
      // Left fence
      ctx.fillRect(this.x - postWidth, y - postWidth / 2, postWidth, postWidth);
      ctx.fillRect(this.x - postWidth * 3, y - postWidth / 2, postWidth * 2, postWidth);
      
      // Right fence
      ctx.fillRect(this.x + this.width, y - postWidth / 2, postWidth, postWidth);
      ctx.fillRect(this.x + this.width + postWidth, y - postWidth / 2, postWidth * 2, postWidth);
    }
    
    // Draw entrance (bottom side)
    const entranceWidth = this.entranceWidth;
    const entranceX = this.entranceX;
    
    // Clear the entrance area
    ctx.fillStyle = '#F5DEB3'; // Wheat color for pen floor
    ctx.fillRect(entranceX, this.y + this.height - 5, entranceWidth, 15);
    
    // Add a sign to make the pen more visible
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(this.x + this.width / 2 - 40, this.y - 60, 80, 40);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PEN', this.x + this.width / 2, this.y - 30);
  }
}

// Obstacle class
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
    ctx.fillStyle = '#808080'; // Gray
    ctx.beginPath();
    ctx.ellipse(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Add some highlights
    ctx.fillStyle = '#A0A0A0'; // Lighter gray
    ctx.beginPath();
    ctx.ellipse(this.x + this.width * 0.3, this.y + this.height * 0.3, this.width * 0.2, this.height * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
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
    // Draw bush
    const bushRadius = Math.min(this.width, this.height) / 2;
    const bushX = this.x + this.width / 2;
    const bushY = this.y + this.height / 2;
    
    ctx.fillStyle = '#228B22'; // Forest green
    ctx.beginPath();
    ctx.arc(bushX, bushY, bushRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Add some details
    ctx.fillStyle = '#32CD32'; // Lime green
    ctx.beginPath();
    ctx.arc(bushX - bushRadius * 0.3, bushY - bushRadius * 0.3, bushRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(bushX + bushRadius * 0.4, bushY - bushRadius * 0.1, bushRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(bushX, bushY + bushRadius * 0.4, bushRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Wolf class
class Wolf {
  constructor(x, y, radius, game) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.game = game;
    this.speed = 200;
    this.chaseSpeed = 300;
    this.targetSheep = null;
  }
  
  update(deltaTime) {
    // Find closest sheep to chase
    if (!this.targetSheep) {
      let closestSheep = null;
      let closestDistance = Infinity;
      
      for (const sheep of this.game.sheep) {
        if (!sheep.inPen) {
          const dx = this.x - sheep.x;
          const dy = this.y - sheep.y;
          const distSquared = dx * dx + dy * dy;
          const dist = Math.sqrt(distSquared);
          
          if (dist < closestDistance) {
            closestSheep = sheep;
            closestDistance = dist;
          }
        }
      }
      
      this.targetSheep = closestSheep;
    }
    
    // Chase target sheep
    if (this.targetSheep) {
      const dx = this.targetSheep.x - this.x;
      const dy = this.targetSheep.y - this.y;
      const distSquared = dx * dx + dy * dy;
      const dist = Math.sqrt(distSquared);
      
      // Move towards sheep
      const moveX = (dx / dist) * this.chaseSpeed * deltaTime;
      const moveY = (dy / dist) * this.chaseSpeed * deltaTime;
      
      this.x += moveX;
      this.y += moveY;
      
      // Keep wolf within canvas bounds
      this.x = Math.max(this.radius, Math.min(this.x, this.game.canvas.width - this.radius));
      this.y = Math.max(this.radius, Math.min(this.y, this.game.canvas.height - this.radius));
      
      // Check if wolf has caught sheep
      if (dist < this.radius + this.targetSheep.radius) {
        // Remove sheep from game
        this.game.sheep.splice(this.game.sheep.indexOf(this.targetSheep), 1);
        this.targetSheep = null;
      }
    } else {
      // Move randomly if no sheep to chase
      const angle = Math.random() * Math.PI * 2;
      this.x += Math.cos(angle) * this.speed * deltaTime;
      this.y += Math.sin(angle) * this.speed * deltaTime;
      
      // Keep wolf within canvas bounds
      this.x = Math.max(this.radius, Math.min(this.x, this.game.canvas.width - this.radius));
      this.y = Math.max(this.radius, Math.min(this.y, this.game.canvas.height - this.radius));
    }
  }
  
  draw(ctx) {
    // Draw wolf body
    ctx.fillStyle = '#964B00'; // Brown
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw wolf head (in direction of movement)
    let headAngle = 0;
    if (Math.abs(this.x) > 0.1 || Math.abs(this.y) > 0.1) {
      headAngle = Math.atan2(this.y, this.x);
    }
    
    const headX = this.x + Math.cos(headAngle) * this.radius * 0.8;
    const headY = this.y + Math.sin(headAngle) * this.radius * 0.8;
    
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(headX, headY, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Initialize the game when the document is loaded
window.addEventListener('load', () => {
  // Create stylesheet
  createStylesheet();
  
  // Create game instance
  const game = new Game();
});

// Create stylesheet
function createStylesheet() {
  // Check if stylesheet already exists
  if (document.getElementById('game-styles')) {
    return;
  }
  
  // Create stylesheet
  const style = document.createElement('style');
  style.id = 'game-styles';
  
  style.textContent = `
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      background-color: #333;
      color: #fff;
      overflow: hidden;
    }
    
    .screen {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10;
    }
    
    #loadingScreen {
      background-color: #333;
    }
    
    #startScreen {
      background-color: rgba(0, 0, 0, 0.8);
      text-align: center;
    }
    
    #gameScreen {
      display: none;
      flex-direction: column;
      justify-content: flex-start;
      align-items: stretch;
      background-color: #7fad71;
    }
    
    #pauseScreen, #winScreen, #gameOverScreen {
      background-color: rgba(0, 0, 0, 0.8);
      text-align: center;
    }
    
    .buttons {
      margin: 20px 0;
    }
    
    button {
      padding: 10px 20px;
      margin: 0 10px;
      font-size: 16px;
      cursor: pointer;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 5px;
      transition: background-color 0.3s;
    }
    
    button:hover {
      background-color: #45a049;
    }
    
    button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    
    .level-button {
      padding: 8px 16px;
      margin: 5px;
      font-size: 14px;
    }
    
    .level-button.locked {
      background-color: #999;
    }
    
    .instructions, .level-select {
      margin: 20px 0;
      max-width: 600px;
    }
    
    .hud {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      background-color: rgba(0, 0, 0, 0.5);
      color: white;
    }
    
    .timer, .score, .level {
      padding: 5px 10px;
      font-size: 16px;
      font-weight: bold;
    }
    
    #pauseButton {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 5;
    }
    
    #gameCanvas {
      width: 100%;
      height: calc(100% - 50px);
      display: block;
    }
    
    .progress-bar {
      width: 300px;
      height: 20px;
      background-color: #555;
      border-radius: 10px;
      margin-top: 20px;
      overflow: hidden;
    }
    
    .progress {
      width: 0%;
      height: 100%;
      background-color: #4CAF50;
      transition: width 0.3s;
    }
    
    .stats {
      margin: 20px 0;
      font-size: 18px;
    }
  `;
  
  document.head.appendChild(style);
}