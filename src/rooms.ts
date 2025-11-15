import { WebSocket } from 'ws';

export interface Room {
  roomId: number;
  players: Array<{
    ws: WebSocket;
    name: string;
    index: number;
  }>;
}

class RoomManager {
  private rooms: Map<number, Room> = new Map();
  private nextRoomId = 1;
  private nextGamePlayerId = 1;

  createRoom(ws: WebSocket, playerName: string, playerIndex: number): number {
    const roomId = this.nextRoomId++;
    const room: Room = {
      roomId,
      players: [{ ws, name: playerName, index: playerIndex }],
    };
    this.rooms.set(roomId, room);
    console.log(`Room ${roomId} created by ${playerName}`);
    return roomId;
  }

  addPlayerToRoom(roomId: number, ws: WebSocket, playerName: string, playerIndex: number): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      console.log(`Room ${roomId} not found`);
      return false;
    }

    if (room.players.length >= 2) {
      console.log(`Room ${roomId} is already full`);
      return false;
    }

    room.players.push({ ws, name: playerName, index: playerIndex });
    console.log(`Player ${playerName} joined room ${roomId}`);
    return true;
  }

  getRoomById(roomId: number): Room | undefined {
    return this.rooms.get(roomId);
  }

  getAvailableRooms(): Array<{ roomId: number; roomUsers: Array<{ name: string; index: number }> }> {
    const available: Array<{ roomId: number; roomUsers: Array<{ name: string; index: number }> }> = [];

    this.rooms.forEach((room) => {
      if (room.players.length === 1) {
        available.push({
          roomId: room.roomId,
          roomUsers: room.players.map((p) => ({ name: p.name, index: p.index })),
        });
      }
    });

    return available;
  }

  generateGamePlayerIds(roomId: number): { gameId: number; playerIds: number[] } | null {
    const room = this.rooms.get(roomId);
    if (!room || room.players.length !== 2) {
      return null;
    }

    const gameId = roomId; // Use roomId as gameId
    const playerIds = [this.nextGamePlayerId++, this.nextGamePlayerId++];

    return { gameId, playerIds };
  }

  deleteRoom(roomId: number): void {
    this.rooms.delete(roomId);
    console.log(`Room ${roomId} deleted`);
  }
}

export const roomManager = new RoomManager();

