import { WebSocket } from 'ws';
import { database } from '../database.js';
import { sendToClient, broadcastToAll } from './server.js';
import { WSMessage, RegRequest, RegResponse } from './types.js';

export function handleMessage(ws: WebSocket, message: WSMessage) {
  const { type, data } = message;

  console.log(`Processing command: ${type}`);

  switch (type) {
    case 'reg':
      handleRegistration(ws, data);
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

    // If registration successful, broadcast winners table to all
    if (!result.error) {
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

