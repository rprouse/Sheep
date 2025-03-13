// Game Constants and Configuration
const GAME = {
  canvas: null,
  ctx: null,
  width: 0,
  height: 0,
  levelData: [],
  currentLevel: 1,
  maxUnlockedLevel: 1,
  isRunning: false,
  isPaused: false,
  gameTime: 0,
  nightfallTime: 120, // in seconds
  sheepInPen: 0,
  sheepGoal: 0,
  lastFrameTime: 0
};

// Game Objects
const dog = {
  x: 0,
  y: 0,
  radius: 15,
  color: '#8B4513',
  speed: 5,
  isBarking: false,
  barkRadius: 100,
  barkDuration: 0,
  maxBarkDuration: 15,
  update() {
    // Bark animation countdown
    if (this.isBarking) {
      this.barkDuration--;
      if (this.barkDuration <= 0) {
        this.isBarking = false;
      }
    }
  },
  draw(ctx) {
    // Draw dog circle
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();

    // Draw eyes
    ctx.beginPath();
    ctx.arc(this.x - 5, this.y - 5, 3, 0, Math.PI * 2);
    ctx.arc(this.x + 5, this.y - 5, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.closePath();

    // Draw bark animation if barking
    if (this.isBarking) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.barkRadius * (1 - this.barkDuration / this.maxBarkDuration), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.closePath();

      // Draw "BARK!" text
      ctx.font = '20px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('BARK!', this.x + 20, this.y - 20);
    }
  },
  bark() {
    this.isBarking = true;
    this.barkDuration = this.maxBarkDuration;
  }
};

// Sheep class with flocking behavior
class Sheep {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = Math.random() * 2 - 1; // Random initial velocity
    this.vy = Math.random() * 2 - 1;
    this.maxSpeed = 2;
    this.scaredSpeed = 4;
    this.radius = 10;
    this.color = '#FFFFFF';
    this.inPen = false;
    this.isScared = false;
    this.scaredTimer = 0;
    this.maxScaredTime = 60; // frames

    // Wandering behavior
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.wanderStrength = 0.1;

    // Variables for flocking behavior
    this.separationDistance = 30;
    this.alignmentDistance = 60;
    this.cohesionDistance = 80;
    this.avoidanceDistance = 100;

