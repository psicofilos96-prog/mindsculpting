// ── Cipher modes ─────────────────────────────────────────────────────────────

export type CipherMode = "substitution" | "symbol" | "caesar" | "numeric";

export const CIPHER_MODE_LABEL: Record<CipherMode, string> = {
  substitution: "Substituição Simples",
  symbol: "Substituição por Símbolos",
  caesar: "Cifra de César",
  numeric: "Código Numérico",
};

export const CIPHER_MODE_DESC: Record<CipherMode, string> = {
  substitution: "Cada letra é mapeada para outra letra. Deduza a tabela de correspondência.",
  symbol: "Cada letra é representada por um símbolo. Associe símbolo à letra correta.",
  caesar: "Deslocamento fixo no alfabeto. Descubra o valor do deslocamento.",
  numeric: "Cada letra é sua posição no alfabeto (A=1, B=2...). Decodifique rápido.",
};

export const CIPHER_MODE_ICON: Record<CipherMode, string> = {
  substitution: "ABC",
  symbol: "◆",
  caesar: "⟳",
  numeric: "123",
};

// ── Difficulty ──────────────────────────────────────────────────────────────

export type Difficulty = "easy" | "medium" | "hard" | "expert";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
  expert: "Especialista",
};

export const DIFFICULTY_DESC: Record<Difficulty, string> = {
  easy: "Palavra curta, 3-4 correspondências reveladas.",
  medium: "Palavra média ou frase de 2 palavras, 1-2 dicas.",
  hard: "Frase de 2-3 palavras, sem dicas iniciais.",
  expert: "Frase de 3-4 palavras, sem dicas, tempo limitado.",
};

// ── Game Mode ────────────────────────────────────────────────────────────────

export type GameMode = "training" | "classic" | "timed" | "daily";

export const GAME_MODE_LABEL: Record<GameMode, string> = {
  training: "Treino",
  classic: "Clássico",
  timed: "Cronometrado",
  daily: "Desafio Diário",
};

export const GAME_MODE_DESC: Record<GameMode, string> = {
  training: "Sem pressão de tempo. Foco em aprender a mecânica.",
  classic: "Pontuação e progressão por dificuldade.",
  timed: "Decodifique o máximo possível no tempo limite.",
  daily: "Mesmo desafio para todos os jogadores no dia.",
};

// ── Puzzle ───────────────────────────────────────────────────────────────────

export interface Puzzle {
  id: string;
  mode: CipherMode;
  difficulty: Difficulty;
  plaintext: string;
  ciphertext: string;
  mapping: Record<string, string>;
  shift?: number;
  revealedHints: number[];
  seed: number;
}

// ── Stats ────────────────────────────────────────────────────────────────────

export interface CriptoStats {
  solved: number;
  totalAttempts: number;
  totalErrors: number;
  hintsUsed: number;
  bestTimeMs: number;
  totalTimeMs: number;
  bestStreak: number;
  currentStreak: number;
  byMode: Record<CipherMode, { solved: number; attempts: number; bestTimeMs: number }>;
}

export const DEFAULT_CRIPTO_STATS: CriptoStats = {
  solved: 0, totalAttempts: 0, totalErrors: 0, hintsUsed: 0,
  bestTimeMs: 0, totalTimeMs: 0, bestStreak: 0, currentStreak: 0,
  byMode: {
    substitution: { solved: 0, attempts: 0, bestTimeMs: 0 },
    symbol: { solved: 0, attempts: 0, bestTimeMs: 0 },
    caesar: { solved: 0, attempts: 0, bestTimeMs: 0 },
    numeric: { solved: 0, attempts: 0, bestTimeMs: 0 },
  },
};

// ── Prefs ────────────────────────────────────────────────────────────────────

export interface CriptoPrefs {
  mode: CipherMode;
  difficulty: Difficulty;
  gameMode: GameMode;
}

export const DEFAULT_CRIPTO_PREFS: CriptoPrefs = {
  mode: "substitution",
  difficulty: "easy",
  gameMode: "training",
};

// ── Symbols ──────────────────────────────────────────────────────────────────

export const SYMBOLS = [
  "▲", "●", "■", "★", "◆", "♦", "♠", "♣", "♥", "▼",
  "◄", "►", "◙", "◘", "○", "□", "△", "▽", "◁", "▷",
  "⬟", "⬡", "⬢", "⬣", "⬤", "⬥",
] as const;
