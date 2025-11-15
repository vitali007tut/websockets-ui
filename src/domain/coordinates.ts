import { ALLOWED_COORD_PATTERN, BOARD_COLUMNS, BOARD_ROWS, BOARD_SIZE } from './constants.js';
import type { CoordinateLabel, CoordinatePoint } from './types.js';

const COLUMN_INDEX: Readonly<Record<string, number>> = BOARD_COLUMNS.reduce((acc, col, idx) => {
    acc[col] = idx;
    return acc;
}, {} as Record<string, number>);

export const normalizeCoordinateLabel = (label: string): CoordinateLabel => {
    const upper = label.trim().toUpperCase();

    if (!ALLOWED_COORD_PATTERN.test(upper)) {
        throw new Error(`Invalid coordinate label: ${label}`);
    }

    return upper as CoordinateLabel;
};

export const parseCoordinate = (label: string): CoordinatePoint => {
    const normalized = normalizeCoordinateLabel(label);
    const columnChar = normalized.slice(0, 1);
    const rowPart = normalized.slice(1);

    const col = COLUMN_INDEX[columnChar];
    const row = Number(rowPart) - 1;

    return {
        row,
        col,
        label: normalized,
    };
};

export const isWithinBounds = (row: number, col: number): boolean =>
    row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

export const coordinateFromIndices = (row: number, col: number): CoordinatePoint => {
    if (!isWithinBounds(row, col)) {
        throw new Error(`Out-of-bounds indices row=${row}, col=${col}`);
    }

    const label = `${BOARD_COLUMNS[col]}${BOARD_ROWS[row]}` as CoordinateLabel;

    return { row, col, label };
};

export const iterateBoard = (handler: (coord: CoordinatePoint, idx: number) => void): void => {
    let idx = 0;
    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            handler(coordinateFromIndices(row, col), idx);
            idx += 1;
        }
    }
};
