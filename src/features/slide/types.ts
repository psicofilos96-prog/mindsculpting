import { z } from "zod";

export type GridSize = 3 | 4 | 5 | 6;
export const GRID_SIZES: GridSize[] = [3, 4, 5, 6];

export const GRID_SIZE_LABEL: Record<GridSize, string> = {
  3: "3×3",
  4: "4×4",
  5: "5×5",
  6: "6×6",
};

export const GRID_SIZE_DIFFICULTY: Record<GridSize, string> = {
  3: "Fácil",
  4: "Médio",
  5: "Difícil",
  6: "Especialista",
};

// Shuffle moves scale with grid size to guarantee enough mixing
export const SHUFFLE_MOVES: Record<GridSize, number> = {
  3: 80,
  4: 200,
  5: 400,
  6: 600,
};

export type ContentMode = "numbers" | "image";

export interface SlidePrefs {
  gridSize: GridSize;
  contentMode: ContentMode;
  selectedImage: string; // key from PRESET_IMAGES or "custom"
  showReference: boolean;
  showNumbers: boolean; // show number overlay on image pieces
}

export const DEFAULT_SLIDE_PREFS: SlidePrefs = {
  gridSize: 4,
  contentMode: "numbers",
  selectedImage: "mountain",
  showReference: true,
  showNumbers: false,
};

export interface SlideStats {
  games: number;
  bestTimes: Partial<Record<GridSize, number>>; // seconds, lower is better
  bestMoves: Partial<Record<GridSize, number>>;
  totalMoves: number;
  totalSolved: number;
  currentStreak: number;
  bestStreak: number;
}

export const DEFAULT_SLIDE_STATS: SlideStats = {
  games: 0,
  bestTimes: {},
  bestMoves: {},
  totalMoves: 0,
  totalSolved: 0,
  currentStreak: 0,
  bestStreak: 0,
};

export const SlideStatsSchema = z.object({
  games: z.number().default(0),
  bestTimes: z.record(z.string(), z.number()).default({}),
  bestMoves: z.record(z.string(), z.number()).default({}),
  totalMoves: z.number().default(0),
  totalSolved: z.number().default(0),
  currentStreak: z.number().default(0),
  bestStreak: z.number().default(0),
});

export const SlidePrefsSchema = z.object({
  gridSize: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).default(4),
  contentMode: z.enum(["numbers", "image"]).default("numbers"),
  selectedImage: z.string().default("mountain"),
  showReference: z.boolean().default(true),
  showNumbers: z.boolean().default(false),
});

/** Represents one tile. value=0 means the empty/blank tile. */
export interface Tile {
  value: number; // 1…N²-1 for pieces, 0 for empty
  correctPos: number; // the index this tile belongs to in solved state
}

export interface GameState {
  gridSize: GridSize;
  tiles: number[]; // flat array, index = position, value = tile number (0=empty)
  emptyIndex: number;
  moves: number;
  solved: boolean;
  startedAt: number; // Date.now()
  elapsed: number; // seconds (updated by timer)
}

// Preset images with Pexels URLs
export interface PresetImage {
  key: string;
  label: string;
  url: string;
}

export const PRESET_IMAGES: PresetImage[] = [
  {
    key: "mountain",
    label: "Montanha",
    url: "https://images.pexels.com/photos/618833/pexels-photo-618833.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    key: "forest",
    label: "Floresta",
    url: "https://images.pexels.com/photos/167698/pexels-photo-167698.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    key: "ocean",
    label: "Oceano",
    url: "https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    key: "fox",
    label: "Raposa",
    url: "https://images.pexels.com/photos/247502/pexels-photo-247502.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    key: "abstract",
    label: "Abstrato",
    url: "https://images.pexels.com/photos/1212693/pexels-photo-1212693.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    key: "city",
    label: "Cidade",
    url: "https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
];

export function scoreGame(moves: number, elapsedSec: number, gridSize: GridSize): number {
  const base = gridSize * gridSize * 1000;
  const movePenalty = moves * 10;
  const timePenalty = elapsedSec * 5;
  return Math.max(0, base - movePenalty - timePenalty);
}
