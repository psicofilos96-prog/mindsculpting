import type { GridSize, GameState } from "./types";
import { SHUFFLE_MOVES } from "./types";

/** Returns the solved tile array: [1,2,...,N²-1,0] */
export function solvedTiles(n: GridSize): number[] {
  const total = n * n;
  const tiles = Array.from({ length: total }, (_, i) => (i === total - 1 ? 0 : i + 1));
  return tiles;
}

/** Check if the current tiles match the solved state */
export function isSolved(tiles: number[]): boolean {
  const total = tiles.length;
  for (let i = 0; i < total - 1; i++) {
    if (tiles[i] !== i + 1) return false;
  }
  return tiles[total - 1] === 0;
}

/** Returns valid neighbor indices for the empty tile */
function neighbors(emptyIdx: number, n: number): number[] {
  const row = Math.floor(emptyIdx / n);
  const col = emptyIdx % n;
  const result: number[] = [];
  if (row > 0) result.push(emptyIdx - n); // up
  if (row < n - 1) result.push(emptyIdx + n); // down
  if (col > 0) result.push(emptyIdx - 1); // left
  if (col < n - 1) result.push(emptyIdx + 1); // right
  return result;
}

/**
 * Shuffles the puzzle by applying random valid moves from the solved state.
 * This guarantees the result is always solvable.
 */
export function shuffleTiles(n: GridSize): number[] {
  const tiles = solvedTiles(n);
  let emptyIdx = tiles.length - 1;
  let prevIdx = -1;
  const moves = SHUFFLE_MOVES[n];

  for (let i = 0; i < moves; i++) {
    const ns = neighbors(emptyIdx, n).filter((idx) => idx !== prevIdx);
    const pick = ns[Math.floor(Math.random() * ns.length)]!;
    tiles[emptyIdx] = tiles[pick]!;
    tiles[pick] = 0;
    prevIdx = emptyIdx;
    emptyIdx = pick;
  }

  // Re-shuffle if accidentally solved (extremely rare)
  if (isSolved(tiles)) return shuffleTiles(n);

  return tiles;
}

/** Create a fresh GameState */
export function createGame(gridSize: GridSize): GameState {
  const tiles = shuffleTiles(gridSize);
  return {
    gridSize,
    tiles,
    emptyIndex: tiles.indexOf(0),
    moves: 0,
    solved: false,
    startedAt: Date.now(),
    elapsed: 0,
  };
}

/**
 * Attempt to move the tile at `tileIndex` into the empty space.
 * Returns a new GameState if the move is valid, otherwise returns the same state.
 */
export function moveTile(state: GameState, tileIndex: number): GameState {
  if (state.solved) return state;
  const { emptyIndex, tiles, gridSize } = state;
  const ns = neighbors(emptyIndex, gridSize);
  if (!ns.includes(tileIndex)) return state;

  const newTiles = [...tiles];
  newTiles[emptyIndex] = newTiles[tileIndex]!;
  newTiles[tileIndex] = 0;

  const solved = isSolved(newTiles);
  return {
    ...state,
    tiles: newTiles,
    emptyIndex: tileIndex,
    moves: state.moves + 1,
    solved,
  };
}

/**
 * Returns the row/col of an index in the grid.
 */
export function indexToPos(idx: number, n: number): { row: number; col: number } {
  return { row: Math.floor(idx / n), col: idx % n };
}

/**
 * For image mode: returns the background-position CSS string
 * to show the correct fragment of the image for a given tile value.
 * tileValue is 1-based (solved position = tileValue - 1).
 */
export function tileBgPosition(
  tileValue: number,
  n: number,
  tileSize: number,
): { backgroundPosition: string; backgroundSize: string } {
  if (tileValue === 0) return { backgroundPosition: "0 0", backgroundSize: "100%" };
  const solvedIdx = tileValue - 1; // 0-based index in solved state
  const row = Math.floor(solvedIdx / n);
  const col = solvedIdx % n;
  const x = col * tileSize;
  const y = row * tileSize;
  return {
    backgroundPosition: `-${x}px -${y}px`,
    backgroundSize: `${n * tileSize}px ${n * tileSize}px`,
  };
}

/**
 * Determines if a tile at `tileIndex` can be moved (is adjacent to empty).
 */
export function canMove(state: GameState, tileIndex: number): boolean {
  if (state.solved) return false;
  return neighbors(state.emptyIndex, state.gridSize).includes(tileIndex);
}
