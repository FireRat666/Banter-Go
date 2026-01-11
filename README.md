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
<script src="Go.js"></script>
```

### Configuration via URL Parameters

You can configure the board's position, size, and behavior by appending parameters to the script URL.

| Parameter | Description | Default | Example |
| :--- | :--- | :--- | :--- |
| `boardPosition` | Position of the board (x y z) | `0 1.5 0` | `boardPosition=2 1 5` |
| `boardRotation` | Rotation of the board (x y z) | `0 0 0` | `boardRotation=0 45 0` |
| `boardScale` | Scale of the board (x y z) | `1 1 1` | `boardScale=0.5 0.5 0.5` |
| `boardSize` | Grid size (e.g., 19, 13, 9) | `19` | `boardSize=9` |
| `hideUI` | Hide the Reset/Pass buttons | `false` | `hideUI=true` |
| `instance` | Unique ID for this game instance | URL path | `instance=table1` |

**Example:**

```html
<script src="Go.js?boardPosition=0 1 2&boardSize=13&instance=game1"></script>
```

## How to Play

1. **Black** moves first.
2. Click an intersection on the grid to place a stone.
3. **Capturing:** Surround an opponent's stone or group of stones completely to capture them.
4. **Passing:** If you cannot make a beneficial move, click the **Pass** button.
5. **Ko:** You cannot make a move that repeats the exact board position of the previous turn.
