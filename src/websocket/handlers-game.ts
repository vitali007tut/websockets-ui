import { WebSocket } from 'ws';
import { gameManager } from '../game.js';
import { database } from '../database.js';
import { sendToClient, broadcastToAll } from './server.js';
import { AttackRequest, RandomAttackRequest, AttackResponse, TurnResponse, FinishResponse } from './types.js';

export function handleAttack(ws: WebSocket, data: string | object) {
  try {
    const requestData: AttackRequest = typeof data === 'string' ? JSON.parse(data) : data;
    const { gameId, x, y, indexPlayer } = requestData;

    console.log(`\n>>> ATTACK CLICK: x=${x}, y=${y}, indexPlayer=${indexPlayer}`);
    console.log(`    Will check board[${y}][${x}]`);

    const gameIdNum = typeof gameId === 'string' ? parseInt(gameId, 10) : gameId;
    const playerIdNum = typeof indexPlayer === 'string' ? parseInt(indexPlayer, 10) : indexPlayer;

    processAttack(gameIdNum, playerIdNum, x, y);
  } catch (error) {
    console.error('Error handling attack:', error);
  }
}

export function handleRandomAttack(ws: WebSocket, data: string | object) {
  try {
    const requestData: RandomAttackRequest = typeof data === 'string' ? JSON.parse(data) : data;
    const { gameId, indexPlayer } = requestData;

    const gameIdNum = typeof gameId === 'string' ? parseInt(gameId, 10) : gameId;
    const playerIdNum = typeof indexPlayer === 'string' ? parseInt(indexPlayer, 10) : indexPlayer;

    // Get random coordinates
    const coords = gameManager.getRandomAttackCoordinates(gameIdNum, playerIdNum);
    if (!coords) {
      console.log('No available cells for random attack');
      return;
    }

    console.log(`Random attack at ${coords.x},${coords.y}`);
    processAttack(gameIdNum, playerIdNum, coords.x, coords.y);
  } catch (error) {
    console.error('Error handling random attack:', error);
  }
}

function processAttack(gameId: number, attackingPlayerId: number, x: number, y: number) {
  const game = gameManager.getGame(gameId);
  if (!game) {
    console.log(`Game ${gameId} not found`);
    return;
  }

  // Check if it's this player's turn
  if (game.currentTurn !== attackingPlayerId) {
    console.log(`Not player ${attackingPlayerId}'s turn`);
    return;
  }

  const result = gameManager.processAttack(gameId, attackingPlayerId, x, y);
  if (!result) {
    console.log('Attack processing failed');
    return;
  }

  const defendingPlayer = game.players.find((p) => p.playerId !== attackingPlayerId);
  if (!defendingPlayer) return;

  // Send attack response to both players
  const attackResponse: AttackResponse = {
    position: { x, y },
    currentPlayer: attackingPlayerId,
    status: result.status,
  };

  for (const player of game.players) {
    sendToClient(player.ws, 'attack', attackResponse);
  }

  console.log(`Attack at ${x},${y}: ${result.status}`);

  // If ship was killed, send miss for surrounding cells
  if (result.status === 'killed' && result.cellsToMark) {
    for (const cell of result.cellsToMark) {
      const missResponse: AttackResponse = {
        position: { x: cell.x, y: cell.y },
        currentPlayer: attackingPlayerId,
        status: 'miss',
      };

      for (const player of game.players) {
        sendToClient(player.ws, 'attack', missResponse);
      }
    }
  }

  // Check for win
  const hasWon = gameManager.checkWin(gameId, defendingPlayer.playerId);
  if (hasWon) {
    console.log(`Player ${attackingPlayerId} wins!`);

    // Send finish message
    const finishResponse: FinishResponse = {
      winPlayer: attackingPlayerId,
    };

    for (const player of game.players) {
      sendToClient(player.ws, 'finish', finishResponse);
    }

    // Update winner stats (use playerIndex, not game playerId)
    const winningPlayer = game.players.find((p) => p.playerId === attackingPlayerId);
    if (winningPlayer) {
      database.incrementWins(winningPlayer.playerIndex);
    }

    // Broadcast updated winners table
    const winners = database.getAllWinners();
    broadcastToAll('update_winners', winners);

    return;
  }

  // Switch turn if miss, otherwise same player goes again
  if (result.status === 'miss') {
    gameManager.switchTurn(gameId);
  }

  // Send turn update
  const currentTurn = gameManager.getCurrentTurn(gameId);
  if (currentTurn !== null) {
    const turnResponse: TurnResponse = {
      currentPlayer: currentTurn,
    };

    for (const player of game.players) {
      sendToClient(player.ws, 'turn', turnResponse);
    }
  }
}

