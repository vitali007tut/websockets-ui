import { WebSocket } from 'ws';

export interface Ship {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
}

export interface GamePlayer {
  playerId: number;
  playerIndex: number;
  ws: WebSocket;
  ships: Ship[];
  board: string[][];
  hits: Set<string>; // Track hit cells as "x,y"
}

export interface Game {
  gameId: number;
  players: [GamePlayer, GamePlayer] | [GamePlayer];
  currentTurn: number;
  started: boolean;
}

class GameManager {
  private games: Map<number, Game> = new Map();

  createGame(gameId: number): void {
    const game: Game = {
      gameId,
      players: [] as any,
      currentTurn: 0,
      started: false,
    };
    this.games.set(gameId, game);
    console.log(`Game ${gameId} initialized`);
  }

  addPlayerShips(
    gameId: number,
    playerId: number,
    playerIndex: number,
    ws: WebSocket,
    ships: Ship[]
  ): boolean {
    const game = this.games.get(gameId);
    if (!game) {
      console.log(`Game ${gameId} not found`);
      return false;
    }

    const gamePlayer: GamePlayer = {
      playerId,
      playerIndex,
      ws,
      ships,
      board: this.createEmptyBoard(),
      hits: new Set(),
    };

    // Place ships on board
    this.placeShipsOnBoard(gamePlayer);

    game.players.push(gamePlayer as any);
    console.log(`Player ${playerId} added ships to game ${gameId}`);

    return true;
  }

  isGameReady(gameId: number): boolean {
    const game = this.games.get(gameId);
    return game ? game.players.length === 2 : false;
  }

  startGame(gameId: number): boolean {
    const game = this.games.get(gameId);
    if (!game || game.players.length !== 2) {
      return false;
    }

    // Randomly choose who goes first
    game.currentTurn = game.players[Math.floor(Math.random() * 2)].playerId;
    game.started = true;

    console.log(`Game ${gameId} started, first turn: player ${game.currentTurn}`);
    return true;
  }

  getGame(gameId: number): Game | undefined {
    return this.games.get(gameId);
  }

