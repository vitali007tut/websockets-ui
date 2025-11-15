export interface WSMessage {
  type: string;
  data: string | object;
  id: number;
}

export interface RegRequest {
  name: string;
  password: string;
}

export interface RegResponse {
  name: string;
  index: number;
  error: boolean;
  errorText: string;
}

export interface WinnerData {
  name: string;
  wins: number;
}

export interface AddUserToRoomRequest {
  indexRoom: number | string;
}

export interface CreateGameResponse {
  idGame: number | string;
  idPlayer: number | string;
}

export interface RoomData {
  roomId: number | string;
  roomUsers: Array<{
    name: string;
    index: number | string;
  }>;
}

export interface ShipData {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
}

export interface AddShipsRequest {
  gameId: number | string;
  ships: ShipData[];
  indexPlayer: number | string;
}

export interface StartGameResponse {
  ships: ShipData[];
  currentPlayerIndex: number | string;
}

export interface TurnResponse {
  currentPlayer: number | string;
}

export interface AttackRequest {
  gameId: number | string;
  x: number;
  y: number;
  indexPlayer: number | string;
}

export interface RandomAttackRequest {
  gameId: number | string;
  indexPlayer: number | string;
}

export interface AttackResponse {
  position: {
    x: number;
    y: number;
  };
  currentPlayer: number | string;
  status: 'miss' | 'killed' | 'shot';
}

export interface FinishResponse {
  winPlayer: number | string;
}

