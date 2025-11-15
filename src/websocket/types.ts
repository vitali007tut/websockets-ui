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

