import { WebSocketServer, WebSocket } from 'ws';
import { handleMessage } from './handlers.js';

export const clients = new Set<WebSocket>();

export const wsPlayerMap = new Map<WebSocket, { name: string; index: number }>();

export function createWebSocketServer(port: number) {
  const wss = new WebSocketServer({ port });

  console.log(`WebSocket server started on port ${port}`);

  wss.on('connection', (ws: WebSocket) => {
    console.log('New client connected');
    clients.add(ws);

    ws.on('message', (message: Buffer) => {
      const messageStr = message.toString();
      console.log('Received:', messageStr);

      try {
        const data = JSON.parse(messageStr);
        handleMessage(ws, data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      clients.delete(ws);
      wsPlayerMap.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return wss;
}

export function sendToClient(ws: WebSocket, type: string, data: unknown) {
  const message = {
    type,
    data: typeof data === 'string' ? data : JSON.stringify(data),
    id: 0,
  };
  const messageStr = JSON.stringify(message);
  console.log('Sending to client:', messageStr);
  ws.send(messageStr);
}

export function broadcastToAll(type: string, data: unknown) {
  const message = {
    type,
    data: typeof data === 'string' ? data : JSON.stringify(data),
    id: 0,
  };
  const messageStr = JSON.stringify(message);
  console.log('Broadcasting to all:', messageStr);

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

