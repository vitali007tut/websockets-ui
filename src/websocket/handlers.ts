import { WebSocket } from 'ws';
import { database } from '../database.js';
import { roomManager } from '../rooms.js';
import { sendToClient, broadcastToAll, wsPlayerMap } from './server.js';
import { WSMessage, RegRequest, RegResponse } from './types.js';
import { handleCreateRoom, handleAddUserToRoom } from './handlers-room.js';
import { handleAddShips } from './handlers-ships.js';

export function handleMessage(ws: WebSocket, message: WSMessage) {
  const { type, data } = message;

  console.log(`Processing command: ${type}`);

  switch (type) {
    case 'reg':
      handleRegistration(ws, data);
      break;
    case 'create_room':
      handleCreateRoom(ws);
      break;
    case 'add_user_to_room':
      handleAddUserToRoom(ws, data);
      break;
    case 'add_ships':
      handleAddShips(ws, data);
      break;
    default:
      console.log(`Unknown command type: ${type}`);
  }
}

function handleRegistration(ws: WebSocket, data: string | object) {
  try {
    const regData: RegRequest = typeof data === 'string' ? JSON.parse(data) : data;
    const { name, password } = regData;

    const result = database.createOrGetPlayer(name, password);

    const response: RegResponse = {
      name: result.player.name,
      index: result.player.index,
      error: result.error,
      errorText: result.errorText,
    };

    sendToClient(ws, 'reg', response);

    console.log(`Registration result: ${result.error ? 'Failed' : 'Success'} for ${name}`);

    // If registration successful, store player info and broadcast updates
    if (!result.error) {
      wsPlayerMap.set(ws, { name: result.player.name, index: result.player.index });

      // Broadcast available rooms
      const rooms = roomManager.getAvailableRooms();
      broadcastToAll('update_room', rooms);

      // Broadcast winners table
      const winners = database.getAllWinners();
      broadcastToAll('update_winners', winners);
    }
  } catch (error) {
    console.error('Registration error:', error);
    const errorResponse: RegResponse = {
      name: '',
      index: 0,
      error: true,
      errorText: 'Invalid registration data',
    };
    sendToClient(ws, 'reg', errorResponse);
  }
}

