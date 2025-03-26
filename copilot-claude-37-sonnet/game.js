// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const DOG_RADIUS = 15;
const SHEEP_RADIUS = 10;
const DOG_COLOR = '#8B4513';
const SHEEP_COLOR = '#FFFFFF';
const PEN_COLOR = '#8B4513';
const OBSTACLE_COLOR = '#696969';
const WOLF_COLOR = '#606060';
const TREE_COLOR = '#228B22';
const ROCK_COLOR = '#A9A9A9';
const WATER_COLOR = '#4682B4';

// Game Configuration
const SHEEP_COUNT = 50;
const SHEEP_SPEED = 2;
const DOG_SPEED = 4;
const BARK_EFFECT_DURATION = 2000; // milliseconds
const BARK_SPEED_MULTIPLIER = 1.5;
const TIME_LIMIT_BASE = 60; // seconds
const TIME_LIMIT_INCREMENT = 10; // seconds added per level
const TOTAL_LEVELS = 10;

// Flocking parameters
const SEPARATION_DISTANCE = 20;
const SEPARATION_FORCE = 0.05;
const ALIGNMENT_DISTANCE = 50;
const ALIGNMENT_FORCE = 0.05;
const COHESION_DISTANCE = 70;
const COHESION_FORCE = 0.05;
const DOG_INFLUENCE_DISTANCE = 150;
const DOG_REPULSION_FORCE = 0.1;
const WOLF_INFLUENCE_DISTANCE = 200;
const WOLF_REPULSION_FORCE = 0.15;
const OBSTACLE_AVOIDANCE_DISTANCE = 40;
const OBSTACLE_AVOIDANCE_FORCE = 0.1;
const PEN_ATTRACTION_FORCE = 0.01; // Slight attraction to pen when dog is nearby

// Canvas and Context
let canvas, ctx;
let gameActive = false;
let currentLevel = 1;
let timeLeft = 0;
let score = 0;
let barkActive = false;
let barkTimer = null;
let gameLoop = null;

// Game state and entities
let dog;
let sheep = [];
let obstacles = [];
let wolves = [];
let pen;
let progressData = {
  currentLevel: 1,
  highestLevelReached: 1
};

// Entity Classes
class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(v) {
    return new Vector(this.x + v.x, this.y + v.y);
  }

  subtract(v) {
    return new Vector(this.x - v.x, this.y - v.y);
  }

  multiply(scalar) {
    return new Vector(this.x * scalar, this.y * scalar);
  }

  divide(scalar) {
    return new Vector(this.x / scalar, this.y / scalar);
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    const mag = this.magnitude();
    if (mag === 0) return new Vector(0, 0);
    return this.divide(mag);
  }

  limit(max) {
    if (this.magnitude() > max) {
      return this.normalize().multiply(max);
    }
    return new Vector(this.x, this.y);
  }

  distance(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

class Dog {
  constructor(x, y) {
    this.position = new Vector(x, y);
    this.velocity = new Vector(0, 0);
    this.radius = DOG_RADIUS;
    this.color = DOG_COLOR;
    this.barking = false;
  }

  update(mousePos) {
    if (mousePos) {
      const target = new Vector(mousePos.x, mousePos.y);
      const direction = target.subtract(this.position);
      const distance = direction.magnitude();

      if (distance > 5) {
        this.velocity = direction.normalize().multiply(DOG_SPEED);
        this.position = this.position.add(this.velocity);
      }
    }

    // Keep dog within canvas boundaries
    this.position.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.position.x));
    this.position.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.position.y));
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Draw dog face direction (simple eyes and nose)
    if (this.velocity.magnitude() > 0) {
      const direction = this.velocity.normalize();
      const eyeOffset = 5;
      const eyeRadius = 3;

      // Eyes
      ctx.beginPath();
      ctx.arc(
        this.position.x + direction.x * eyeOffset - direction.y * eyeOffset/2,
        this.position.y + direction.y * eyeOffset + direction.x * eyeOffset/2,
        eyeRadius, 0, Math.PI * 2
      );
      ctx.fillStyle = 'black';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(
        this.position.x + direction.x * eyeOffset + direction.y * eyeOffset/2,
        this.position.y + direction.y * eyeOffset - direction.x * eyeOffset/2,
        eyeRadius, 0, Math.PI * 2
      );
      ctx.fillStyle = 'black';
      ctx.fill();

      // Nose
      ctx.beginPath();
      ctx.arc(
        this.position.x + direction.x * this.radius,
        this.position.y + direction.y * this.radius,
        eyeRadius, 0, Math.PI * 2
      );
      ctx.fillStyle = 'black';
      ctx.fill();
    }

    // Visualize barking if active
    if (this.barking) {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  bark() {
    this.barking = true;
    barkActive = true;

    // Clear any existing bark timer
    if (barkTimer) clearTimeout(barkTimer);

    // Set a timer to stop the bark effect
    barkTimer = setTimeout(() => {
      this.barking = false;
      barkActive = false;
    }, BARK_EFFECT_DURATION);
  }
}