    // Weights for behaviors
    this.separationWeight = 2.0;
    this.alignmentWeight = 1.0;
    this.cohesionWeight = 0.5;
    this.dogAvoidWeight = 2.0;
    this.obstacleAvoidWeight = 2.0;
    this.penAttractionWeight = 0.2;
    this.wanderWeight = 0.3;
  }

  update(flock, obstacles, pen, dog) {
    // Calculate flocking behaviors
    let separation = this.calculateSeparation(flock);
    let alignment = this.calculateAlignment(flock);
    let cohesion = this.calculateCohesion(flock);
    let dogAvoidance = this.calculateDogAvoidance(dog);
    let obstacleAvoidance = this.calculateObstacleAvoidance(obstacles);
    let penAttraction = this.calculatePenAttraction(pen);
    let wander = this.calculateWander();

    // Apply weights and combine forces
    separation.multiply(this.separationWeight);
    alignment.multiply(this.alignmentWeight);
    cohesion.multiply(this.cohesionWeight);
    dogAvoidance.multiply(this.dogAvoidWeight);
    obstacleAvoidance.multiply(this.obstacleAvoidWeight);
    penAttraction.multiply(this.penAttractionWeight);
    wander.multiply(this.wanderWeight);

    // Apply all forces to velocity
    this.vx += separation.x + alignment.x + cohesion.x + dogAvoidance.x + obstacleAvoidance.x + penAttraction.x + wander.x;
    this.vy += separation.y + alignment.y + cohesion.y + dogAvoidance.y + obstacleAvoidance.y + penAttraction.y + wander.y;

    // Limit the speed
    let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

    if (speed > 0) {
      let maxSpeed = this.isScared ? this.scaredSpeed : this.maxSpeed;

      // If dog is barking, temporarily increase speed
      if (dog.isBarking && this.distanceTo(dog) < dog.barkRadius) {
        maxSpeed *= 1.5;
        this.isScared = true;
        this.scaredTimer = this.maxScaredTime;
      }

      // Normalize and apply max speed
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }

    // Update scared timer
    if (this.isScared) {
      this.scaredTimer--;
      if (this.scaredTimer <= 0) {
        this.isScared = false;
      }
    }

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Bound the sheep to the screen
    this.boundToScreen();

    // Check if sheep is in pen
    this.checkPen(pen);
  }

  draw(ctx) {
    // Draw sheep body (white oval)
    ctx.save();
    ctx.translate(this.x, this.y);

    // Rotate in direction of movement
    let angle = Math.atan2(this.vy, this.vx);
    ctx.rotate(angle);

    // Draw the body
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * 1.5, this.radius, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();

    // Draw the head
    ctx.beginPath();
    ctx.arc(this.radius * 1.2, 0, this.radius * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#E0E0E0';
    ctx.fill();
    ctx.closePath();

    // Draw eyes if scared
    if (this.isScared) {
      ctx.beginPath();
      ctx.arc(this.radius * 1.5, -3, 2, 0, Math.PI * 2);
      ctx.arc(this.radius * 1.5, 3, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'red';
      ctx.fill();
      ctx.closePath();
    }

    ctx.restore();
  }

  calculateSeparation(flock) {
    let steer = { x: 0, y: 0 };
    let count = 0;

    for (let other of flock) {
      if (other !== this) {
        let distance = this.distanceTo(other);

        if (distance < this.separationDistance && distance > 0) {
          // Calculate vector pointing away from neighbor
          let dx = this.x - other.x;
          let dy = this.y - other.y;

          // Weight by distance (closer sheep have more influence)
          dx /= distance;
          dy /= distance;

          steer.x += dx;
          steer.y += dy;
          count++;
        }
      }
    }

    if (count > 0) {
      steer.x /= count;
      steer.y /= count;
    }

    return steer;
  }

  calculateAlignment(flock) {
    let steer = { x: 0, y: 0 };
    let count = 0;

    for (let other of flock) {
      if (other !== this) {
        let distance = this.distanceTo(other);

        if (distance < this.alignmentDistance && distance > 0) {
          steer.x += other.vx;
          steer.y += other.vy;
          count++;
        }
      }
    }

    if (count > 0) {
      steer.x /= count;
      steer.y /= count;

      // Normalize to get just the direction
      let mag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
      if (mag > 0) {
        steer.x /= mag;
        steer.y /= mag;
      }

      // Scale to maxSpeed
      steer.x *= this.maxSpeed;
      steer.y *= this.maxSpeed;

      // Steer = desired - velocity
      steer.x -= this.vx;
      steer.y -= this.vy;
    }

    return steer;
  }

  calculateCohesion(flock) {
    let target = { x: 0, y: 0 };
    let count = 0;
    let steer = { x: 0, y: 0 };

    for (let other of flock) {
      if (other !== this) {
        let distance = this.distanceTo(other);

        if (distance < this.cohesionDistance && distance > 0) {
          target.x += other.x;
          target.y += other.y;
          count++;
        }
      }
    }

    if (count > 0) {
      target.x /= count;
      target.y /= count;

      // Create vector pointing towards target
      steer.x = target.x - this.x;
      steer.y = target.y - this.y;

      // Normalize and scale
      let mag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
      if (mag > 0) {
        steer.x /= mag;
        steer.y /= mag;

        steer.x *= this.maxSpeed;
        steer.y *= this.maxSpeed;

        // Steer = desired - velocity
        steer.x -= this.vx;
        steer.y -= this.vy;
      }
    }

    return steer;
  }

  calculateDogAvoidance(dog) {
    let steer = { x: 0, y: 0 };
    let distance = this.distanceTo(dog);

    // Only avoid if dog is within avoidance distance
    if (distance < this.avoidanceDistance && distance > 0) {
      // Vector pointing from dog to sheep
      steer.x = this.x - dog.x;
      steer.y = this.y - dog.y;

      // Weight by distance (closer dog has more influence)
      let weight = 1.0 - (distance / this.avoidanceDistance);

      // Additional weight if dog is barking
      if (dog.isBarking && distance < dog.barkRadius) {
        weight *= 2;
      }

      // Normalize and scale
      let mag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
      if (mag > 0) {
        steer.x /= mag;
        steer.y /= mag;

        steer.x *= weight * this.maxSpeed;
        steer.y *= weight * this.maxSpeed;
      }
    }

    return steer;
  }

  calculateObstacleAvoidance(obstacles) {
    let steer = { x: 0, y: 0 };

    for (let obstacle of obstacles) {
      let distance = this.distanceToObstacle(obstacle);

      if (distance < this.avoidanceDistance) {
        // Vector pointing from obstacle to sheep
        let dx = this.x - obstacle.x;
        let dy = this.y - obstacle.y;

        // Normalize
        let mag = Math.sqrt(dx * dx + dy * dy);
        if (mag > 0) {
          dx /= mag;
          dy /= mag;
        }

        // Weight by distance (closer obstacles have more influence)
        let weight = 1.0 - (distance / this.avoidanceDistance);

        steer.x += dx * weight;
        steer.y += dy * weight;
      }
    }

    return steer;
  }

  calculatePenAttraction(pen) {
    let steer = { x: 0, y: 0 };

    // Only apply if sheep is not already in pen
    if (!this.inPen) {
      // Vector pointing from sheep to pen center
      let penCenterX = pen.x + pen.width / 2;
      let penCenterY = pen.y + pen.height / 2;
      steer.x = penCenterX - this.x;
      steer.y = penCenterY - this.y;

      // Calculate distance to pen center
      let distance = Math.sqrt(steer.x * steer.x + steer.y * steer.y);

      // Normalize vector
      if (distance > 0) {
        steer.x /= distance;
        steer.y /= distance;

        // Increase attraction as sheep gets closer to pen
        let attractionMultiplier = 1.0;

        // If sheep is close to pen, increase attraction
        if (distance < 200) {
          // Gradually increase attraction from 1x to 2x as sheep gets closer
          attractionMultiplier = 1.0 + (1.0 - distance / 200);

          // Apply multiplier
          steer.x *= attractionMultiplier;
          steer.y *= attractionMultiplier;
        }
      }
    }

    return steer;
  }

  calculateWander() {
    // Update wander angle with some randomness
    this.wanderAngle += (Math.random() * 0.5 - 0.25);

    // Calculate wander force
    let steer = {
      x: Math.cos(this.wanderAngle) * this.wanderStrength,
      y: Math.sin(this.wanderAngle) * this.wanderStrength
    };

    return steer;
  }

  distanceTo(other) {
    let dx = this.x - other.x;
    let dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  distanceToObstacle(obstacle) {
    // Simple distance calculation for circular obstacles
    if (obstacle.type === 'circle') {
      let dx = this.x - obstacle.x;
      let dy = this.y - obstacle.y;
      return Math.sqrt(dx * dx + dy * dy) - obstacle.radius - this.radius;
    }
    // Rectangle obstacle
    else if (obstacle.type === 'rect') {
      // Find closest point on rectangle to sheep
      let closestX = Math.max(obstacle.x, Math.min(this.x, obstacle.x + obstacle.width));
      let closestY = Math.max(obstacle.y, Math.min(this.y, obstacle.y + obstacle.height));

      let dx = this.x - closestX;
      let dy = this.y - closestY;
      return Math.sqrt(dx * dx + dy * dy) - this.radius;
    }

    return 0;
  }

  boundToScreen() {
    const margin = this.radius;

    if (this.x < margin) {
      this.x = margin;
      this.vx *= -0.5;
    }
    else if (this.x > GAME.width - margin) {
      this.x = GAME.width - margin;
      this.vx *= -0.5;
    }

    if (this.y < margin) {
      this.y = margin;
      this.vy *= -0.5;
    }
    else if (this.y > GAME.height - margin) {
      this.y = GAME.height - margin;
      this.vy *= -0.5;
    }
  }

  checkPen(pen) {
    // Check if sheep is inside the pen
    if (this.x > pen.x && this.x < pen.x + pen.width &&
        this.y > pen.y && this.y < pen.y + pen.height) {
      if (!this.inPen) {
        this.inPen = true;
        GAME.sheepInPen++;
        updateSheepCount();
      }
    } else {
      if (this.inPen) {
        this.inPen = false;
        GAME.sheepInPen--;
        updateSheepCount();
      }
    }
  }
}

// Add Vector multiply method (missing in previous implementation)
Object.prototype.multiply = function(scalar) {
  this.x *= scalar;
  this.y *= scalar;
  return this;
};

// Wolf class
class Wolf {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.speed = 3;
    this.radius = 18;
    this.color = '#555555';
    this.targetSheep = null;
    this.huntRadius = 250;
    this.active = false;
    this.activateAtNight = true;
  }

  update(sheep, obstacles) {
    if (!this.active && this.activateAtNight && GAME.gameTime >= GAME.nightfallTime * 0.75) {
      this.active = true;
    }

    if (!this.active) return;

    // Find closest sheep if no target or current target is in pen
    if (!this.targetSheep || this.targetSheep.inPen) {
      this.findNewTarget(sheep);
    }

    if (this.targetSheep) {
      // Move towards target sheep
      const dx = this.targetSheep.x - this.x;
      const dy = this.targetSheep.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        // Normalize direction
        this.vx = (dx / distance) * this.speed;
        this.vy = (dy / distance) * this.speed;

        // Apply obstacle avoidance
        let avoidance = this.calculateObstacleAvoidance(obstacles);
        this.vx += avoidance.x;
        this.vy += avoidance.y;

        // Normalize speed after adding avoidance
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 0) {
          this.vx = (this.vx / speed) * this.speed;
          this.vy = (this.vy / speed) * this.speed;
        }
      }

      // Update position
      this.x += this.vx;
      this.y += this.vy;

      // Scare nearby sheep
      this.scareSheep(sheep);

      // Bound to screen
      this.boundToScreen();
    }
  }

  draw(ctx) {
    if (!this.active) return;

    // Draw wolf body (gray triangle)
    ctx.save();
    ctx.translate(this.x, this.y);

    // Rotate in direction of movement
    let angle = Math.atan2(this.vy, this.vx);
    ctx.rotate(angle);

    // Draw the body (triangle)
    ctx.beginPath();
    ctx.moveTo(this.radius, 0);
    ctx.lineTo(-this.radius, -this.radius * 0.7);
    ctx.lineTo(-this.radius, this.radius * 0.7);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();

    // Draw eyes (red)
    ctx.beginPath();
    ctx.arc(this.radius * 0.5, -this.radius * 0.3, 3, 0, Math.PI * 2);
    ctx.arc(this.radius * 0.5, this.radius * 0.3, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.closePath();

    ctx.restore();

    // Draw hunting radius when close to nightfall
    if (GAME.gameTime >= GAME.nightfallTime * 0.75) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.huntRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
      ctx.stroke();
      ctx.closePath();
    }
  }

  findNewTarget(sheep) {
    let closestDistance = Infinity;
    let closestSheep = null;

    for (let s of sheep) {
      if (!s.inPen) {
        const dx = s.x - this.x;
        const dy = s.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < closestDistance && distance < this.huntRadius) {
          closestDistance = distance;
          closestSheep = s;
        }
      }
    }

    this.targetSheep = closestSheep;
  }

  scareSheep(sheep) {
    for (let s of sheep) {
      if (!s.inPen) {
        const dx = s.x - this.x;
        const dy = s.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.radius * 3) {
          s.isScared = true;
          s.scaredTimer = s.maxScaredTime * 2; // Longer scare from wolf
        }
      }
    }
  }

  calculateObstacleAvoidance(obstacles) {
    let steer = { x: 0, y: 0 };
    const avoidanceDistance = 80;

    for (let obstacle of obstacles) {
      let distance = this.distanceToObstacle(obstacle);

      if (distance < avoidanceDistance) {
        // Vector pointing from obstacle to wolf
        let dx = this.x - obstacle.x;
        let dy = this.y - obstacle.y;

        // Normalize
        let mag = Math.sqrt(dx * dx + dy * dy);
        if (mag > 0) {
          dx /= mag;
          dy /= mag;
        }

        // Weight by distance (closer obstacles have more influence)
        let weight = 1.0 - (distance / avoidanceDistance);

        steer.x += dx * weight;
        steer.y += dy * weight;
      }
    }

    return steer;
  }

  distanceToObstacle(obstacle) {
    // Simple distance calculation for circular obstacles
    if (obstacle.type === 'circle') {
      let dx = this.x - obstacle.x;
      let dy = this.y - obstacle.y;
      return Math.sqrt(dx * dx + dy * dy) - obstacle.radius - this.radius;
    }
    // Rectangle obstacle
    else if (obstacle.type === 'rect') {
      // Find closest point on rectangle to wolf
      let closestX = Math.max(obstacle.x, Math.min(this.x, obstacle.x + obstacle.width));
      let closestY = Math.max(obstacle.y, Math.min(this.y, obstacle.y + obstacle.height));

      let dx = this.x - closestX;
      let dy = this.y - closestY;
      return Math.sqrt(dx * dx + dy * dy) - this.radius;
    }

    return 0;
  }

  boundToScreen() {
    const margin = this.radius;

    if (this.x < margin) {
      this.x = margin;
      this.vx *= -0.5;
    }
    else if (this.x > GAME.width - margin) {
      this.x = GAME.width - margin;
      this.vx *= -0.5;
    }

    if (this.y < margin) {
      this.y = margin;
      this.vy *= -0.5;
    }
    else if (this.y > GAME.height - margin) {
      this.y = GAME.height - margin;
      this.vy *= -0.5;
    }
  }
}

