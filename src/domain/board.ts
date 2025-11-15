import { BOARD_SIZE, DEFAULT_FLEET_LAYOUT, BOARD_COLUMNS, BOARD_ROWS } from './constants.js';
import { coordinateFromIndices, parseCoordinate } from './coordinates.js';
import type { CoordinateLabel, CoordinatePoint, ShipPlacement, FleetState } from './types.js';

type MatrixCell = 0 | number; // 0 = empty, >0 = ship id

interface ValidationContext {
    matrix: MatrixCell[][];
    visited: boolean[][];
    errors: string[];
    ships: ShipPlacement[];
}

const totalFleetCells = Object.entries(DEFAULT_FLEET_LAYOUT).reduce(
    (acc, [len, amount]) => acc + Number(len) * amount,
    0
);

const createMatrix = (): MatrixCell[][] =>
    Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => 0 as MatrixCell));

const createVisited = (): boolean[][] =>
    Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => false));

const isInBounds = (row: number, col: number): boolean =>
    row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

const orthogonalNeighbors = (row: number, col: number): Array<[number, number]> => [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
];

const diagonalNeighbors = (row: number, col: number): Array<[number, number]> => [
    [row - 1, col - 1],
    [row - 1, col + 1],
    [row + 1, col - 1],
    [row + 1, col + 1],
];

const floodShip = (
    ctx: ValidationContext,
    startRow: number,
    startCol: number,
    shipId: number
): ShipPlacement => {
    const queue: Array<[number, number]> = [[startRow, startCol]];
    const shipCells: CoordinatePoint[] = [];
    ctx.visited[startRow][startCol] = true;
    ctx.matrix[startRow][startCol] = shipId;

    while (queue.length) {
        const [row, col] = queue.shift()!;
        shipCells.push(coordinateFromIndices(row, col));

        for (const [nr, nc] of orthogonalNeighbors(row, col)) {
            if (!isInBounds(nr, nc) || ctx.visited[nr][nc]) continue;
            if (ctx.matrix[nr][nc] !== 1) continue;
            ctx.visited[nr][nc] = true;
            ctx.matrix[nr][nc] = shipId;
            queue.push([nr, nc]);
        }
    }

    const length = shipCells.length;
    const sameRow = shipCells.every((cell) => cell.row === shipCells[0].row);
    const sameCol = shipCells.every((cell) => cell.col === shipCells[0].col);

    if (!(sameRow || sameCol)) {
        ctx.errors.push(`Ship ${shipId} must be straight line`);
    }

    const sorted = [...shipCells].sort((a, b) => (sameRow ? a.col - b.col : a.row - b.row));
    for (let i = 1; i < sorted.length; i += 1) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const diff = sameRow ? curr.col - prev.col : curr.row - prev.row;
        if (diff !== 1) {
            ctx.errors.push(`Ship ${shipId} has gaps`);
            break;
        }
    }

    return {
        id: `ship-${shipId}`,
        length,
        cells: shipCells,
        destroyed: false,
    };
};

const ensureLayoutMatches = (ships: ShipPlacement[], errors: string[]): void => {
    const layout = new Map<number, number>();
    for (const ship of ships) {
        layout.set(ship.length, (layout.get(ship.length) ?? 0) + 1);
    }

    for (const [lengthStr, expectedAmount] of Object.entries(DEFAULT_FLEET_LAYOUT)) {
        const length = Number(lengthStr);
        const actual = layout.get(length) ?? 0;
        if (actual !== expectedAmount) {
            errors.push(`Fleet mismatch for length ${length}: expected ${expectedAmount}, got ${actual}`);
        }
    }
};

const ensureNoTouching = (matrix: MatrixCell[][], errors: string[]): void => {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            const id = matrix[row][col];
            if (id === 0) continue;

            for (const [nr, nc] of [...orthogonalNeighbors(row, col), ...diagonalNeighbors(row, col)]) {
                if (!isInBounds(nr, nc)) continue;
                const neighborId = matrix[nr][nc];
                if (neighborId !== 0 && neighborId !== id) {
                    errors.push(
                        `Ships ${id} and ${neighborId} are touching at ${BOARD_COLUMNS[col]}${BOARD_ROWS[row]}`
                    );
                    return;
                }
            }
        }
    }
};