class Sheep {
  constructor(x, y) {
    this.position = new Vector(x, y);
    this.velocity = new Vector(Math.random() * 2 - 1, Math.random() * 2 - 1);
    this.acceleration = new Vector(0, 0);
    this.radius = SHEEP_RADIUS;
    this.color = SHEEP_COLOR;
    this.maxSpeed = SHEEP_SPEED;
    this.inPen = false;
    this.individualFactor = Math.random() * 0.1; // Randomness factor for individual behavior
  }

  applyForce(force) {
    this.acceleration = this.acceleration.add(force);
  }

  flock(sheep, dog, pen, obstacles, wolves) {
    const separation = this.separate(sheep);
    const alignment = this.align(sheep);
    const cohesion = this.cohere(sheep);
    const avoidDog = this.avoidEntity(dog, DOG_INFLUENCE_DISTANCE, DOG_REPULSION_FORCE);
    const avoidObstacles = this.avoidObstacles(obstacles);

    // Only apply pen attraction if dog is nearby
    let penAttraction = new Vector(0, 0);
    if (this.position.distance(dog.position) < DOG_INFLUENCE_DISTANCE * 1.5) {
      penAttraction = this.seekPen(pen);
    }

    // Avoid wolves if present
    let avoidWolves = new Vector(0, 0);
    if (wolves.length > 0) {
      wolves.forEach(wolf => {
        const avoid = this.avoidEntity(wolf, WOLF_INFLUENCE_DISTANCE, WOLF_REPULSION_FORCE);
        avoidWolves = avoidWolves.add(avoid);
      });
    }

    // Apply all forces with their respective weights
    this.applyForce(separation.multiply(SEPARATION_FORCE));
    this.applyForce(alignment.multiply(ALIGNMENT_FORCE));
    this.applyForce(cohesion.multiply(COHESION_FORCE));
    this.applyForce(avoidDog);
    this.applyForce(avoidObstacles);
    this.applyForce(penAttraction.multiply(PEN_ATTRACTION_FORCE));
    this.applyForce(avoidWolves);

    // Add some individual randomness
    if (Math.random() < 0.01) {
      this.applyForce(new Vector(Math.random() * 2 - 1, Math.random() * 2 - 1).multiply(this.individualFactor));
    }
  }

  avoidEntity(entity, influenceDistance, force) {
    const distance = this.position.distance(entity.position);

    if (distance < influenceDistance) {
      const diff = this.position.subtract(entity.position);
      const steer = diff.normalize().multiply(force * (influenceDistance / Math.max(distance, 1)));
      return steer;
    }

    return new Vector(0, 0);
  }

  separate(sheep) {
    let count = 0;
    let steer = new Vector(0, 0);

    for (const other of sheep) {
      if (other !== this) {
        const distance = this.position.distance(other.position);

        if (distance < SEPARATION_DISTANCE) {
          const diff = this.position.subtract(other.position);
          diff.normalize();
          diff.divide(Math.max(distance, 0.1)); // Weight by distance
          steer = steer.add(diff);
          count++;
        }
      }
    }

    if (count > 0) {
      steer = steer.divide(count);
    }

    if (steer.magnitude() > 0) {
      steer = steer.normalize().multiply(this.maxSpeed);
      steer = steer.subtract(this.velocity);
      steer = steer.limit(0.5);
    }

    return steer;
  }

  align(sheep) {
    let count = 0;
    let sum = new Vector(0, 0);

    for (const other of sheep) {
      if (other !== this) {
        const distance = this.position.distance(other.position);

        if (distance < ALIGNMENT_DISTANCE) {
          sum = sum.add(other.velocity);
          count++;
        }
      }
    }

    if (count > 0) {
      sum = sum.divide(count);
      sum = sum.normalize().multiply(this.maxSpeed);
      const steer = sum.subtract(this.velocity);
      return steer.limit(0.3);
    }

    return new Vector(0, 0);
  }

  cohere(sheep) {
    let count = 0;
    let sum = new Vector(0, 0);

    for (const other of sheep) {
      if (other !== this) {
        const distance = this.position.distance(other.position);

        if (distance < COHESION_DISTANCE) {
          sum = sum.add(other.position);
          count++;
        }
      }
    }

    if (count > 0) {
      sum = sum.divide(count);
      return this.seek(sum);
    }

    return new Vector(0, 0);
  }

  seek(target) {
    const desired = target.subtract(this.position);
    desired.normalize();
    desired.multiply(this.maxSpeed);
    const steer = desired.subtract(this.velocity);
    return steer.limit(0.1);
  }