// Level definition
function createLevels() {
  return [
    // Level 1 - Tutorial, no obstacles
    {
      sheepCount: 10,
      requiredPercentage: 80,
      timeLimit: 60,
      obstacles: [],
      wolves: [],
      penPosition: { x: 0.65, y: 0.5, width: 0.2, height: 0.3 },
      sheepStartArea: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }
    },
    // Level 2 - Add some trees
    {
      sheepCount: 15,
      requiredPercentage: 80,
      timeLimit: 70,
      obstacles: [
        { type: 'circle', x: 0.3, y: 0.3, radius: 20 },
        { type: 'circle', x: 0.5, y: 0.4, radius: 25 },
        { type: 'circle', x: 0.4, y: 0.6, radius: 22 }
      ],
      wolves: [],
      penPosition: { x: 0.7, y: 0.5, width: 0.2, height: 0.3 },
      sheepStartArea: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }
    },
    // Level 3 - Add trees and rocks
    {
      sheepCount: 20,
      requiredPercentage: 80,
      timeLimit: 80,
      obstacles: [
        { type: 'circle', x: 0.3, y: 0.3, radius: 20 },
        { type: 'circle', x: 0.5, y: 0.4, radius: 25 },
        { type: 'circle', x: 0.4, y: 0.6, radius: 22 },
        { type: 'rect', x: 0.2, y: 0.7, width: 80, height: 40 },
        { type: 'rect', x: 0.6, y: 0.2, width: 50, height: 50 }
      ],
      wolves: [],
      penPosition: { x: 0.7, y: 0.6, width: 0.2, height: 0.3 },
      sheepStartArea: { x: 0.1, y: 0.3, width: 0.2, height: 0.2 }
    },
    // Level 4 - More obstacles
    {
      sheepCount: 25,
      requiredPercentage: 80,
      timeLimit: 90,
      obstacles: [
        { type: 'circle', x: 0.3, y: 0.3, radius: 20 },
        { type: 'circle', x: 0.5, y: 0.4, radius: 25 },
        { type: 'circle', x: 0.4, y: 0.6, radius: 22 },
        { type: 'circle', x: 0.7, y: 0.3, radius: 18 },
        { type: 'rect', x: 0.2, y: 0.7, width: 80, height: 40 },
        { type: 'rect', x: 0.5, y: 0.2, width: 60, height: 30 }
      ],
      wolves: [],
      penPosition: { x: 0.7, y: 0.7, width: 0.2, height: 0.2 },
      sheepStartArea: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }
    },
    // Level 5 - First wolf
    {
      sheepCount: 30,
      requiredPercentage: 80,
      timeLimit: 100,
      obstacles: [
        { type: 'circle', x: 0.3, y: 0.3, radius: 20 },
        { type: 'circle', x: 0.5, y: 0.4, radius: 25 },
        { type: 'circle', x: 0.4, y: 0.6, radius: 22 },
        { type: 'rect', x: 0.2, y: 0.7, width: 80, height: 40 },
        { type: 'rect', x: 0.6, y: 0.2, width: 50, height: 50 }
      ],
      wolves: [
        { x: 0.8, y: 0.1 }
      ],
      penPosition: { x: 0.7, y: 0.7, width: 0.2, height: 0.2 },
      sheepStartArea: { x: 0.1, y: 0.1, width: 0.3, height: 0.3 }
    },
    // Level 6 - More complex layout
    {
      sheepCount: 35,
      requiredPercentage: 80,
      timeLimit: 110,
      obstacles: [
        { type: 'circle', x: 0.3, y: 0.3, radius: 20 },
        { type: 'circle', x: 0.5, y: 0.4, radius: 25 },
        { type: 'circle', x: 0.4, y: 0.6, radius: 22 },
        { type: 'circle', x: 0.7, y: 0.3, radius: 18 },
        { type: 'circle', x: 0.2, y: 0.5, radius: 20 },
        { type: 'rect', x: 0.1, y: 0.7, width: 80, height: 40 },
        { type: 'rect', x: 0.6, y: 0.2, width: 50, height: 50 },
        { type: 'rect', x: 0.5, y: 0.5, width: 100, height: 20 }
      ],
      wolves: [
        { x: 0.8, y: 0.1 }
      ],
      penPosition: { x: 0.7, y: 0.7, width: 0.2, height: 0.2 },
      sheepStartArea: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }
    },
    // Level 7 - Two wolves
    {
      sheepCount: 40,
      requiredPercentage: 80,
      timeLimit: 120,
      obstacles: [
        { type: 'circle', x: 0.3, y: 0.3, radius: 20 },
        { type: 'circle', x: 0.5, y: 0.4, radius: 25 },
        { type: 'circle', x: 0.4, y: 0.6, radius: 22 },
        { type: 'circle', x: 0.7, y: 0.3, radius: 18 },
        { type: 'rect', x: 0.2, y: 0.7, width: 80, height: 40 },
        { type: 'rect', x: 0.6, y: 0.2, width: 50, height: 50 },
        { type: 'rect', x: 0.4, y: 0.5, width: 20, height: 200 }
      ],
      wolves: [
        { x: 0.8, y: 0.1 },
        { x: 0.1, y: 0.8 }
      ],
      penPosition: { x: 0.7, y: 0.7, width: 0.2, height: 0.2 },
      sheepStartArea: { x: 0.1, y: 0.1, width: 0.3, height: 0.3 }
    },
    // Level 8 - Complex maze-like layout
    {
      sheepCount: 45,
      requiredPercentage: 80,
      timeLimit: 130,
      obstacles: [
        { type: 'rect', x: 0.1, y: 0.1, width: 20, height: 300 },
        { type: 'rect', x: 0.2, y: 0.1, width: 300, height: 20 },
        { type: 'rect', x: 0.2, y: 0.3, width: 20, height: 200 },
        { type: 'rect', x: 0.3, y: 0.5, width: 200, height: 20 },
        { type: 'rect', x: 0.5, y: 0.3, width: 20, height: 200 },
        { type: 'rect', x: 0.3, y: 0.7, width: 300, height: 20 },
        { type: 'circle', x: 0.4, y: 0.4, radius: 30 }
      ],
      wolves: [
        { x: 0.9, y: 0.1 },
        { x: 0.1, y: 0.9 }
      ],
      penPosition: { x: 0.7, y: 0.7, width: 0.2, height: 0.2 },
      sheepStartArea: { x: 0.1, y: 0.1, width: 0.3, height: 0.3 }
    },
    // Level 9 - Moving obstacles
    {
      sheepCount: 50,
      requiredPercentage: 80,
      timeLimit: 140,
      obstacles: [
        { type: 'circle', x: 0.3, y: 0.3, radius: 20, movable: true, vx: 1, vy: 0, bounds: { minX: 0.2, maxX: 0.6, minY: 0.3, maxY: 0.3 } },
        { type: 'circle', x: 0.5, y: 0.6, radius: 25, movable: true, vx: 0, vy: 1, bounds: { minX: 0.5, maxX: 0.5, minY: 0.3, maxY: 0.7 } },
        { type: 'rect', x: 0.2, y: 0.5, width: 80, height: 20, movable: true, vx: 0.5, vy: 0, bounds: { minX: 0.1, maxX: 0.5, minY: 0.5, maxY: 0.5 } },
        { type: 'rect', x: 0.6, y: 0.2, width: 20, height: 80, movable: true, vx: 0, vy: 0.5, bounds: { minX: 0.6, maxX: 0.6, minY: 0.1, maxY: 0.5 } },
        { type: 'circle', x: 0.2, y: 0.7, radius: 20 },
        { type: 'circle', x: 0.7, y: 0.3, radius: 20 }
      ],
      wolves: [
        { x: 0.9, y: 0.1 },
        { x: 0.1, y: 0.9 }
      ],
      penPosition: { x: 0.7, y: 0.7, width: 0.2, height: 0.2 },
      sheepStartArea: { x: 0.1, y: 0.1, width: 0.3, height: 0.3 }
    },
    // Level 10 - Final challenge, many sheep, moving obstacles, three wolves
    {
      sheepCount: 60,
      requiredPercentage: 80,
      timeLimit: 160,
      obstacles: [
        { type: 'circle', x: 0.3, y: 0.3, radius: 20, movable: true, vx: 1, vy: 0, bounds: { minX: 0.2, maxX: 0.6, minY: 0.3, maxY: 0.3 } },
        { type: 'circle', x: 0.5, y: 0.6, radius: 25, movable: true, vx: 0, vy: 1, bounds: { minX: 0.5, maxX: 0.5, minY: 0.3, maxY: 0.7 } },
        { type: 'rect', x: 0.2, y: 0.5, width: 80, height: 20, movable: true, vx: 0.5, vy: 0, bounds: { minX: 0.1, maxX: 0.5, minY: 0.5, maxY: 0.5 } },
        { type: 'rect', x: 0.6, y: 0.2, width: 20, height: 80, movable: true, vx: 0, vy: 0.5, bounds: { minX: 0.6, maxX: 0.6, minY: 0.1, maxY: 0.5 } },
        { type: 'circle', x: 0.2, y: 0.7, radius: 20 },
        { type: 'circle', x: 0.7, y: 0.3, radius: 20 },
        { type: 'rect', x: 0.1, y: 0.4, width: 100, height: 20 },
        { type: 'rect', x: 0.5, y: 0.8, width: 20, height: 100 }
      ],
      wolves: [
        { x: 0.9, y: 0.1 },
        { x: 0.1, y: 0.9 },
        { x: 0.9, y: 0.9 }
      ],
      penPosition: { x: 0.7, y: 0.7, width: 0.2, height: 0.2 },
      sheepStartArea: { x: 0.1, y: 0.1, width: 0.3, height: 0.3 }
    }
  ];
}

