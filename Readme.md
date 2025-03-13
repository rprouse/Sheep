# Shepherd's Dog

Attempting to recreate the game presented in https://github.com/vnglst/when-ai-fails/tree/main/shepards-dog
but instead of using a single pass to an LLM, I am attempting to recreate the games
using agentic programming tools like GitHub Copilot, Windsurf, etc.

| Tool | Model | Game | Comments |
| --- | --- | --- | --- |
| Aider | Claude 3.7 Sonnet | [Demo](./aider-claude-37-sonnet/index.html) | Game worked after first prompt including loading screens. While tweaking the app, I got rate limited by the Anthropic API. |
| VS Code GitHub Copilot | Claude 3.7 Sonnet | [Demo](./copilot-claude-37-sonnet/index.html) | Didn't complete with the error "Sorry, the response hit the length limit. Please rephrase your prompt." Tried again, but still failed to complete. |
| VS Code GitHub Copilot | GPT-4o | [Demo](./copilot-gpt4o/index.html) | This took much prompting and I'm still not happy with it. The graphics are rudementary, there is no game load screen and the gameplay is rough. |
| Windsurf | Claude 3.7 Sonnet | [Demo](./windsurf-claude-37-sonnet/index.html) | This produced a much nicer and feature rich game on the first pass, but despite many prompts, I could not get the game working properly. It kept going in loops trying to fix issues. You can get the game working by pausing and resuming. I do like the cleanliness of the code though and feel like I could dive in, fix the issues and continue. I also like that it added a [Readme.md](./windsurf-claude-37-sonnet/README.md) explaining the game. |

## Prompt

```txt
Create a game called _Shepherd's Dog_ where the player controls a dog to herd sheep into a pen. The core gameplay mechanic and what makes this game stand out is the realistic flocking behavior of the sheep - they should move as a cohesive group, follow each other, and react naturally to the dog and obstacles. The player moves the dog using mouse or touch controls and herds the sheep into a pen. The player can bark by clicking/tapping on the screen to make the sheep move faster. To complete each level, the player must herd at least 80% of the sheep (e.g., 40 out of 50 sheep) into the pen before nightfall. The difficulty increases as the game progresses through more obstacles between the starting position of the sheep and the pen.

## Flocking Behavior Requirements

- Sheep should demonstrate authentic flocking behavior based on principles like separation, alignment, and cohesion
- Sheep should react realistically to the dog's presence (moving away while staying in a group)
- The flock should navigate around obstacles while maintaining group dynamics
- Individual sheep should occasionally stray but generally try to rejoin the flock
- When frightened, the flock should scatter in believable patterns

## Technical constraints

- The game should be build using HTML, CSS and JavaScript separated into `index.js`, `style.css` and `game.js`
- It's okay to use external libraries when this is needed
- You will generate your own assets using basic shapes, but they should be recognizable (e.g., triangles for sheep, circles for the dog)
- The game should be playable on both desktop and mobile devices

## Features

- Players can control the dog using mouse or touch controls
- The dog barks when the player clicks or taps on the screen, making the sheep move faster
- The sheep show natural, realistic flocking behavior as the primary gameplay element
- The game increases in difficulty with more obstacles between the pen and the starting position of the sheep herd
- Obstacles can be static or dynamic (e.g., moving obstacles)
- Example obstacles include rock, trees, fences, rivers, roads (with cars), etc.
- Additionally, later in the game, wolves can appear. They don't attack until nightfall, but they scare sheep and can cause the herd to completely disperse
- The player must prevent wolves from scaring the sheep to succeed
- It should have at least 10 levels
- Include a start screen, a game over screen, and a win screen
- Have a timer that counts down to nightfall
- Have a score that increases with each sheep herded into the pen
- Include an option to restart the game after a game over
- Include an option to go to the next level after a win
- Include an option to go back to the start screen after a win or game over
- Game progress should be stored between sessions (using local storage)

Make sure the game is fun to play and is visually appealing, even with simple shapes. The realistic flocking behavior should be the standout feature that makes the game engaging and distinctive.
```