  seekPen(pen) {
    const penCenter = new Vector(pen.x + pen.width / 2, pen.y + pen.height / 2);
    return this.seek(penCenter);
  }

  avoidObstacles(obstacles) {
    let steer = new Vector(0, 0);

    for (const obstacle of obstacles) {
      // For circular obstacles
      if (obstacle.type === 'circle') {
        const distance = this.position.distance(new Vector(obstacle.x, obstacle.y)) - obstacle.radius - this.radius;

        if (distance < OBSTACLE_AVOIDANCE_DISTANCE) {
          const diff = this.position.subtract(new Vector(obstacle.x, obstacle.y));
          const force = diff.normalize().multiply(OBSTACLE_AVOIDANCE_FORCE * (OBSTACLE_AVOIDANCE_DISTANCE / Math.max(distance, 1)));
          steer = steer.add(force);
        }
      }
      // For rectangular obstacles
      else if (obstacle.type === 'rect') {
        // Find the closest point on the rectangle to the sheep
        const closestX = Math.max(obstacle.x, Math.min(this.position.x, obstacle.x + obstacle.width));
        const closestY = Math.max(obstacle.y, Math.min(this.position.y, obstacle.y + obstacle.height));
        const closestPoint = new Vector(closestX, closestY);

        const distance = this.position.distance(closestPoint) - this.radius;

        if (distance < OBSTACLE_AVOIDANCE_DISTANCE) {
          const diff = this.position.subtract(closestPoint);
          const force = diff.normalize().multiply(OBSTACLE_AVOIDANCE_FORCE * (OBSTACLE_AVOIDANCE_DISTANCE / Math.max(distance, 1)));
          steer = steer.add(force);
        }
      }
    }

    return steer;
  }

  update() {
    // Check if sheep is already in pen
    if (this.inPen) {
      // Apply minimal random movement within pen
      this.velocity = new Vector(Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1);
    } else {
      this.velocity = this.velocity.add(this.acceleration);

      // Apply bark speed multiplier if active
      const speedMultiplier = barkActive ? BARK_SPEED_MULTIPLIER : 1;
      this.velocity = this.velocity.limit(this.maxSpeed * speedMultiplier);
    }

    this.position = this.position.add(this.velocity);
    this.acceleration = new Vector(0, 0);

    // Boundary check - bounce off edges
    if (this.position.x < this.radius) {
      this.position.x = this.radius;
      this.velocity.x *= -0.5;
    } else if (this.position.x > canvas.width - this.radius) {
      this.position.x = canvas.width - this.radius;
      this.velocity.x *= -0.5;
    }

    if (this.position.y < this.radius) {
      this.position.y = this.radius;
      this.velocity.y *= -0.5;
    } else if (this.position.y > canvas.height - this.radius) {
      this.position.y = canvas.height - this.radius;
      this.velocity.y *= -0.5;
    }

    // Check if sheep is in pen
    if (!this.inPen &&
        this.position.x > pen.x &&
        this.position.x < pen.x + pen.width &&
        this.position.y > pen.y &&
        this.position.y < pen.y + pen.height) {
      this.inPen = true;
      // Only increment score for newly entered sheep
      score++;
      updateScore();
    } else if (this.inPen &&
              (this.position.x < pen.x ||
               this.position.x > pen.x + pen.width ||
               this.position.y < pen.y ||
               this.position.y > pen.y + pen.height)) {
      this.inPen = false;
      score--;
      updateScore();
    }
  }

  draw() {
    // Draw sheep body (white circle)
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Draw sheep head (small circle in direction of movement)
    if (this.velocity.magnitude() > 0) {
      const direction = this.velocity.normalize();
      ctx.beginPath();
      ctx.arc(
        this.position.x + direction.x * this.radius * 0.7,
        this.position.y + direction.y * this.radius * 0.7,
        this.radius * 0.5,
        0, Math.PI * 2
      );
      ctx.fillStyle = '#333';
      ctx.fill();
    }
  }
}

class Wolf {
  constructor(x, y) {
    this.position = new Vector(x, y);
    this.velocity = new Vector(Math.random() * 2 - 1, Math.random() * 2 - 1);
    this.acceleration = new Vector(0, 0);
    this.radius = DOG_RADIUS * 1.2;
    this.color = WOLF_COLOR;
    this.maxSpeed = DOG_SPEED * 0.8;
    this.targetSheep = null;
    this.huntingTimer = 0;
  }

  applyForce(force) {
    this.acceleration = this.acceleration.add(force);
  }

  selectTarget(sheep) {
    // If wolf doesn't have a target or timer is up, find a new one
    if (!this.targetSheep || this.huntingTimer <= 0) {
      // Find sheep outside the pen
      const availableSheep = sheep.filter(s => !s.inPen);

      if (availableSheep.length > 0) {
        // Select a random sheep to target
        this.targetSheep = availableSheep[Math.floor(Math.random() * availableSheep.length)];
        this.huntingTimer = 200; // Hunt same sheep for a while
      } else {
        this.targetSheep = null;
      }
    } else {
      this.huntingTimer--;
    }
  }