// Game state variables
let sheep = [];
let obstacles = [];
let wolves = [];
let pen = { x: 0, y: 0, width: 0, height: 0 };
let currentLevelData = null;

// Input handling
let mouseX = 0;
let mouseY = 0;
let isMouseDown = false;

// Initialize the game
function initGame() {
  // Get canvas and context
  GAME.canvas = document.getElementById('gameCanvas');
  GAME.ctx = GAME.canvas.getContext('2d');

  // Set canvas size
  resizeCanvas();

  // Set up event listeners
  setupEventListeners();

  // Load level data
  GAME.levelData = createLevels();

  // Load saved game progress from local storage
  loadGameProgress();

  // Initialize UI
  initUI();

  // Show start screen
  showScreen('start-screen');
}

function resizeCanvas() {
  const container = document.getElementById('game-container');
  GAME.canvas.width = container.clientWidth;
  GAME.canvas.height = container.clientHeight;
  GAME.width = GAME.canvas.width;
  GAME.height = GAME.canvas.height;
}

function setupEventListeners() {
  // Mouse/touch movement for dog control
  GAME.canvas.addEventListener('mousemove', handleMouseMove);
  GAME.canvas.addEventListener('touchmove', handleTouchMove);

  // Mouse/touch for barking
  GAME.canvas.addEventListener('mousedown', handleMouseDown);
  GAME.canvas.addEventListener('touchstart', handleTouchStart);
  GAME.canvas.addEventListener('mouseup', handleMouseUp);
  GAME.canvas.addEventListener('touchend', handleTouchEnd);

  // Window resize handler
  window.addEventListener('resize', handleResize);

  // Button handlers
  document.getElementById('start-button').addEventListener('click', startGame);
  document.getElementById('next-level-button').addEventListener('click', startNextLevel);
  document.getElementById('retry-button').addEventListener('click', retryLevel);
  document.getElementById('win-menu-button').addEventListener('click', goToMainMenu);
  document.getElementById('game-over-menu-button').addEventListener('click', goToMainMenu);
  document.getElementById('pause-menu-button').addEventListener('click', goToMainMenu);
  document.getElementById('resume-button').addEventListener('click', resumeGame);

  // Key events
  window.addEventListener('keydown', handleKeyDown);
}

