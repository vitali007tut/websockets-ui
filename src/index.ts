import { httpServer } from "./http_server/index.js";
import { HTTP_PORT, WS_PORT, describeRuntime } from "./config.js";
import { createWebsocketServer } from "./websocket/server.js";

const startServers = async (): Promise<void> => {
    console.log(`[bootstrap] starting servers ${describeRuntime()}`);

    const httpListener = httpServer.listen(HTTP_PORT, () => {
        console.log(`[http] static server listening on ${HTTP_PORT}`);
    });

    const wsServer = createWebsocketServer(WS_PORT);

    const shutdown = (signal: NodeJS.Signals) => {
        console.log(`[bootstrap] received ${signal}, shutting down`);
        wsServer.close(() => console.log("[ws] server closed"));
        httpListener.close(() => console.log("[http] server closed"));
        process.exit(0);
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
};

startServers().catch((error) => {
    console.error("[bootstrap] failed to start", error);
    process.exit(1);
});