export interface BoardValidationResult {
    valid: boolean;
    ships: ShipPlacement[];
    fleet: FleetState | null;
    errors: string[];
}

export const validateBoardLayout = (cells: CoordinateLabel[]): BoardValidationResult => {
    const ctx: ValidationContext = {
        matrix: createMatrix(),
        visited: createVisited(),
        errors: [],
        ships: [],
    };

    if (cells.length !== totalFleetCells) {
        ctx.errors.push(`Expected ${totalFleetCells} occupied cells, got ${cells.length}`);
    }

    for (const raw of cells) {
        const { row, col } = parseCoordinate(raw);
        if (ctx.matrix[row][col] !== 0) {
            ctx.errors.push(`Duplicate coordinate ${raw}`);
            continue;
        }
        ctx.matrix[row][col] = 1;
    }

    let shipCounter = 1;
    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            if (ctx.matrix[row][col] !== 1 || ctx.visited[row][col]) continue;
            ctx.ships.push(floodShip(ctx, row, col, shipCounter));
            shipCounter += 1;
        }
    }

    ensureLayoutMatches(ctx.ships, ctx.errors);
    ensureNoTouching(ctx.matrix, ctx.errors);

    const valid = ctx.errors.length === 0;
    const fleet: FleetState | null = valid
        ? {
              ships: ctx.ships.map((ship) => ({ ...ship })),
              aliveCells: totalFleetCells,
          }
        : null;

    return {
        valid,
        ships: ctx.ships,
        fleet,
        errors: ctx.errors,
    };
};

type Orientation = 'horizontal' | 'vertical';

const randomInt = (maxExclusive: number): number => Math.floor(Math.random() * maxExclusive);

const canPlaceShip = (
    matrix: MatrixCell[][],
    row: number,
    col: number,
    length: number,
    orientation: Orientation
): boolean => {
    for (let offset = 0; offset < length; offset += 1) {
        const r = orientation === 'horizontal' ? row : row + offset;
        const c = orientation === 'horizontal' ? col + offset : col;

        if (!isInBounds(r, c)) return false;
        if (matrix[r][c] !== 0) return false;

        for (const [nr, nc] of [
            ...orthogonalNeighbors(r, c),
            ...diagonalNeighbors(r, c),
            [r, c] as [number, number],
        ]) {
            if (!isInBounds(nr, nc)) continue;
            if (matrix[nr][nc] !== 0) return false;
        }
    }
    return true;
};

const placeShip = (
    matrix: MatrixCell[][],
    row: number,
    col: number,
    length: number,
    orientation: Orientation,
    shipId: number
): ShipPlacement => {
    const cells: CoordinatePoint[] = [];
    for (let offset = 0; offset < length; offset += 1) {
        const r = orientation === 'horizontal' ? row : row + offset;
        const c = orientation === 'horizontal' ? col + offset : col;
        matrix[r][c] = shipId;
        cells.push(coordinateFromIndices(r, c));
    }
    return {
        id: `ship-${shipId}`,
        length,
        cells,
        destroyed: false,
    };
};

export const generateRandomBoard = (): FleetState => {
    const matrix = createMatrix();
    const ships: ShipPlacement[] = [];
    let shipId = 1;

    const lengths = Object.entries(DEFAULT_FLEET_LAYOUT)
        .flatMap(([length, count]) => Array.from({ length: count }, () => Number(length)))
        .sort((a, b) => b - a); // place bigger ships first

    for (const length of lengths) {
        let placed = false;
        let attempts = 0;
        while (!placed) {
            attempts += 1;
            if (attempts > 1000) {
                throw new Error('Failed to place ship after 1000 attempts');
            }

            const orientation: Orientation = Math.random() > 0.5 ? 'horizontal' : 'vertical';
            const maxRow = orientation === 'horizontal' ? BOARD_SIZE : BOARD_SIZE - length + 1;
            const maxCol = orientation === 'horizontal' ? BOARD_SIZE - length + 1 : BOARD_SIZE;
            const row = randomInt(maxRow);
            const col = randomInt(maxCol);

            if (!canPlaceShip(matrix, row, col, length, orientation)) continue;

            ships.push(placeShip(matrix, row, col, length, orientation, shipId));
            shipId += 1;
            placed = true;
        }
    }

    return {
        ships,
        aliveCells: totalFleetCells,
    };
};
