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