  getPlayerShips(gameId: number, playerId: number): Ship[] | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    const player = game.players.find((p) => p.playerId === playerId);
    return player ? player.ships : null;
  }

  getCurrentTurn(gameId: number): number | null {
    const game = this.games.get(gameId);
    return game ? game.currentTurn : null;
  }

  private createEmptyBoard(): string[][] {
    return Array(10)
      .fill(null)
      .map(() => Array(10).fill(''));
  }

  private placeShipsOnBoard(player: GamePlayer): void {
    for (const ship of player.ships) {
      const { x, y } = ship.position;
      const { direction, length } = ship;

      for (let i = 0; i < length; i++) {
        if (!direction) {
          // direction=false from frontend means horizontal on server
          if (x + i < 10) {
            player.board[y][x + i] = 'ship';
          }
        } else {
          // direction=true from frontend means vertical on server
          if (y + i < 10) {
            player.board[y + i][x] = 'ship';
          }
        }
      }
    }
  }

  processAttack(
    gameId: number,
    attackingPlayerId: number,
    x: number,
    y: number
  ): { status: 'miss' | 'shot' | 'killed'; cellsToMark?: Array<{ x: number; y: number }> } | null {
    const game = this.games.get(gameId);
    if (!game || !game.started) return null;

    // Find defending player (the one being attacked)
    const defendingPlayer = game.players.find((p) => p.playerId !== attackingPlayerId);
    if (!defendingPlayer) return null;

    // Check if already hit this cell
    const cellKey = `${x},${y}`;
    if (defendingPlayer.hits.has(cellKey)) {
      return { status: 'miss' };
    }

    // Mark as hit
    defendingPlayer.hits.add(cellKey);

    // Check if hit a ship
    if (defendingPlayer.board[y] && defendingPlayer.board[y][x] === 'ship') {
      // Check if ship is killed
      const killedShip = this.findKilledShip(defendingPlayer, x, y);
      if (killedShip) {
        console.log(`Ship killed at (${x},${y})`);
        
        // Get cells around killed ship to mark as miss
        const cellsToMark = this.getCellsAroundShip(killedShip);
        
        // Mark those cells as hit too (so they can't be targeted)
        cellsToMark.forEach((cell) => {
          defendingPlayer.hits.add(`${cell.x},${cell.y}`);
        });

        return { status: 'killed', cellsToMark };
      }

      return { status: 'shot' };
    }

    // Miss
    return { status: 'miss' };
  }

  switchTurn(gameId: number): void {
    const game = this.games.get(gameId);
    if (!game) return;

    // Switch to the other player
    const currentPlayerIndex = game.players.findIndex((p) => p.playerId === game.currentTurn);
    const nextPlayerIndex = currentPlayerIndex === 0 ? 1 : 0;
    game.currentTurn = game.players[nextPlayerIndex].playerId;
    console.log(`Turn switched to player ${game.currentTurn}`);
  }

  checkWin(gameId: number, defendingPlayerId: number): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    const defender = game.players.find((p) => p.playerId === defendingPlayerId);
    if (!defender) return false;

    // Check if all ship cells are hit
    let totalShipCells = 0;
    let hitShipCells = 0;

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (defender.board[y][x] === 'ship') {
          totalShipCells++;
          if (defender.hits.has(`${x},${y}`)) {
            hitShipCells++;
          }
        }
      }
    }

    return totalShipCells > 0 && hitShipCells === totalShipCells;
  }

  getRandomAttackCoordinates(gameId: number, attackingPlayerId: number): { x: number; y: number } | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    const defendingPlayer = game.players.find((p) => p.playerId !== attackingPlayerId);
    if (!defendingPlayer) return null;

    // Find all cells that haven't been hit yet
    const availableCells: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (!defendingPlayer.hits.has(`${x},${y}`)) {
          availableCells.push({ x, y });
        }
      }
    }

    if (availableCells.length === 0) return null;

    // Pick random cell
    const randomIndex = Math.floor(Math.random() * availableCells.length);
    return availableCells[randomIndex];
  }

  private findKilledShip(player: GamePlayer, hitX: number, hitY: number): Ship | null {
    for (const ship of player.ships) {
      const shipCells = this.getShipCells(ship);
      
      // Check if hit cell belongs to this ship
      const belongsToShip = shipCells.some((cell) => cell.x === hitX && cell.y === hitY);
      if (!belongsToShip) continue;

      // Check if all cells of this ship are hit
      const allHit = shipCells.every((cell) => player.hits.has(`${cell.x},${cell.y}`));
      if (allHit) {
        return ship;
      }
    }

    return null;
  }

  private getShipCells(ship: Ship): Array<{ x: number; y: number }> {
    const cells: Array<{ x: number; y: number }> = [];
    const { x, y } = ship.position;
    const { direction, length } = ship;

    for (let i = 0; i < length; i++) {
      if (!direction) {
        // direction=false from frontend means horizontal
        cells.push({ x: x + i, y });
      } else {
        // direction=true from frontend means vertical
        cells.push({ x, y: y + i });
      }
    }

    return cells;
  }

  private getCellsAroundShip(ship: Ship): Array<{ x: number; y: number }> {
    const cells: Array<{ x: number; y: number }> = [];
    const shipCells = this.getShipCells(ship);

    // Get all cells around the ship (including diagonals)
    const offsets = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],           [1, 0],
      [-1, 1],  [0, 1],  [1, 1],
    ];

    for (const shipCell of shipCells) {
      for (const [dx, dy] of offsets) {
        const nx = shipCell.x + dx;
        const ny = shipCell.y + dy;

        // Check bounds
        if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) {
          // Check if it's not a ship cell itself
          const isShipCell = shipCells.some((sc) => sc.x === nx && sc.y === ny);
          if (!isShipCell) {
            // Check if not already in list
            const alreadyAdded = cells.some((c) => c.x === nx && c.y === ny);
            if (!alreadyAdded) {
              cells.push({ x: nx, y: ny });
            }
          }
        }
      }
    }

    return cells;
  }

  deleteGame(gameId: number): void {
    this.games.delete(gameId);
    console.log(`Game ${gameId} deleted`);
  }
}

export const gameManager = new GameManager();

