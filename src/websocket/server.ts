import { WebSocketServer, type WebSocket, type RawData } from 'ws';
import { type InboundMessage, type OutboundMessage, PlayerRole } from '../domain/index.js';
import {
    attachPlayer,
    createGameRoom,
    createPlayer,
    detachPlayer,
    gameHasFreeSlot,
    getGameOrFail,
    listGames,
    registerGame,
    removeGame,
} from '../domain/game.js';

type AnyMessage = InboundMessage | { type: string; payload?: unknown };
type MessageOfType<T extends InboundMessage['type']> = Extract<InboundMessage, { type: T }>;

const inboundTypes: InboundMessage['type'][] = [
    'createGame',
    'listGames',
    'joinGame',
    'leaveGame',
    'submitBoard',
    'randomBoard',
    'fire',
];

const isInboundMessage = (value: AnyMessage): value is InboundMessage =>
    inboundTypes.includes(value.type as InboundMessage['type']);

const HEARTBEAT_INTERVAL = 15_000;
const CLIENT_TIMEOUT = 45_000;

interface ClientContext {
    socket: WebSocket;
    playerId: string;
    gameId?: string;
    lastPingAt: number;
}

const clients = new Map<WebSocket, ClientContext>();

const send = (socket: WebSocket, message: OutboundMessage): void => {
    socket.send(JSON.stringify(message));
};

const parseInbound = (data: RawData): AnyMessage | null => {
    try {
        const parsed = JSON.parse(data.toString());
        if (!parsed || typeof parsed.type !== 'string') {
            throw new Error('Message lacks type');
        }
        return parsed as AnyMessage;
    } catch (error) {
        console.error('[ws] failed to parse message', error);
        return null;
    }
};

const handleCreateGame = (client: ClientContext, message: MessageOfType<'createGame'>): void => {
    if (client.gameId) {
        send(client.socket, {
            type: 'error',
            payload: { code: 'already-in-game', reason: 'Leave current game first' },
        });
        return;
    }

    const { name, nickname } = message.payload;
    const game = createGameRoom(name);
    const player = createPlayer(PlayerRole.Participant, nickname);
    client.playerId = player.id;
    client.gameId = game.id;

    attachPlayer(game, player);
    registerGame(game);

    send(client.socket, { type: 'gameCreated', payload: { gameId: game.id } });
    send(client.socket, {
        type: 'gameJoined',
        payload: { gameId: game.id, playerId: player.id },
    });
};

const handleListGames = (client: ClientContext, _message: MessageOfType<'listGames'>): void => {
    const games = listGames().map((game) => ({
        id: game.id,
        phase: game.phase,
        players: game.players.length,
    }));
    send(client.socket, { type: 'gameList', payload: { games } });
};

const handleJoinGame = (client: ClientContext, message: MessageOfType<'joinGame'>): void => {
    if (client.gameId && client.gameId !== message.payload.gameId) {
        send(client.socket, {
            type: 'error',
            payload: { code: 'already-in-game', reason: 'Leave current game first' },
        });
        return;
    }

    const game = getGameOrFail(message.payload.gameId);
    if (!gameHasFreeSlot(game)) {
        send(client.socket, {
            type: 'error',
            payload: { code: 'lobby-full', reason: 'Game lobby is full' },
        });
        return;
    }

    const player = createPlayer(PlayerRole.Participant, message.payload.nickname);
    attachPlayer(game, player);

    client.playerId = player.id;
    client.gameId = game.id;

    send(client.socket, {
        type: 'gameJoined',
        payload: { gameId: game.id, playerId: player.id },
    });
};

const handleLeaveGame = (
    client: ClientContext,
    message: MessageOfType<'leaveGame'>,
    opts: { silent?: boolean } = {}
): void => {
    if (!client.gameId) {
        if (!opts.silent) {
            send(client.socket, {
                type: 'error',
                payload: { code: 'not-in-game', reason: 'Join a game first' },
            });
        }
        return;
    }

    const game = getGameOrFail(client.gameId);
    detachPlayer(game, client.playerId);

    if (game.players.length === 0) {
        removeGame(game.id);
    }

    const payload = { gameId: game.id, playerId: client.playerId };
    if (!opts.silent) {
        send(client.socket, { type: 'gameLeft', payload });
    }

    client.gameId = undefined;
    client.playerId = '';
};

const handleNotImplemented = (client: ClientContext, type: string): void => {
    send(client.socket, {
        type: 'error',
        payload: { code: 'not-implemented', reason: `${type} pending` },
    });
};

const dispatchMessage = (client: ClientContext, message: InboundMessage): void => {
    switch (message.type) {
        case 'createGame':
            handleCreateGame(client, message);
            break;
        case 'listGames':
            handleListGames(client, message);
            break;
        case 'joinGame':
            handleJoinGame(client, message);
            break;
        case 'leaveGame':
            handleLeaveGame(client, message);
            break;
        case 'submitBoard':
        case 'randomBoard':
        case 'fire':
            handleNotImplemented(client, message.type);
            break;
    }
};

const heartbeat = (ctx: ClientContext): void => {
    ctx.lastPingAt = Date.now();
};

const setupSocket = (socket: WebSocket): ClientContext => {
    const ctx: ClientContext = {
        socket,
        playerId: '',
        lastPingAt: Date.now(),
    };
    clients.set(socket, ctx);

    socket.on('message', (data) => {
        const message = parseInbound(data);
        if (!message) {
            send(socket, {
                type: 'error',
                payload: { code: 'bad-json', reason: 'Unable to parse message' },
            });
            return;
        }
        if (!isInboundMessage(message)) {
            send(socket, {
                type: 'error',
                payload: { code: 'unknown-type', reason: `Unsupported ${message.type}` },
            });
            return;
        }
        dispatchMessage(ctx, message);
    });

    socket.on('ping', () => heartbeat(ctx));
    socket.on('pong', () => heartbeat(ctx));
    socket.on('close', () => {
        if (ctx.gameId) {
            handleLeaveGame(ctx, { type: 'leaveGame', payload: { gameId: ctx.gameId } }, { silent: true });
        }
        clients.delete(socket);
        console.log('[ws] client disconnected');
    });
    socket.on('error', (error) => {
        console.error('[ws] socket error', error);
    });

    return ctx;
};

const startHeartbeat = (): void => {
    setInterval(() => {
        const now = Date.now();
        for (const ctx of clients.values()) {
            if (now - ctx.lastPingAt > CLIENT_TIMEOUT) {
                ctx.socket.terminate();
                clients.delete(ctx.socket);
                continue;
            }
            ctx.socket.ping();
        }
    }, HEARTBEAT_INTERVAL).unref();
};

export const createWebsocketServer = (port: number): WebSocketServer => {
    const wss = new WebSocketServer({ port });

    wss.on('listening', () => {
        console.log(`[ws] listening on ${port}`);
    });

    wss.on('connection', (socket) => {
        console.log('[ws] client connected');
        setupSocket(socket);
    });

    wss.on('error', (err) => {
        console.error('[ws] server error', err);
    });

    process.once('exit', () => {
        wss.close();
    });

    startHeartbeat();

    return wss;
};
