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
        if (direction) {
          // horizontal
          if (x + i < 10) {
            player.board[y][x + i] = 'ship';
          }
        } else {
          // vertical
          if (y + i < 10) {
            player.board[y + i][x] = 'ship';
          }
        }
      }
    }
  }

  deleteGame(gameId: number): void {
    this.games.delete(gameId);
    console.log(`Game ${gameId} deleted`);
  }
}

export const gameManager = new GameManager();

