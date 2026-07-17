// ── Einstein Logic Module — Types ────────────────────────────────────────────

// ── Categories ───────────────────────────────────────────────────────────────

export interface Category {
  name: string;
  values: string[];
  /** ordinal: true enables superlative clues (max/min) for this category */
  ordinal: boolean;
  /** For ordinal categories: the numeric value of each entry (for comparison) */
  ordValues?: number[];
}

// ── Entity References ────────────────────────────────────────────────────────

/** A reference to a value within a category. For superlatives, value is "max"/"min". */
export interface EntityRef {
  category: string;
  value: string;
}

// ── Clue Types (8 types) ──────────────────────────────────────────────────────

export type ClueType =
  | "equality" // same entity has both values
  | "neighbor" // adjacent, any direction
  | "left_of" // immediately left
  | "right_of" // immediately right
  | "end" // at one of the ends
  | "exclusion" // value does NOT belong to entity
  | "order" // somewhere left/right, not necessarily adjacent
  | "between" // between A and B in order
  | "superlative"; // max/min of ordinal category

export interface Clue {
  id: string;
  type: ClueType;
  /** Human-readable text shown to the player */
  text: string;
  /** Subject entity (the "who" of the clue) */
  subject: EntityRef;
  /** Object entity (the "what" of the clue) — for binary clues */
  object?: EntityRef;
  /** For between: the two bounding entities [left, right] */
  bounds?: [EntityRef, EntityRef];
  /** For end: "first" or "last" */
  endPosition?: "first" | "last";
  /** For order: direction */
  direction?: "left" | "right";
  /** For superlative: "max" or "min" */
  superlative?: "max" | "min";
  /** For exclusion: the value that does NOT belong */
  excludedValue?: string;
  /** For position-direct clues (e.g., "Na terceira posição está X") */
  position?: number;
}

// ── Theme ────────────────────────────────────────────────────────────────────

export interface Theme {
  id: string;
  name: string;
  description: string;
  numHouses: number;
  categories: Category[];
  /** Pre-built clues (for hand-crafted puzzles like Einstein's original) */
  clues: Clue[];
  /** The solution: array of houses, each with {category: value} */
  solution: Record<string, string>[];
  /** Optional: the final question */
  question?: string;
  /** Optional: the answer to the final question */
  answer?: string;
}

// ── Difficulty ───────────────────────────────────────────────────────────────

export type Difficulty = "easy" | "medium" | "hard" | "expert";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
  expert: "Especialista",
};

export const DIFFICULTY_DESC: Record<Difficulty, string> = {
  easy: "3-4 casas, pistas diretas, poucas categorias.",
  medium: "4-5 casas, pistas variadas.",
  hard: "5 casas, pistas encadeadas, mais categorias.",
  expert: "5-7 casas, pistas mínimas, dedução profunda.",
};

// ── Game Mode ────────────────────────────────────────────────────────────────

export type GameMode = "campaign" | "daily" | "endless" | "timed";

export const GAME_MODE_LABEL: Record<GameMode, string> = {
  campaign: "Campanha",
  daily: "Diário",
  endless: "Infinito",
  timed: "Cronometrado",
};

export const GAME_MODE_DESC: Record<GameMode, string> = {
  campaign: "Sequência de puzzles por dificuldade crescente.",
  daily: "Mesmo puzzle para todos no dia.",
  endless: "Puzzles gerados continuamente.",
  timed: "Resolva o máximo possível no tempo limite.",
};

// ── Puzzle ───────────────────────────────────────────────────────────────────

export interface Puzzle {
  id: string;
  themeId: string;
  themeName: string;
  difficulty: Difficulty;
  numHouses: number;
  categories: Category[];
  clues: Clue[];
  solution: Record<string, string>[];
  question?: string;
  answer?: string;
  seed: number;
  isProcedural: boolean;
}

// ── Stats ────────────────────────────────────────────────────────────────────

export interface EinsteinStats {
  solved: number;
  failed: number;
  totalAttempts: number;
  bestTimeMs: number;
  totalTimeMs: number;
  bestStreak: number;
  currentStreak: number;
  hintsUsed: number;
  campaignLevel: number;
}

export const DEFAULT_EINSTEIN_STATS: EinsteinStats = {
  solved: 0,
  failed: 0,
  totalAttempts: 0,
  bestTimeMs: 0,
  totalTimeMs:0,
  bestStreak: 0,
  currentStreak: 0,
  hintsUsed: 0,
  campaignLevel: 0,
};

// ── Prefs ────────────────────────────────────────────────────────────────────

export interface EinsteinPrefs {
  themeId: string;
  difficulty: Difficulty;
  gameMode: GameMode;
}

export const DEFAULT_EINSTEIN_PREFS: EinsteinPrefs = {
  themeId: "einstein_original",
  difficulty: "easy",
  gameMode: "campaign",
};

// ── Hint ──────────────────────────────────────────────────────────────────────

export interface Hint {
  category: string;
  position: number;
  value: string;
  explanation: string;
}
