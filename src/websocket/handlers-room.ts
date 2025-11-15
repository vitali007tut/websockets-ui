import { WebSocket } from 'ws';
import { roomManager } from '../rooms.js';
import { sendToClient, broadcastToAll, wsPlayerMap } from './server.js';
import { AddUserToRoomRequest, CreateGameResponse } from './types.js';

export function handleCreateRoom(ws: WebSocket) {
  const player = wsPlayerMap.get(ws);
  if (!player) {
    console.log('Cannot create room: player not registered');
    return;
  }

  const roomId = roomManager.createRoom(ws, player.name, player.index);
  console.log(`Room ${roomId} created`);

  // Broadcast updated room list to all clients
  const rooms = roomManager.getAvailableRooms();
  broadcastToAll('update_room', rooms);
}

export function handleAddUserToRoom(ws: WebSocket, data: string | object) {
  try {
    const player = wsPlayerMap.get(ws);
    if (!player) {
      console.log('Cannot join room: player not registered');
      return;
    }

    const requestData: AddUserToRoomRequest = typeof data === 'string' ? JSON.parse(data) : data;
    const roomId = typeof requestData.indexRoom === 'string' 
      ? parseInt(requestData.indexRoom, 10) 
      : requestData.indexRoom;

    const success = roomManager.addPlayerToRoom(roomId, ws, player.name, player.index);
    
    if (!success) {
      console.log(`Failed to add player ${player.name} to room ${roomId}`);
      return;
    }

    console.log(`Player ${player.name} successfully joined room ${roomId}`);

    const rooms = roomManager.getAvailableRooms();
    broadcastToAll('update_room', rooms);

    const gameInfo = roomManager.generateGamePlayerIds(roomId);
    if (gameInfo) {
      const room = roomManager.getRoomById(roomId);
      if (room && room.players.length === 2) {
        const response1: CreateGameResponse = {
          idGame: gameInfo.gameId,
          idPlayer: gameInfo.playerIds[0],
        };
        sendToClient(room.players[0].ws, 'create_game', response1);

        const response2: CreateGameResponse = {
          idGame: gameInfo.gameId,
          idPlayer: gameInfo.playerIds[1],
        };
        sendToClient(room.players[1].ws, 'create_game', response2);

        console.log(`Game ${gameInfo.gameId} created with players ${gameInfo.playerIds[0]} and ${gameInfo.playerIds[1]}`);
      }
    }
  } catch (error) {
    console.error('Error adding user to room:', error);
  }
}

