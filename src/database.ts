export interface Player {
  name: string;
  password: string;
  index: number;
  wins: number;
}

class Database {
  private players: Map<string, Player> = new Map();
  private nextIndex = 1;

  createOrGetPlayer(name: string, password: string): { player: Player; error: boolean; errorText: string } {
    const existingPlayer = this.players.get(name);

    if (existingPlayer) {
      if (existingPlayer.password !== password) {
        return {
          player: existingPlayer,
          error: true,
          errorText: 'Wrong password',
        };
      }
      return {
        player: existingPlayer,
        error: false,
        errorText: '',
      };
    }

    const newPlayer: Player = {
      name,
      password,
      index: this.nextIndex++,
      wins: 0,
    };
    this.players.set(name, newPlayer);

    return {
      player: newPlayer,
      error: false,
      errorText: '',
    };
  }

  getAllWinners(): Array<{ name: string; wins: number }> {
    return Array.from(this.players.values())
      .map((p) => ({ name: p.name, wins: p.wins }))
      .sort((a, b) => b.wins - a.wins);
  }

  incrementWins(playerIndex: number): void {
    for (const player of this.players.values()) {
      if (player.index === playerIndex) {
        player.wins++;
        break;
      }
    }
  }
}

export const database = new Database();

