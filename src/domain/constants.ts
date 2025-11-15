export const BOARD_SIZE = 10;

export const BOARD_COLUMNS: readonly string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export const BOARD_ROWS: readonly string[] = Array.from({ length: BOARD_SIZE }, (_, idx) => String(idx + 1));

export const DEFAULT_FLEET_LAYOUT: Readonly<Record<number, number>> = Object.freeze({
    4: 1,
    3: 2,
    2: 3,
    1: 4,
});

export const ALLOWED_COORD_PATTERN = /^[A-J](10|[1-9])$/i;