  update(sheep, dog, obstacles) {
    this.selectTarget(sheep);

    // Hunt target sheep if available
    if (this.targetSheep) {
      const seek = this.seek(this.targetSheep.position);
      this.applyForce(seek.multiply(0.05));
    }

    // Avoid the dog
    const avoidDog = this.avoid(dog.position, DOG_INFLUENCE_DISTANCE);
    this.applyForce(avoidDog.multiply(0.08));

    // Avoid obstacles
    for (const obstacle of obstacles) {
      if (obstacle.type === 'circle') {
        const avoid = this.avoid(new Vector(obstacle.x, obstacle.y), obstacle.radius + this.radius + 20);
        this.applyForce(avoid.multiply(0.1));
      } else if (obstacle.type === 'rect') {
        // Find closest point on rectangle to wolf
        const closestX = Math.max(obstacle.x, Math.min(this.position.x, obstacle.x + obstacle.width));
        const closestY = Math.max(obstacle.y, Math.min(this.position.y, obstacle.y + obstacle.height));
        const closestPoint = new Vector(closestX, closestY);

        const avoid = this.avoid(closestPoint, this.radius + 20);
        this.applyForce(avoid.multiply(0.1));
      }
    }

    // Stay away from pen
    const penCenter = new Vector(pen.x + pen.width / 2, pen.y + pen.height / 2);
    const avoidPen = this.avoid(penCenter, Math.max(pen.width, pen.height) / 2 + 50);
    this.applyForce(avoidPen.multiply(0.05));

    // Random wandering
    if (Math.random() < 0.02) {
      this.applyForce(new Vector(Math.random() * 2 - 1, Math.random() * 2 - 1).multiply(0.1));
    }

    // Apply physics
    this.velocity = this.velocity.add(this.acceleration);
    this.velocity = this.velocity.limit(this.maxSpeed);
    this.position = this.position.add(this.velocity);
    this.acceleration = new Vector(0, 0);

    // Boundary check
    if (this.position.x < this.radius) {
      this.position.x = this.radius;
      this.velocity.x *= -1;
    } else if (this.position.x > canvas.width - this.radius) {
      this.position.x = canvas.width - this.radius;
      this.velocity.x *= -1;
    }

    if (this.position.y < this.radius) {
      this.position.y = this.radius;
      this.velocity.y *= -1;
    } else if (this.position.y > canvas.height - this.radius) {
      this.position.y = canvas.height - this.radius;
      this.velocity.y *= -1;
    }
  }

  seek(target) {
    const desired = target.subtract(this.position);
    desired.normalize();
    desired.multiply(this.maxSpeed);
    const steer = desired.subtract(this.velocity);
    return steer.limit(0.2);
  }

  avoid(position, distance) {
    const dist = this.position.distance(position);

    if (dist < distance) {
      const diff = this.position.subtract(position);
      const steer = diff.normalize().multiply(1.0 * (distance / Math.max(dist, 1)));
      return steer;
    }

    return new Vector(0, 0);
  }

  draw() {
    // Wolf body
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Wolf ears
    if (this.velocity.magnitude() > 0) {
      const direction = this.velocity.normalize();
      const rightVector = new Vector(-direction.y, direction.x);
      const leftVector = new Vector(direction.y, -direction.x);

      // Right ear
      ctx.beginPath();
      ctx.moveTo(this.position.x, this.position.y);
      ctx.lineTo(
        this.position.x + direction.x * this.radius * 0.8 + rightVector.x * this.radius * 0.8,
        this.position.y + direction.y * this.radius * 0.8 + rightVector.y * this.radius * 0.8
      );
      ctx.lineTo(
        this.position.x + direction.x * this.radius * 1.5,
        this.position.y + direction.y * this.radius * 1.5
      );
      ctx.fillStyle = this.color;
      ctx.fill();

      // Left ear
      ctx.beginPath();
      ctx.moveTo(this.position.x, this.position.y);
      ctx.lineTo(
        this.position.x + direction.x * this.radius * 0.8 + leftVector.x * this.radius * 0.8,
        this.position.y + direction.y * this.radius * 0.8 + leftVector.y * this.radius * 0.8
      );
      ctx.lineTo(
        this.position.x + direction.x * this.radius * 1.5,
        this.position.y + direction.y * this.radius * 1.5
      );
      ctx.fillStyle = this.color;
      ctx.fill();

      // Eyes (red glow)
      ctx.beginPath();
      ctx.arc(
        this.position.x + direction.x * this.radius * 0.5 + rightVector.x * this.radius * 0.3,
        this.position.y + direction.y * this.radius * 0.5 + rightVector.y * this.radius * 0.3,
        this.radius * 0.2, 0, Math.PI * 2
      );
      ctx.fillStyle = 'red';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(
        this.position.x + direction.x * this.radius * 0.5 + leftVector.x * this.radius * 0.3,
        this.position.y + direction.y * this.radius * 0.5 + leftVector.y * this.radius * 0.3,
        this.radius * 0.2, 0, Math.PI * 2
      );
      ctx.fillStyle = 'red';
      ctx.fill();
    }
  }
}

