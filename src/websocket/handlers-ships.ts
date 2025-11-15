import { WebSocket } from 'ws';
import { gameManager } from '../game.js';
import { sendToClient } from './server.js';
import { AddShipsRequest, StartGameResponse, TurnResponse } from './types.js';

export function handleAddShips(ws: WebSocket, data: string | object) {
  try {
    const requestData: AddShipsRequest = typeof data === 'string' ? JSON.parse(data) : data;
    const { gameId, ships, indexPlayer } = requestData;

    const gameIdNum = typeof gameId === 'string' ? parseInt(gameId, 10) : gameId;
    const playerIdNum = typeof indexPlayer === 'string' ? parseInt(indexPlayer, 10) : indexPlayer;

    // Get player index from the request (this should be their global player index from registration)
    // For now, we'll use indexPlayer directly as it's sent from the client

    const success = gameManager.addPlayerShips(gameIdNum, playerIdNum, playerIdNum, ws, ships);

    if (!success) {
      console.log(`Failed to add ships for player ${playerIdNum} in game ${gameIdNum}`);
      return;
    }

    console.log(`Ships added for player ${playerIdNum} in game ${gameIdNum}`);

    // Check if both players have submitted their ships
    if (gameManager.isGameReady(gameIdNum)) {
      console.log(`Both players ready, starting game ${gameIdNum}`);

      // Start the game and determine first turn
      gameManager.startGame(gameIdNum);

      const game = gameManager.getGame(gameIdNum);
      if (game && game.players.length === 2) {
        // Send start_game to both players with their own ships
        for (const player of game.players) {
          const response: StartGameResponse = {
            ships: player.ships,
            currentPlayerIndex: player.playerId,
          };
          sendToClient(player.ws, 'start_game', response);
          console.log(`Sent start_game to player ${player.playerId}`);
        }

        // Send turn information to both players
        const currentTurn = game.currentTurn;
        for (const player of game.players) {
          const turnResponse: TurnResponse = {
            currentPlayer: currentTurn,
          };
          sendToClient(player.ws, 'turn', turnResponse);
          console.log(`Sent turn info to player ${player.playerId}, current turn: ${currentTurn}`);
        }
      }
    }
  } catch (error) {
    console.error('Error adding ships:', error);
  }
}

