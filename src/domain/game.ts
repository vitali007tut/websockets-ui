import { nanoid } from 'nanoid';
import { DEFAULT_FLEET_LAYOUT, ShotOutcome, GamePhase, PlayerRole } from './index.js';
import type { CoordinateLabel, FleetState, ShipPlacement, ShotResultPayload } from './types.js';
import { generateRandomBoard, validateBoardLayout } from './board.js';
import { parseCoordinate } from './coordinates.js';

export interface PlayerSession {
    id: string;
    nickname?: string;
    role: PlayerRole;
    board?: FleetState;
    fogOfWar: Set<string>;
    connected: boolean;
    lastHeartbeatAt: number;
}

export interface GameRoom {
    id: string;
    name?: string;
    createdAt: number;
    updatedAt: number;
    players: PlayerSession[];
    phase: GamePhase;
    currentTurn?: string;
    winnerId?: string;
}

const MAX_PLAYERS = 2;

export const createPlayer = (
    role: PlayerRole = PlayerRole.Participant,
    nickname?: string
): PlayerSession => ({
    id: nanoid(),
    nickname,
    role,
    fogOfWar: new Set<string>(),
    connected: true,
    lastHeartbeatAt: Date.now(),
});

export const createGameRoom = (name?: string): GameRoom => ({
    id: nanoid(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    players: [],
    phase: GamePhase.Lobby,
});

export const gameHasFreeSlot = (game: GameRoom): boolean => game.players.length < MAX_PLAYERS;

export const registerPlayerPresence = (player: PlayerSession): void => {
    player.connected = true;
    player.lastHeartbeatAt = Date.now();
};

export const attachPlayer = (game: GameRoom, player: PlayerSession): void => {
    if (!gameHasFreeSlot(game)) {
        throw new Error('Game lobby is full');
    }
    game.players.push(player);
    game.updatedAt = Date.now();
    if (game.players.length === MAX_PLAYERS) {
        game.phase = GamePhase.AwaitingBoards;
    }
};

export const findPlayer = (game: GameRoom, playerId: string): PlayerSession | undefined =>
    game.players.find((p) => p.id === playerId);

export const getPlayerOrFail = (game: GameRoom, playerId: string): PlayerSession => {
    const player = findPlayer(game, playerId);
    if (!player) {
        throw new Error('Player not in this game');
    }
    return player;
};

export const detachPlayer = (game: GameRoom, playerId: string): void => {
    game.players = game.players.filter((p) => p.id !== playerId);
    game.updatedAt = Date.now();
    game.currentTurn = undefined;
    game.winnerId = undefined;

    if (game.players.length < MAX_PLAYERS && game.phase === GamePhase.Active) {
        game.phase = GamePhase.Finished;
    } else if (game.players.length < MAX_PLAYERS) {
        game.phase = GamePhase.Lobby;
    }
};

export const submitBoard = (game: GameRoom, playerId: string, cells: CoordinateLabel[]): FleetState => {
    const player = getPlayerOrFail(game, playerId);

    const result = validateBoardLayout(cells);
    if (!result.valid || !result.fleet) {
        throw new Error(`Invalid board: ${result.errors.join('; ')}`);
    }

    player.board = result.fleet;
    player.fogOfWar = new Set<string>();
    game.updatedAt = Date.now();

    const readyPlayers = game.players.filter((p) => p.board);
    if (readyPlayers.length === MAX_PLAYERS && game.phase !== GamePhase.Active) {
        game.phase = GamePhase.Active;
        game.currentTurn = readyPlayers[0]!.id;
    }

    return result.fleet;
};

export const assignRandomBoard = (game: GameRoom, playerId: string): FleetState => {
    const fleet = generateRandomBoard();
    submitBoard(
        game,
        playerId,
        fleet.ships.flatMap((ship) => ship.cells.map((cell) => cell.label))
    );
    return fleet;
};

const findOpponent = (game: GameRoom, playerId: string): PlayerSession | undefined =>
    game.players.find((p) => p.id !== playerId);

const markShipHit = (ship: ShipPlacement, target: CoordinateLabel): ShotOutcome => {
    const cell = ship.cells.find((c) => c.label === target);
    if (!cell) return ShotOutcome.Miss;
    ship.cells = ship.cells.filter((c) => c.label !== target);
    if (ship.cells.length === 0) {
        ship.destroyed = true;
        return ShotOutcome.Kill;
    }
    return ShotOutcome.Hit;
};

const reduceFleetHit = (
    fleet: FleetState,
    target: CoordinateLabel
): { outcome: ShotOutcome; destroyedShip?: ShipPlacement } => {
    for (const ship of fleet.ships) {
        const outcome = markShipHit(ship, target);
        if (outcome === ShotOutcome.Miss) continue;
        fleet.aliveCells -= 1;
        return { outcome, destroyedShip: outcome === ShotOutcome.Kill ? ship : undefined };
    }
    return { outcome: ShotOutcome.Miss };
};

export const performShot = (
    game: GameRoom,
    shooterId: string,
    target: CoordinateLabel
): ShotResultPayload => {
    if (game.phase !== GamePhase.Active) {
        throw new Error('Game is not active');
    }
    if (game.currentTurn !== shooterId) {
        throw new Error('Not your turn');
    }

    const shooter = getPlayerOrFail(game, shooterId);
    const opponent = findOpponent(game, shooterId);
    if (!opponent || !opponent.board) {
        throw new Error('Opponent not ready');
    }

    const parsed = parseCoordinate(target);
    const key = parsed.label;

    if (shooter.fogOfWar.has(key)) {
        throw new Error('Coordinate already targeted');
    }
    shooter.fogOfWar.add(key);

    const { outcome, destroyedShip } = reduceFleetHit(opponent.board, key);

    if (opponent.board.aliveCells <= 0) {
        game.phase = GamePhase.Finished;
        game.winnerId = shooterId;
        game.currentTurn = undefined;
    } else if (outcome === ShotOutcome.Miss) {
        game.currentTurn = opponent.id;
    }

    game.updatedAt = Date.now();

    return {
        gameId: game.id,
        shooterId,
        target: key,
        outcome,
        sunkShip: destroyedShip,
        nextTurn: game.currentTurn,
    };
};

// ----- In-memory registry -----

const activeGames = new Map<string, GameRoom>();

export const registerGame = (game: GameRoom): void => {
    activeGames.set(game.id, game);
};

export const removeGame = (gameId: string): void => {
    activeGames.delete(gameId);
};

export const findGame = (gameId: string): GameRoom | undefined => activeGames.get(gameId);

export const getGameOrFail = (gameId: string): GameRoom => {
    const game = findGame(gameId);
    if (!game) {
        throw new Error('Game not found');
    }
    return game;
};

export const listGames = (): GameRoom[] => Array.from(activeGames.values());