// Obstacle and Environment Classes
class Obstacle {
  constructor(type, x, y, width, height, radius, color) {
    this.type = type; // 'rect' or 'circle'
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.radius = radius;
    this.color = color;
  }

  draw() {
    ctx.fillStyle = this.color;

    if (this.type === 'rect') {
      ctx.fillRect(this.x, this.y, this.width, this.height);
    } else if (this.type === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Game Levels
const levels = [
  // Level 1: Simple introduction with just a few obstacles
  {
    sheepCount: 30,
    targetPercentage: 0.8,
    timeLimit: TIME_LIMIT_BASE,
    penPosition: { x: 600, y: 400, width: 150, height: 150 },
    sheepStart: { x: 100, y: 100, radius: 80 },
    obstacles: [
      { type: 'circle', x: 400, y: 300, radius: 30, color: ROCK_COLOR }
    ],
    wolves: []
  },

  // Level 2: More obstacles
  {
    sheepCount: 35,
    targetPercentage: 0.8,
    timeLimit: TIME_LIMIT_BASE + TIME_LIMIT_INCREMENT,
    penPosition: { x: 600, y: 400, width: 150, height: 150 },
    sheepStart: { x: 100, y: 100, radius: 80 },
    obstacles: [
      { type: 'circle', x: 400, y: 300, radius: 30, color: ROCK_COLOR },
      { type: 'circle', x: 300, y: 200, radius: 25, color: TREE_COLOR },
      { type: 'circle', x: 500, y: 200, radius: 25, color: TREE_COLOR }
    ],
    wolves: []
  },

  // Level 3: More obstacles and smaller pen
  {
    sheepCount: 40,
    targetPercentage: 0.8,
    timeLimit: TIME_LIMIT_BASE + TIME_LIMIT_INCREMENT * 2,
    penPosition: { x: 600, y: 400, width: 120, height: 120 },
    sheepStart: { x: 100, y: 100, radius: 80 },
    obstacles: [
      { type: 'rect', x: 350, y: 250, width: 100, height: 20, color: OBSTACLE_COLOR },
      { type: 'circle', x: 250, y: 350, radius: 30, color: ROCK_COLOR },
      { type: 'circle', x: 450, y: 150, radius: 25, color: TREE_COLOR }
    ],
    wolves: []
  },

  // Level 4: River obstacle (long rectangle)
  {
    sheepCount: 40,
    targetPercentage: 0.8,
    timeLimit: TIME_LIMIT_BASE + TIME_LIMIT_INCREMENT * 3,
    penPosition: { x: 600, y: 400, width: 150, height: 150 },
    sheepStart: { x: 100, y: 100, radius: 80 },
    obstacles: [
      { type: 'rect', x: 150, y: 300, width: 500, height: 30, color: WATER_COLOR },
      { type: 'circle', x: 400, y: 150, radius: 30, color: ROCK_COLOR },
      { type: 'circle', x: 200, y: 200, radius: 25, color: TREE_COLOR }
    ],
    wolves: []
  },

  // Level 5: Fenced area with gap
  {
    sheepCount: 45,
    targetPercentage: 0.8,
    timeLimit: TIME_LIMIT_BASE + TIME_LIMIT_INCREMENT * 4,
    penPosition: { x: 600, y: 100, width: 150, height: 150 },
    sheepStart: { x: 100, y: 400, radius: 80 },
    obstacles: [
      { type: 'rect', x: 0, y: 250, width: 300, height: 15, color: OBSTACLE_COLOR },
      { type: 'rect', x: 400, y: 250, width: 400, height: 15, color: OBSTACLE_COLOR },
      { type: 'circle', x: 200, y: 350, radius: 25, color: TREE_COLOR },
      { type: 'circle', x: 500, y: 350, radius: 30, color: ROCK_COLOR }
    ],
    wolves: []
  },

  // Level 6: Introduction of a wolf
  {
    sheepCount: 45,
    targetPercentage: 0.8,
    timeLimit: TIME_LIMIT_BASE + TIME_LIMIT_INCREMENT * 5,
    penPosition: { x: 600, y: 400, width: 150, height: 150 },
    sheepStart: { x: 100, y: 100, radius: 80 },
    obstacles: [
      { type: 'circle', x: 300, y: 300, radius: 30, color: ROCK_COLOR },
      { type: 'circle', x: 400, y: 200, radius: 25, color: TREE_COLOR }
    ],
    wolves: [
      { x: 700, y: 100 }
    ]
  },

  // Level 7: Maze-like pattern with one wolf
  {
    sheepCount: 45,
    targetPercentage: 0.8,
    timeLimit: TIME_LIMIT_BASE + TIME_LIMIT_INCREMENT * 6,
    penPosition: { x: 600, y: 400, width: 150, height: 150 },
    sheepStart: { x: 100, y: 100, radius: 80 },
    obstacles: [
      { type: 'rect', x: 200, y: 100, width: 20, height: 200, color: OBSTACLE_COLOR },
      { type: 'rect', x: 400, y: 200, width: 20, height: 200, color: OBSTACLE_COLOR },
      { type: 'rect', x: 300, y: 150, width: 200, height: 20, color: WATER_COLOR }
    ],
    wolves: [
      { x: 700, y: 100 }
    ]
  },

  // Level 8: Two wolves and scattered obstacles
  {
    sheepCount: 50,
    targetPercentage: 0.8,
    timeLimit: TIME_LIMIT_BASE + TIME_LIMIT_INCREMENT * 7,
    penPosition: { x: 600, y: 400, width: 150, height: 150 },
    sheepStart: { x: 100, y: 100, radius: 80 },
    obstacles: [
      { type: 'circle', x: 250, y: 200, radius: 25, color: TREE_COLOR },
      { type: 'circle', x: 400, y: 300, radius: 30, color: ROCK_COLOR },
      { type: 'circle', x: 300, y: 400, radius: 25, color: TREE_COLOR },
      { type: 'circle', x: 500, y: 150, radius: 30, color: ROCK_COLOR }
    ],
    wolves: [
      { x: 700, y: 100 },
      { x: 700, y: 500 }
    ]
  },

  // Level 9: River crossing with wolves
  {
    sheepCount: 50,
    targetPercentage: 0.8,
    timeLimit: TIME_LIMIT_BASE + TIME_LIMIT_INCREMENT * 8,
    penPosition: { x: 600, y: 400, width: 120, height: 120 },
    sheepStart: { x: 100, y: 100, radius: 80 },
    obstacles: [
      { type: 'rect', x: 0, y: 250, width: 700, height: 30, color: WATER_COLOR },
      { type: 'rect', x: 350, y: 250, width: 100, height: 30, color: '#7CFC00' }, // Bridge (same as background)
      { type: 'circle', x: 250, y: 150, radius: 25, color: TREE_COLOR },
      { type: 'circle', x: 450, y: 400, radius: 30, color: ROCK_COLOR }
    ],
    wolves: [
      { x: 700, y: 100 },
      { x: 700, y: 500 }
    ]
  },

  // Level 10: Final challenge with complex obstacles and three wolves
  {
    sheepCount: 50,
    targetPercentage: 0.8,
    timeLimit: TIME_LIMIT_BASE + TIME_LIMIT_INCREMENT * 9,
    penPosition: { x: 600, y: 400, width: 120, height: 120 },
    sheepStart: { x: 100, y: 100, radius: 80 },
    obstacles: [
      { type: 'rect', x: 200, y: 150, width: 20, height: 300, color: OBSTACLE_COLOR },
      { type: 'rect', x: 400, y: 150, width: 20, height: 300, color: OBSTACLE_COLOR },
      { type: 'rect', x: 200, y: 150, width: 220, height: 20, color: OBSTACLE_COLOR },
      { type: 'rect', x: 200, y: 430, width: 220, height: 20, color: OBSTACLE_COLOR },
      { type: 'rect', x: 300, y: 280, width: 200, height: 30, color: WATER_COLOR },
      { type: 'circle', x: 500, y: 200, radius: 30, color: ROCK_COLOR }
    ],
    wolves: [
      { x: 50, y: 500 },
      { x: 750, y: 100 },
      { x: 750, y: 500 }
    ]
  }
];

// Game Initialization and Setup Functions
function initGame() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  // Set canvas dimensions to fill the screen while maintaining aspect ratio
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Load game progress from local storage
  loadProgress();

  // Set up event listeners
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mousedown', handleMouseClick);
  canvas.addEventListener('touchmove', handleTouchMove);
  canvas.addEventListener('touchstart', handleTouchStart);

  // Set up UI event listeners
  document.getElementById('startButton').addEventListener('click', startGame);
  document.getElementById('restartButton').addEventListener('click', restartLevel);
  document.getElementById('mainMenuButton').addEventListener('click', showStartScreen);
  document.getElementById('nextLevelButton').addEventListener('click', nextLevel);
  document.getElementById('levelMenuButton').addEventListener('click', showStartScreen);

  // Show the start screen
  showStartScreen();
}

function resizeCanvas() {
  const containerWidth = window.innerWidth;
  const containerHeight = window.innerHeight;

  // Calculate the aspect ratio to maintain
  const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

  let newWidth = containerWidth;
  let newHeight = containerWidth / aspectRatio;

  if (newHeight > containerHeight) {
    newHeight = containerHeight;
    newWidth = containerHeight * aspectRatio;
  }

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  canvas.style.width = `${newWidth}px`;
  canvas.style.height = `${newHeight}px`;
}

// Mouse and Touch Event Handlers
let mousePosition = null;

function handleMouseMove(event) {
  if (!gameActive) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  mousePosition = {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

function handleMouseClick(event) {
  if (!gameActive) return;

  // Trigger dog bark
  if (dog) {
    dog.bark();
  }
}

function handleTouchMove(event) {
  if (!gameActive) return;
  event.preventDefault(); // Prevent scrolling

  if (event.touches.length > 0) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    mousePosition = {
      x: (event.touches[0].clientX - rect.left) * scaleX,
      y: (event.touches[0].clientY - rect.top) * scaleY
    };
  }
}

function handleTouchStart(event) {
  if (!gameActive) return;

  // Trigger dog bark
  if (dog) {
    dog.bark();
  }

  // Also handle touch positioning
  handleTouchMove(event);
}

// UI Functions
function showStartScreen() {
  gameActive = false;
  clearInterval(gameLoop);

  document.getElementById('startScreen').classList.remove('hidden');
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('levelCompleteScreen').classList.add('hidden');
  document.getElementById('levelInfo').classList.add('hidden');
  document.getElementById('timerDisplay').classList.add('hidden');
  document.getElementById('scoreDisplay').classList.add('hidden');

  // Update the start button text to show the current level
  document.getElementById('startButton').textContent = `Start Level ${progressData.currentLevel}`;
}

function startGame() {
  gameActive = true;

  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('levelInfo').classList.remove('hidden');
  document.getElementById('timerDisplay').classList.remove('hidden');
  document.getElementById('scoreDisplay').classList.remove('hidden');

  // Initialize the level
  initLevel(progressData.currentLevel);

  // Start the game loop
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(update, 1000 / 60); // 60 FPS
}

function showGameOverScreen(message) {
  gameActive = false;
  clearInterval(gameLoop);

  document.getElementById('gameOverMessage').textContent = message || 'Time ran out!';
  document.getElementById('gameOverScreen').classList.remove('hidden');
}

function showLevelCompleteScreen() {
  gameActive = false;
  clearInterval(gameLoop);

  const sheepPercentage = Math.floor((score / levels[currentLevel - 1].sheepCount) * 100);
  document.getElementById('levelCompleteMessage').textContent =
    `You herded ${score} out of ${levels[currentLevel - 1].sheepCount} sheep (${sheepPercentage}%)!`;

  document.getElementById('levelCompleteScreen').classList.remove('hidden');

  // Update progress
  if (currentLevel >= progressData.highestLevelReached) {
    progressData.highestLevelReached = Math.min(currentLevel + 1, TOTAL_LEVELS);
  }

  progressData.currentLevel = Math.min(currentLevel + 1, TOTAL_LEVELS);
  saveProgress();

  // If this was the final level, update the next level button
  if (currentLevel === TOTAL_LEVELS) {
    document.getElementById('nextLevelButton').textContent = 'Play Again';
  }
}

function restartLevel() {
  document.getElementById('gameOverScreen').classList.add('hidden');
  startGame();
}

function nextLevel() {
  document.getElementById('levelCompleteScreen').classList.add('hidden');

  // If we've completed all levels, go back to level 1
  if (currentLevel >= TOTAL_LEVELS) {
    progressData.currentLevel = 1;
    saveProgress();
  }

  startGame();
}

// Game Progress Functions
function saveProgress() {
  localStorage.setItem('shepherdsDogProgress', JSON.stringify(progressData));
}

function loadProgress() {
  const savedProgress = localStorage.getItem('shepherdsDogProgress');

  if (savedProgress) {
    try {
      const parsed = JSON.parse(savedProgress);
      progressData.currentLevel = parsed.currentLevel || 1;
      progressData.highestLevelReached = parsed.highestLevelReached || 1;

      // Ensure we don't go beyond total levels
      progressData.currentLevel = Math.min(progressData.currentLevel, TOTAL_LEVELS);
      progressData.highestLevelReached = Math.min(progressData.highestLevelReached, TOTAL_LEVELS);
    } catch (e) {
      console.error('Error loading saved progress:', e);
      progressData.currentLevel = 1;
      progressData.highestLevelReached = 1;
    }
  }

  currentLevel = progressData.currentLevel;
}

// Update UI Elements
function updateTimer() {
  document.getElementById('timeLeft').textContent = Math.ceil(timeLeft);

  // Visual indication when time is running low
  if (timeLeft <= 10) {
    document.getElementById('timerDisplay').style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
  } else {
    document.getElementById('timerDisplay').style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  }
}

function updateScore() {
  const targetCount = Math.ceil(levels[currentLevel - 1].sheepCount * levels[currentLevel - 1].targetPercentage);
  document.getElementById('sheepCount').textContent = score;
  document.getElementById('targetCount').textContent = targetCount;

  // Visual indication of progress
  if (score >= targetCount) {
    document.getElementById('scoreDisplay').style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
  } else {
    document.getElementById('scoreDisplay').style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  }
}

// Level Initialization
function initLevel(levelNumber) {
  // Reset game state
  sheep = [];
  obstacles = [];
  wolves = [];
  score = 0;

  // Get level configuration
  const level = levels[levelNumber - 1];
  currentLevel = levelNumber;

  // Set up timer
  timeLeft = level.timeLimit;

  // Set up pen
  pen = level.penPosition;

  // Place dog in center of screen initially
  dog = new Dog(canvas.width / 2, canvas.height / 2);

  // Create sheep in a cluster at the starting point
  const sheepStartX = level.sheepStart.x;
  const sheepStartY = level.sheepStart.y;
  const sheepRadius = level.sheepStart.radius;

  for (let i = 0; i < level.sheepCount; i++) {
    // Place sheep in a random position within the starting area circle
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * sheepRadius;
    const x = sheepStartX + Math.cos(angle) * distance;
    const y = sheepStartY + Math.sin(angle) * distance;

    sheep.push(new Sheep(x, y));
  }

  // Create obstacles
  for (const obstacleConfig of level.obstacles) {
    obstacles.push(new Obstacle(
      obstacleConfig.type,
      obstacleConfig.x,
      obstacleConfig.y,
      obstacleConfig.width,
      obstacleConfig.height,
      obstacleConfig.radius,
      obstacleConfig.color
    ));
  }

  // Create wolves
  for (const wolfConfig of level.wolves) {
    wolves.push(new Wolf(wolfConfig.x, wolfConfig.y));
  }

  // Update UI
  document.getElementById('levelNumber').textContent = levelNumber;
  updateScore();
  updateTimer();
}

// Game Loop
function update() {
  // Clear canvas
  ctx.fillStyle = '#7CFC00'; // Light green background
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Update game time
  timeLeft -= 1/60; // Subtract 1/60th of a second (assuming 60 FPS)
  updateTimer();

  // Check time limit
  if (timeLeft <= 0) {
    showGameOverScreen('Time ran out!');
    return;
  }

  // Draw environment
  drawEnvironment();

  // Update and draw dog
  dog.update(mousePosition);
  dog.draw();

  // Update and draw sheep
  for (const s of sheep) {
    s.flock(sheep, dog, pen, obstacles, wolves);
    s.update();
    s.draw();
  }

  // Update and draw wolves
  for (const wolf of wolves) {
    wolf.update(sheep, dog, obstacles);
    wolf.draw();
  }

  // Check win condition
  checkWinCondition();
}

// Draw environment (pen, obstacles)
function drawEnvironment() {
  // Draw pen
  ctx.fillStyle = '#7CFC00'; // Same as background - grassy pen
  ctx.fillRect(pen.x, pen.y, pen.width, pen.height);

  // Draw pen border
  ctx.strokeStyle = PEN_COLOR;
  ctx.lineWidth = 5;
  ctx.strokeRect(pen.x, pen.y, pen.width, pen.height);

  // Draw pen gate (opening at bottom)
  ctx.fillStyle = '#7CFC00'; // Same color as background

  // Draw obstacles
  for (const obstacle of obstacles) {
    obstacle.draw();
  }

  // Draw day/night transition visual effect based on time left
  const level = levels[currentLevel - 1];
  const timePercentage = timeLeft / level.timeLimit;

  if (timePercentage < 0.3) {
    // Draw darkening overlay as night approaches
    ctx.fillStyle = `rgba(0, 0, 50, ${0.7 - timePercentage * 2})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw moon when it's getting dark
    ctx.beginPath();
    ctx.arc(700, 80, 30, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(220, 220, 255, 0.7)';
    ctx.fill();
  } else {
    // Draw sun
    ctx.beginPath();
    ctx.arc(700, 80, 30, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
    ctx.fill();
  }
}

// Check win condition
function checkWinCondition() {
  const level = levels[currentLevel - 1];
  const targetCount = Math.ceil(level.sheepCount * level.targetPercentage);

  // If enough sheep are in the pen, level is complete
  if (score >= targetCount) {
    showLevelCompleteScreen();
  }
}

// Initialize game when page loads
window.addEventListener('load', initGame);
