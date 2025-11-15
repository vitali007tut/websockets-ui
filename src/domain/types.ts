export type CoordinateLabel = `${Uppercase<string>}${number}`;

export interface CoordinatePoint {
    row: number;
    col: number;
    label: CoordinateLabel;
}

export type ShipCell = CoordinatePoint;

export interface ShipPlacement {
    id: string;
    length: number;
    cells: ShipCell[];
    destroyed: boolean;
}

export interface FleetState {
    ships: ShipPlacement[];
    aliveCells: number;
}

export enum GamePhase {
    Lobby = 'lobby',
    AwaitingBoards = 'awaiting-boards',
    Active = 'active',
    Finished = 'finished',
}

export enum PlayerRole {
    Participant = 'participant',
    Spectator = 'spectator',
}

export enum ShotOutcome {
    Miss = 'miss',
    Hit = 'hit',
    Kill = 'kill',
}

export interface ShotResultPayload {
    gameId: string;
    shooterId: string;
    target: CoordinateLabel;
    outcome: ShotOutcome;
    sunkShip?: ShipPlacement;
    nextTurn?: string;
}

export interface MessageEnvelope<TType extends string, TPayload = Record<string, unknown>> {
    type: TType;
    payload: TPayload;
}

export type InboundMessage =
    | MessageEnvelope<'createGame', { nickname?: string }>
    | MessageEnvelope<'joinGame', { gameId: string; nickname?: string }>
    | MessageEnvelope<'leaveGame', { gameId: string }>
    | MessageEnvelope<'submitBoard', { gameId: string; cells: CoordinateLabel[] }>
    | MessageEnvelope<'randomBoard', { gameId: string }>
    | MessageEnvelope<'fire', { gameId: string; target: CoordinateLabel }>;

export type OutboundMessage =
    | MessageEnvelope<'error', { code: string; reason: string }>
    | MessageEnvelope<'gameCreated', { gameId: string }>
    | MessageEnvelope<'gameJoined', { gameId: string; playerId: string }>
    | MessageEnvelope<'boardAccepted', { gameId: string }>
    | MessageEnvelope<'shotResult', ShotResultPayload>
    | MessageEnvelope<'turnChanged', { gameId: string; activePlayerId: string }>
    | MessageEnvelope<'gameOver', { gameId: string; winnerId: string }>;