function handleMouseMove(e) {
  const rect = GAME.canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;

  if (GAME.isRunning && !GAME.isPaused) {
    dog.x = mouseX;
    dog.y = mouseY;
  }
}

function handleTouchMove(e) {
  e.preventDefault();
  const rect = GAME.canvas.getBoundingClientRect();
  if (e.touches.length > 0) {
    mouseX = e.touches[0].clientX - rect.left;
    mouseY = e.touches[0].clientY - rect.top;

    if (GAME.isRunning && !GAME.isPaused) {
      dog.x = mouseX;
      dog.y = mouseY;
    }
  }
}

function handleMouseDown() {
  isMouseDown = true;
  if (GAME.isRunning && !GAME.isPaused) {
    dog.bark();
  }
}

function handleTouchStart(e) {
  isMouseDown = true;
  if (GAME.isRunning && !GAME.isPaused) {
    dog.bark();
  }
}

function handleMouseUp() {
  isMouseDown = false;
}

function handleTouchEnd() {
  isMouseDown = false;
}

function handleResize() {
  resizeCanvas();

  // If in game, rescale level objects
  if (currentLevelData) {
    scaleLevel(currentLevelData);
  }
}

function handleKeyDown(e) {
  // Pause on Escape or 'P' key
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
    if (GAME.isRunning) {
      if (GAME.isPaused) {
        resumeGame();
      } else {
        pauseGame();
      }
    }
  }
}

