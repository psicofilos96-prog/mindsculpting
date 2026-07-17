// ── Categories ───────────────────────────────────────────────────────────────

export type Category = "numeric" | "letters";

export const CATEGORY_LABEL: Record<Category, string> = {
  numeric: "Numérico",
  letters: "Letras",
};

export const CATEGORY_DESC: Record<Category, string> = {
  numeric: "Dígitos 0-9",
  letters: "Letras A-F (subconjunto reduzido)",
};

export const CATEGORY_SYMBOLS: Record<Category, string[]> = {
  numeric: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  letters: ["A", "B", "C", "D", "E", "F"],
};

// ── Feedback Level ──────────────────────────────────────────────────────────

export type FeedbackLevel = "easy" | "medium" | "hard";

export const FEEDBACK_LEVEL_LABEL: Record<FeedbackLevel, string> = {
  easy: "Completo",
  medium: "Somado",
  hard: "Vago",
};

export const FEEDBACK_LEVEL_DESC: Record<FeedbackLevel, string> = {
  easy: "Mostra corretos na posição certa e corretos na posição errada separadamente.",
  medium: "Mostra apenas o total de corretos (posição certa + errada somados).",
  hard: "Mostra apenas uma pista relacional vaga (ex: 'pelo menos 1 correto').",
};

// ── Difficulty ───────────────────────────────────────────────────────────────

export type Difficulty = "I" | "II" | "III" | "mestre" | "einstein";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  I: "Nível I",
  II: "Nível II",
  III: "Nível III",
  mestre: "Mestre",
  einstein: "Einstein",
};

export const DIFFICULTY_DESC: Record<Difficulty, string> = {
  I: "3 posições, bastantes tentativas.",
  II: "4 posições (padrão clássico).",
  III: "5 posições.",
  mestre: "6-8 posições.",
  einstein: "10 posições, pouquíssimas tentativas. Desafio extremo.",
};

export interface DifficultyConfig {
  length: number;
  maxAttempts: number;
  allowRepeat: boolean;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  I: { length: 3, maxAttempts: 10, allowRepeat: false },
  II: { length: 4, maxAttempts: 10, allowRepeat: false },
  III: { length: 5, maxAttempts: 12, allowRepeat: true },
  mestre: { length: 7, maxAttempts: 12, allowRepeat: true },
  einstein: { length: 10, maxAttempts: 8, allowRepeat: true },
};

// ── Game Mode ────────────────────────────────────────────────────────────────

export type GameMode = "classic" | "timed" | "survival" | "hacker" | "bank" | "spy";

export const GAME_MODE_LABEL: Record<GameMode, string> = {
  classic: "Clássico",
  timed: "Cronometrado",
  survival: "Sobrevivência",
  hacker: "Hacker",
  bank: "Banco",
  spy: "Espião",
};

export const GAME_MODE_DESC: Record<GameMode, string> = {
  classic: "Resolver a senha, sem pressão de tempo.",
  timed: "Resolver no menor tempo possível.",
  survival: "Tentativas muito reduzidas, alta pressão.",
  hacker: "Invadir servidores — tema cyberpunk.",
  bank: "Abrir cofres — tema clássico de cofre.",
  spy: "Desarmar bombas — cronometrado com alta tensão.",
};

export const GAME_MODE_THEME: Record<GameMode, "default" | "hacker" | "bank" | "spy"> = {
  classic: "default",
  timed: "default",
  survival: "default",
  hacker: "hacker",
  bank: "bank",
  spy: "spy",
};

export type Theme = "default" | "hacker" | "bank" | "spy";

export const THEME_STYLES: Record<Theme, {
  bg: string;
  border: string;
  accent: string;
  text: string;
  header: string;
}> = {
  default: {
    bg: "bg-background",
    border: "border-border",
    accent: "text-primary",
    text: "text-foreground",
    header: "bg-background/80",
  },
  hacker: {
    bg: "bg-[#0a0e0a]",
    border: "border-emerald-500/30",
    accent: "text-emerald-400",
    text: "text-emerald-100",
    header: "bg-[#0a0e0a]/90",
  },
  bank: {
    bg: "bg-[#1a1408]",
    border: "border-amber-500/30",
    accent: "text-amber-400",
    text: "text-amber-100",
    header: "bg-[#1a1408]/90",
  },
  spy: {
    bg: "bg-[#1a0a0a]",
    border: "border-rose-500/30",
    accent: "text-rose-400",
    text: "text-rose-100",
    header: "bg-[#1a0a0a]/90",
  },
};

// ── Feedback ─────────────────────────────────────────────────────────────────

export interface Feedback {
  exact: number;
  partial: number;
  display: string;
}

// ── Attempt ──────────────────────────────────────────────────────────────────

export interface Attempt {
  guess: string[];
  feedback: Feedback;
}

// ── Hypothesis / Notes ───────────────────────────────────────────────────────

export type MarkType = "none" | "excluded" | "candidate";

export interface CellHypothesis {
  candidates: Record<number, Set<string>>;
  excluded: Set<string>;
}

// ── Puzzle / Game State ───────────────────────────────────────────────────────

export interface VaultGame {
  id: string;
  category: Category;
  difficulty: Difficulty;
  feedbackLevel: FeedbackLevel;
  gameMode: GameMode;
  secret: string[];
  maxAttempts: number;
  allowRepeat: boolean;
  attempts: Attempt[];
  hypotheses: CellHypothesis;
  solved: boolean;
  failed: boolean;
  hintsUsed: number;
  seed: number;
}

// ── Stats ────────────────────────────────────────────────────────────────────

export interface CofresStats {
  solved: number;
  failed: number;
  totalAttempts: number;
  totalGuesses: number;
  bestTimeMs: number;
  totalTimeMs: number;
  bestStreak: number;
  currentStreak: number;
  byDifficulty: Record<Difficulty, { solved: number; attempts: number }>;
}

export const DEFAULT_COFRES_STATS: CofresStats = {
  solved: 0,
  failed: 0,
  totalAttempts: 0,
  totalGuesses: 0,
  bestTimeMs: 0,
  totalTimeMs: 0,
  bestStreak: 0,
  currentStreak: 0,
  byDifficulty: {
    I: { solved: 0, attempts: 0 },
    II: { solved: 0, attempts: 0 },
    III: { solved: 0, attempts: 0 },
    mestre: { solved: 0, attempts: 0 },
    einstein: { solved: 0, attempts: 0 },
  },
};

// ── Prefs ────────────────────────────────────────────────────────────────────

export interface CofresPrefs {
  category: Category;
  difficulty: Difficulty;
  feedbackLevel: FeedbackLevel;
  gameMode: GameMode;
}

export const DEFAULT_COFRES_PREFS: CofresPrefs = {
  category: "numeric",
  difficulty: "II",
  feedbackLevel: "easy",
  gameMode: "classic",
};
