import { WebSocketServer, type WebSocket } from "ws";

const noop = (): void => undefined;

const logConnection = (socket: WebSocket, label: string): void => {
    const id = socket.protocol || "anonymous";
    console.log(`[ws] ${label} client=${id}`);
};

export const createWebsocketServer = (port: number): WebSocketServer => {
    const wss = new WebSocketServer({ port });

    wss.on("listening", () => {
        console.log(`[ws] listening on ${port}`);
    });

    wss.on("connection", (socket) => {
        logConnection(socket, "connected");

        socket.on("message", () => {
            // Placeholder: logic will be implemented in later commits.
        });

        socket.on("close", () => logConnection(socket, "disconnected"));
        socket.on("error", (error) => console.error(`[ws] socket error`, error));
        socket.on("unexpected-response", () =>
            logConnection(socket, "unexpected-response"),
        );
    });

    wss.on("error", (err) => {
        console.error("[ws] server error", err);
    });

    process.once("exit", () => {
        wss.close();
    });

    return wss;
};

