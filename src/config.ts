import "dotenv/config";

const DEFAULT_HTTP_PORT = 8181;
const DEFAULT_WS_PORT = 3333;

const normalizePort = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
};

export const HTTP_PORT = normalizePort(process.env.HTTP_PORT, DEFAULT_HTTP_PORT);
export const WS_PORT = normalizePort(process.env.WS_PORT, DEFAULT_WS_PORT);
export const NODE_ENV = process.env.NODE_ENV?.trim() || "development";

export const describeRuntime = (): string =>
    `[env=${NODE_ENV}] http=${HTTP_PORT} ws=${WS_PORT}`;

