export type GridSize = 4 | 5;
export type GridMode = "sequential" | "recognition";

export interface GridConfig {
  size: GridSize;
  points: number;
  mode: GridMode;
  exposureMs: number;
}

export interface GridStats {
  sessions: number;
  totalRounds: number;
  totalPerfect: number;
  bestStreak: number;
}

export const SIZE_OPTIONS: GridSize[] = [4, 5];
export const POINTS_OPTIONS = [4, 5, 6, 7, 8] as const;
export const EXPOSURE_OPTIONS = [1500, 2000, 3000] as const;

export const DEFAULT_CONFIG: GridConfig = {
  size: 4,
  points: 5,
  mode: "sequential",
  exposureMs: 2000,
};

export function pickCells(size: number, count: number): number[] {
  const total = size * size;
  const n = Math.min(count, total);
  const pool = Array.from({ length: total }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, n);
}