// Game UI Functions
function initUI() {
  // Create level selection buttons
  const levelButtonsContainer = document.getElementById('level-buttons');
  levelButtonsContainer.innerHTML = '';

  for (let i = 0; i < GAME.levelData.length; i++) {
    const levelButton = document.createElement('div');
    levelButton.className = 'level-button';
    levelButton.textContent = i + 1;

    if (i + 1 <= GAME.maxUnlockedLevel) {
      levelButton.classList.add('unlocked');
      levelButton.addEventListener('click', () => selectLevel(i + 1));
    } else {
      levelButton.classList.add('locked');
    }

    levelButtonsContainer.appendChild(levelButton);
  }

  // Select current level
  selectLevel(GAME.currentLevel);
}

function selectLevel(level) {
  if (level <= GAME.maxUnlockedLevel) {
    GAME.currentLevel = level;

    // Update selected button
    const levelButtons = document.querySelectorAll('.level-button');
    levelButtons.forEach((button, index) => {
      if (index + 1 === level) {
        button.classList.add('selected');
      } else {
        button.classList.remove('selected');
      }
    });
  }
}

function updateSheepCount() {
  document.getElementById('sheep-count').textContent = GAME.sheepInPen;
  document.getElementById('total-sheep').textContent = sheep.length;
}

function updateTimer() {
  const timeLeft = Math.max(0, GAME.nightfallTime - Math.floor(GAME.gameTime));
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  document.getElementById('timer').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Update level display
  document.getElementById('current-level').textContent = GAME.currentLevel;
}

// Screen management
function showScreen(screenId) {
  // Hide all screens
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => {
    screen.style.display = 'none';
  });

  // Show the requested screen
  const screen = document.getElementById(screenId);
  if (screen) {
    screen.style.display = 'flex';
  }

  // Show/hide game UI
  const gameUI = document.getElementById('game-ui');
  gameUI.style.display = (screenId === 'game-ui') ? 'flex' : 'none';
}

// Game progress management
function loadGameProgress() {
  const savedLevel = localStorage.getItem('shepherdsDogLevel');
  if (savedLevel) {
    GAME.maxUnlockedLevel = parseInt(savedLevel);
    GAME.currentLevel = Math.min(GAME.maxUnlockedLevel, GAME.levelData.length);
  }
}

function saveGameProgress() {
  localStorage.setItem('shepherdsDogLevel', GAME.maxUnlockedLevel.toString());
}

