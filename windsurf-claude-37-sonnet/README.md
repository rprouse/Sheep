# Shepherd's Dog

A fun HTML5 canvas game where you play as a dog herding sheep into a pen while avoiding obstacles and wolves.

## Game Overview

In "Shepherd's Dog," you control a dog with your mouse or touch input to herd sheep into a pen before time runs out. The game features:

- Multiple levels with increasing difficulty
- Realistic sheep flocking behavior
- Wolves that chase and scare sheep
- Various obstacles to navigate around
- Time-based challenges

## How to Play

1. Move your dog with the mouse or touch to herd sheep
2. Click or tap to bark and make sheep move faster
3. Herd at least the required number of sheep into the pen before time runs out
4. Watch out for obstacles and wolves!

## Game Mechanics

### Sheep Behavior

Sheep exhibit realistic flocking behavior based on three main rules:
- **Separation**: Sheep avoid getting too close to each other
- **Alignment**: Sheep tend to move in the same direction as nearby sheep
- **Cohesion**: Sheep are attracted to the center of nearby flocks

Additionally, sheep will:
- Run away from the dog when it gets too close
- Run away from wolves
- Avoid obstacles
- Move faster when the dog barks

### Wolf Behavior

Wolves will:
- Chase nearby sheep
- Scare sheep, causing them to run away
- Move around the map looking for sheep

### Level Progression

The game features 5 levels with increasing difficulty:
- More sheep to herd
- Higher percentage of sheep required to win
- Introduction of wolves
- More obstacles

## Technical Details

The game is built using:
- HTML5 Canvas for rendering
- JavaScript for game logic
- CSS for styling and UI

The game uses a simple physics-based system for movement and collision detection, and implements flocking behavior for the sheep based on the Boids algorithm.

## Running the Game

Simply open the `index.html` file in a modern web browser to play the game.

## Credits

Created by [Your Name] using HTML5, CSS, and JavaScript.
