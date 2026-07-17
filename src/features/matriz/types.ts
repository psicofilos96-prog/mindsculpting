import { z } from "zod";

// ── Grid ────────────────────────────────────────────────────────────────────

export type GridSize = 4 | 5;

export const GRID_SIZES: GridSize[] = [4, 5];

export const GRID_SIZE_LABEL: Record<GridSize, string> = {
  4: "4×4",
  5: "5×5",
};

// Row labels: A, B, C, D, E
export const ROW_LABELS = ["A", "B", "C", "D", "E", "F", "G"] as const;

// ── Difficulty ──────────────────────────────────────────────────────────────

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
};

export const DIFFICULTY_DESC: Record<Difficulty, string> = {
  easy: "Grade 4×4, 2-3 restrições. Dedução direta.",
  medium: "Grade 4×4 ou 5×5, mais restrições de ordem combinadas.",
  hard: "Grade 5×5, muitas restrições, dedução encadeada necessária.",
};

// ── Game Mode ────────────────────────────────────────────────────────────────

export type GameMode = "campaign" | "daily" | "endless" | "timed";

export const GAME_MODE_LABEL: Record<GameMode, string> = {
  campaign: "Campanha",
  daily: "Diário",
  endless: "Infinito",
  timed: "Cronometrado",
};

// ── Constraints (v1: arithmetic + order only) ───────────────────────────────

export type ConstraintType =
  | "sum" // A + B = C
  | "diff" // A - B = C
  | "prod" // A × B = C
  | "quot" // A ÷ B = C
  | "gt" // A > B
  | "lt" // A < B
  | "gte" // A >= B
  | "lte" // A <= B
  | "eq" // A = B
  | "neq" // A != B
  | "gt_const" // A > 3
  | "lt_const" // A < 5
  | "gte_const" // A >= 2
  | "lte_const" // A <= 4
  | "eq_const" // A = 3
  | "neq_const"; // A != 2

export interface Constraint {
  id: string;
  type: ConstraintType;
  /** Row indices (0-based) for variable references. For binary constraints, [rowA, rowB]. */
  rows: number[];
  /** Constant value for *_const constraints */
  constValue?: number;
  /** Human-readable label, pre-formatted */
  label: string;
}

export const ConstraintSchema = z.object({
  id: z.string(),
  type: z.enum([
    "sum", "diff", "prod", "quot",
    "gt", "lt", "gte", "lte", "eq", "neq",
    "gt_const", "lt_const", "gte_const", "lte_const", "eq_const", "neq_const",
  ]),
  rows: z.array(z.number()),
  constValue: z.number().optional(),
  label: z.string(),
});

// ── Puzzle ───────────────────────────────────────────────────────────────────

export interface Puzzle {
  id: string;
  size: GridSize;
  difficulty: Difficulty;
  /** The unique solution (flat array, row-major: solution[row * size + col]) */
  solution: number[];
  /** Constraints that uniquely determine the solution */
  constraints: Constraint[];
  /** Seed for reproducibility (daily mode) */
  seed: number;
}

export const PuzzleSchema = z.object({
  id: z.string(),
  size: z.union([z.literal(4), z.literal(5)]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  solution: z.array(z.number()),
  constraints: z.array(ConstraintSchema),
  seed: z.number(),
});

// ── Stats ────────────────────────────────────────────────────────────────────

export interface MatrizStats {
  solved: number;
  bestTimeMs: number; // 0 = none yet
  totalTimeMs: number;
  attempts: number;
  errors: number;
  hintsUsed: number;
  bestStreak: number;
  currentStreak: number;
  maxLevelCampaign: number;
}

export const DEFAULT_MATRIZ_STATS: MatrizStats = {
  solved: 0,
  bestTimeMs: 0,
  totalTimeMs: 0,
  attempts: 0,
  errors: 0,
  hintsUsed: 0,
  bestStreak: 0,
  currentStreak: 0,
  maxLevelCampaign: 0,
};

export const MatrizStatsSchema = z.object({
  solved: z.number().default(0),
  bestTimeMs: z.number().default(0),
  totalTimeMs: z.number().default(0),
  attempts: z.number().default(0),
  errors: z.number().default(0),
  hintsUsed: z.number().default(0),
  bestStreak: z.number().default(0),
  currentStreak: z.number().default(0),
  maxLevelCampaign: z.number().default(0),
});

// ── Prefs ────────────────────────────────────────────────────────────────────

export interface MatrizPrefs {
  difficulty: Difficulty;
  mode: GameMode;
  size: GridSize;
}

export const DEFAULT_MATRIZ_PREFS: MatrizPrefs = {
  difficulty: "easy",
  mode: "campaign",
  size: 4,
};

export const MatrizPrefsSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
  mode: z.enum(["campaign", "daily", "endless", "timed"]).default("campaign"),
  size: z.union([z.literal(4), z.literal(5)]).default(4),
});

// ── Hint ─────────────────────────────────────────────────────────────────────

export interface Hint {
  row: number;
  col: number;
  value: number;
  explanation: string;
}