// Level management
function loadLevel(levelNumber) {
  // Reset game state
  GAME.isRunning = false;
  GAME.isPaused = false;
  GAME.gameTime = 0;
  GAME.sheepInPen = 0;

  // Get level data
  const levelIndex = levelNumber - 1;
  if (levelIndex < 0 || levelIndex >= GAME.levelData.length) {
    console.error('Invalid level number');
    return;
  }

  currentLevelData = GAME.levelData[levelIndex];

  // Scale level to actual pixels
  scaleLevel(currentLevelData);

  // Create sheep
  sheep = [];
  const sheepStartX = currentLevelData.sheepStartArea.x;
  const sheepStartY = currentLevelData.sheepStartArea.y;
  const sheepAreaWidth = currentLevelData.sheepStartArea.width;
  const sheepAreaHeight = currentLevelData.sheepStartArea.height;

  for (let i = 0; i < currentLevelData.sheepCount; i++) {
    const x = sheepStartX + Math.random() * sheepAreaWidth;
    const y = sheepStartY + Math.random() * sheepAreaHeight;
    sheep.push(new Sheep(x, y));
  }

  // Create obstacles
  obstacles = [];
  for (let obstacleData of currentLevelData.obstacles) {
    obstacles.push(obstacleData);
  }

  // Create wolves
  wolves = [];
  for (let wolfData of currentLevelData.wolves) {
    wolves.push(new Wolf(wolfData.x, wolfData.y));
  }

  // Set pen location
  pen = {
    x: currentLevelData.penPosition.x,
    y: currentLevelData.penPosition.y,
    width: currentLevelData.penPosition.width,
    height: currentLevelData.penPosition.height
  };

  // Set night time limit
  GAME.nightfallTime = currentLevelData.timeLimit;

  // Set sheep goal
  GAME.sheepGoal = Math.ceil(currentLevelData.sheepCount * (currentLevelData.requiredPercentage / 100));

  // Start dog in the middle
  dog.x = GAME.width / 2;
  dog.y = GAME.height / 2;

  // Update UI
  updateSheepCount();
  updateTimer();

  // Show game UI
  document.getElementById('game-ui').style.display = 'flex';
}

function scaleLevel(levelData) {
  // Scale percentage values to pixel values for the current canvas size

  // Scale pen
  pen.x = levelData.penPosition.x * GAME.width;
  pen.y = levelData.penPosition.y * GAME.height;
  pen.width = levelData.penPosition.width * GAME.width;
  pen.height = levelData.penPosition.height * GAME.height;

  // Scale sheep start area
  levelData.sheepStartArea.x = levelData.sheepStartArea.x * GAME.width;
  levelData.sheepStartArea.y = levelData.sheepStartArea.y * GAME.height;
  levelData.sheepStartArea.width = levelData.sheepStartArea.width * GAME.width;
  levelData.sheepStartArea.height = levelData.sheepStartArea.height * GAME.height;

  // Scale obstacles
  for (let obstacle of levelData.obstacles) {
    obstacle.x = obstacle.x * GAME.width;
    obstacle.y = obstacle.y * GAME.height;

    if (obstacle.type === 'rect') {
      // No need to scale width/height as they're already in pixels
    } else if (obstacle.type === 'circle') {
      // Scale radius proportionally to the smaller dimension
      const scaleFactor = Math.min(GAME.width, GAME.height) / 800;
      obstacle.radius = obstacle.radius * scaleFactor;
    }

    // Scale movable obstacle bounds
    if (obstacle.movable) {
      obstacle.bounds.minX = obstacle.bounds.minX * GAME.width;
      obstacle.bounds.maxX = obstacle.bounds.maxX * GAME.width;
      obstacle.bounds.minY = obstacle.bounds.minY * GAME.height;
      obstacle.bounds.maxY = obstacle.bounds.maxY * GAME.height;

      // Scale velocity
      const velocityScale = Math.min(GAME.width, GAME.height) / 800;
      obstacle.vx = obstacle.vx * velocityScale;
      obstacle.vy = obstacle.vy * velocityScale;
    }
  }

  // Scale wolf positions
  for (let wolf of levelData.wolves) {
    wolf.x = wolf.x * GAME.width;
    wolf.y = wolf.y * GAME.height;
  }
}

