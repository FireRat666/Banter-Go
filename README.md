# Banter Go (Weiqi/Baduk)

A fully synced, multiplayer Go game designed for [Banter](https://bantervr.com).

## Features

* **Multiplayer Sync:** Game state is synchronized across all users in the space using Banter's public space properties.
* **Full Ruleset:** Implements standard Go rules including:
* **Liberties & Capturing:** Stones are removed when they have no liberties left.
* **Suicide Prevention:** Moves that result in self-capture are forbidden (unless they capture opponent stones).
* **Ko Rule:** Prevents immediate repetition of the board state.
* **UI Elements:**
* **Scoreboard:** Tracks captured stones for Black and White.
* **Pass Button:** Allows players to pass their turn. The game logic detects when the game should end (though manual agreement is often used).
* **Reset Button:** Clears the board to start a new game.

## Usage

To add the Go board to your Banter space, include the `Go.js` script in your `index.html`.

### Basic Embed

```html
<script src="https://banter-go.firer.at/Go.js"></script>
```

### Configuration via URL Parameters

You can configure the board's position, size, and behavior by appending parameters to the script URL.

| Parameter | Description | Default | Example |
| :--- | :--- | :--- | :--- |
| `instance` | Unique ID for this game instance. Use this to have multiple separate games in one space. | `URL path` | `instance=table1` |
| `boardSize` | Grid size (e.g., 19, 13, 9). | `19` | `boardSize=9` |
| `hideUI` | Makes the UI (buttons, scoreboard) invisible but still functional. | `false` | `hideUI=true` |
| `hideBoard` | Hides the board geometry. | `false` | `hideBoard=true` |
| `useCustomModels` | Use GLB models for pieces. | `false` | `useCustomModels=true` |
| `lighting` | Shader type: 'lit' or 'unlit'. | `unlit` | `lighting=lit` |
| `addLights` | Add directional light for lit mode. | `true` | `addLights=false` |
| `boardPosition` | Position of the game board (x y z). | `0 1.5 0` | `boardPosition=0 1 -2` |
| `boardRotation` | Rotation of the game board (x y z). | `0 0 0` | `boardRotation=0 45 0` |
| `boardScale` | Scale of the game board (x y z). | `1 1 1` | `boardScale=0.5 0.5 0.5` |
| `scoreboardPosition` | Position of the scoreboard, relative to world origin. | `0 1.3 0` | `scoreboardPosition=0 2.5 -2` |
| `scoreboardRotation` | Rotation of the scoreboard. | `0 0 0` | `scoreboardRotation=0 180 0` |
| `scoreboardScale` | Scale of the scoreboard. | `1 1 1` | `scoreboardScale=1.2 1.2 1.2` |
| `resetPosition` | Position of the Reset button, relative to world origin. | `0.3 -1.2 0` | `resetPosition=1 1 -2` |
| `resetRotation` | Rotation of the Reset button. | `0 0 0` | `resetRotation=0 0 30` |
| `resetScale` | Scale of the Reset button. | `1 1 1` | `resetScale=2 2 2` |
| `passPosition` | Position of the Pass button, relative to world origin. | `-0.3 -1.2 0` | `passPosition=-1 1 -2` |
| `passRotation` | Rotation of the Pass button. | `0 0 0` | `passRotation=0 0 -30` |
| `passScale` | Scale of the Pass button. | `1 1 1` | `passScale=2 2 2` |

**Example:**

```html
<script src="https://banter-go.firer.at/Go.js?boardPosition=0 1 2&boardSize=13&instance=game1"></script>
```

## How to Play

1. **Black** moves first.
2. Click an intersection on the grid to place a stone.
3. **Capturing:** Surround an opponent's stone or group of stones completely to capture them.
4. **Passing:** If you cannot make a beneficial move, click the **Pass** button.
5. **Ko:** You cannot make a move that repeats the exact board position of the previous turn.
