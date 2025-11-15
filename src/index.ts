import { httpServer } from './http_server/index.js';
import { createWebSocketServer } from './websocket/server.js';

const HTTP_PORT = 8181;
const WS_PORT = 3000;

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);

createWebSocketServer(WS_PORT);