// Game flow functions
function startGame() {
  loadLevel(GAME.currentLevel);
  GAME.isRunning = true;
  showScreen('game-ui');
  GAME.lastFrameTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function startNextLevel() {
  if (GAME.currentLevel < GAME.levelData.length) {
    GAME.currentLevel++;
    startGame();
  } else {
    // Game is complete
    goToMainMenu();
  }
}

function retryLevel() {
  startGame();
}

function goToMainMenu() {
  GAME.isRunning = false;
  GAME.isPaused = false;
  showScreen('start-screen');
  initUI();
}

function pauseGame() {
  if (GAME.isRunning) {
    GAME.isPaused = true;
    showScreen('pause-screen');
  }
}

function resumeGame() {
  if (GAME.isRunning) {
    GAME.isPaused = false;
    showScreen('game-ui');
    GAME.lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
  }
}

// Check if level is complete
function checkLevelComplete() {
  if (GAME.sheepInPen >= GAME.sheepGoal) {
    // Level complete
    GAME.isRunning = false;

    // Unlock next level if this is the highest level reached
    if (GAME.currentLevel === GAME.maxUnlockedLevel && GAME.currentLevel < GAME.levelData.length) {
      GAME.maxUnlockedLevel++;
      saveGameProgress();
    }

    // Update win screen
    document.getElementById('win-sheep-count').textContent = GAME.sheepInPen;

    // Show win screen
    showScreen('win-screen');
  }
}

// Check if game is over (nightfall)
function checkGameOver() {
  if (GAME.gameTime >= GAME.nightfallTime) {
    // Game over - nightfall
    GAME.isRunning = false;

    // Update game over screen
    document.getElementById('game-over-sheep-count').textContent = GAME.sheepInPen;

    // Show game over screen
    showScreen('game-over-screen');
  }
}

// Update movable obstacles
function updateObstacles() {
  for (let obstacle of obstacles) {
    if (obstacle.movable) {
      // Update position
      obstacle.x += obstacle.vx;
      obstacle.y += obstacle.vy;

      // Bound check and reverse direction if needed
      if (obstacle.x < obstacle.bounds.minX) {
        obstacle.x = obstacle.bounds.minX;
        obstacle.vx *= -1;
      } else if (obstacle.x > obstacle.bounds.maxX) {
        obstacle.x = obstacle.bounds.maxX;
        obstacle.vx *= -1;
      }

      if (obstacle.y < obstacle.bounds.minY) {
        obstacle.y = obstacle.bounds.minY;
        obstacle.vy *= -1;
      } else if (obstacle.y > obstacle.bounds.maxY) {
        obstacle.y = obstacle.bounds.maxY;
        obstacle.vy *= -1;
      }
    }
  }
}

// Main game loop
function gameLoop(timestamp) {
  if (!GAME.isRunning || GAME.isPaused) return;

  // Calculate time delta
  const delta = timestamp - GAME.lastFrameTime;
  GAME.lastFrameTime = timestamp;

  // Update game time
  GAME.gameTime += delta / 1000; // Convert to seconds

  // Clear canvas
  GAME.ctx.clearRect(0, 0, GAME.width, GAME.height);

  // Draw grass background
  GAME.ctx.fillStyle = '#9cd969';
  GAME.ctx.fillRect(0, 0, GAME.width, GAME.height);

  // Draw pen
  drawPen();

  // Update and draw obstacles
  updateObstacles();
  drawObstacles();

  // Update and draw sheep
  for (let s of sheep) {
    s.update(sheep, obstacles, pen, dog);
    s.draw(GAME.ctx);
  }

  // Update and draw wolves
  for (let w of wolves) {
    w.update(sheep, obstacles);
    w.draw(GAME.ctx);
  }

  // Update and draw dog
  dog.update();
  dog.draw(GAME.ctx);

  // Update UI
  updateTimer();

  // Check win/lose conditions
  checkLevelComplete();
  checkGameOver();

  // Continue the loop
  if (GAME.isRunning) {
    requestAnimationFrame(gameLoop);
  }
}

// Drawing functions
function drawPen() {
  // Fill pen with a different color
  GAME.ctx.fillStyle = 'rgba(210, 180, 140, 0.6)';
  GAME.ctx.fillRect(pen.x, pen.y, pen.width, pen.height);

  // Draw pen boundary
  GAME.ctx.beginPath();
  GAME.ctx.rect(pen.x, pen.y, pen.width, pen.height);
  GAME.ctx.strokeStyle = '#8B4513';
  GAME.ctx.lineWidth = 5;
  GAME.ctx.stroke();

  // Draw grid lines to represent fence
  GAME.ctx.beginPath();
  GAME.ctx.strokeStyle = '#8B4513';
  GAME.ctx.lineWidth = 2;

  // Vertical lines
  const vertSpacing = 20;
  for (let x = pen.x; x <= pen.x + pen.width; x += vertSpacing) {
    GAME.ctx.moveTo(x, pen.y);
    GAME.ctx.lineTo(x, pen.y + pen.height);
  }

  // Horizontal lines
  const horizSpacing = 20;
  for (let y = pen.y; y <= pen.y + pen.height; y += horizSpacing) {
    GAME.ctx.moveTo(pen.x, y);
    GAME.ctx.lineTo(pen.x + pen.width, y);
  }

  GAME.ctx.stroke();

  // Add "GOAL" text above the pen
  GAME.ctx.font = 'bold 24px Arial';
  GAME.ctx.fillStyle = '#8B4513';
  GAME.ctx.textAlign = 'center';
  GAME.ctx.fillText('GOAL', pen.x + pen.width / 2, pen.y - 10);

  // Draw progress indicator
  GAME.ctx.font = '18px Arial';
  GAME.ctx.fillStyle = '#8B4513';
  GAME.ctx.textAlign = 'center';
  GAME.ctx.fillText(`${GAME.sheepInPen}/${sheep.length}`, pen.x + pen.width / 2, pen.y + pen.height + 20);
}

function drawObstacles() {
  for (let obstacle of obstacles) {
    if (obstacle.type === 'circle') {
      // Draw tree-like obstacle
      GAME.ctx.beginPath();

      // Tree trunk
      GAME.ctx.fillStyle = '#8B4513';
      GAME.ctx.fillRect(obstacle.x - obstacle.radius * 0.2, obstacle.y, obstacle.radius * 0.4, obstacle.radius * 0.8);

      // Tree top (circle)
      GAME.ctx.arc(obstacle.x, obstacle.y - obstacle.radius * 0.3, obstacle.radius * 0.8, 0, Math.PI * 2);
      GAME.ctx.fillStyle = '#228B22';
      GAME.ctx.fill();
      GAME.ctx.closePath();
    } else if (obstacle.type === 'rect') {
      // Draw rock-like obstacle
      GAME.ctx.beginPath();
      GAME.ctx.fillStyle = '#808080';
      GAME.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

      // Add some shading
      GAME.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      GAME.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width * 0.3, obstacle.height * 0.3);
      GAME.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      GAME.ctx.fillRect(obstacle.x + obstacle.width * 0.7, obstacle.y + obstacle.height * 0.7, obstacle.width * 0.3, obstacle.height * 0.3);
      GAME.ctx.closePath();
    }
  }
}

// Sky color based on time
function getSkyColor() {
  const timeRatio = GAME.gameTime / GAME.nightfallTime;

  if (timeRatio < 0.5) {
    // Daytime - blue
    return '#87CEEB';
  } else if (timeRatio < 0.75) {
    // Evening - orange/red
    return '#FF7F50';
  } else {
    // Night approaching - dark blue
    const darkening = (timeRatio - 0.75) * 4; // 0 to 1
    const r = Math.floor(135 * (1 - darkening));
    const g = Math.floor(206 * (1 - darkening));
    const b = Math.floor(235 * (1 - darkening));
    return `rgb(${r}, ${g}, ${b})`;
  }
}

// Initialize the game when the page loads
window.addEventListener('load', initGame);
