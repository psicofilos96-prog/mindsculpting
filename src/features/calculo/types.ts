import { z } from "zod";

// ---------- Levels (9 levels) ----------

export const LEVELS = [
  "iniciante",
  "intermediario",
  "mult-basica",
  "mult-avancada",
  "div-basica",
  "div-avancada",
  "misto-basico",
  "misto-avancado",
  "einstein",
] as const;
export type Level = (typeof LEVELS)[number];

export const LevelSchema = z.enum(LEVELS);

export type Operator = "+" | "-" | "×" | "÷";

export interface Problem {
  /** Full expression string shown to the user, e.g. "345 + 678" or "(85 × 24) + 318 - 129" */
  display: string;
  answer: number;
  /** 5 multiple-choice options (shuffled) — only for choices mode */
  choices: number[];
}

// ---------- Level config ----------

export interface LevelConfig {
  label: string;
  desc: string;
  ops: Operator[];
  /** [minDigits, maxDigits] for operand generation */
  digits: [number, number];
  /** For Einstein: multi-operation expressions */
  multiOp?: boolean;
  /** Allow parentheses in Einstein expressions */
  parentheses?: boolean;
  /** Allow negative numbers (Einstein) */
  allowNegative?: boolean;
}

export const LEVEL_CONFIG: Record<Level, LevelConfig> = {
  iniciante: {
    label: "Nível I — Iniciante",
    desc: "Somas e subtrações, 1–2 algarismos",
    ops: ["+", "-"],
    digits: [1, 2],
  },
  intermediario: {
    label: "Nível II — Intermediário",
    desc: "Somas e subtrações, 3–5 algarismos",
    ops: ["+", "-"],
    digits: [3, 5],
  },
  "mult-basica": {
    label: "Nível III — Multiplicação Básica",
    desc: "Multiplicação, 1–2 algarismos",
    ops: ["×"],
    digits: [1, 2],
  },
  "mult-avancada": {
    label: "Nível IV — Multiplicação Avançada",
    desc: "Multiplicação, 3–5 algarismos",
    ops: ["×"],
    digits: [3, 5],
  },
  "div-basica": {
    label: "Nível V — Divisão Básica",
    desc: "Divisões exatas, 1–2 algarismos",
    ops: ["÷"],
    digits: [1, 2],
  },
  "div-avancada": {
    label: "Nível VI — Divisão Avançada",
    desc: "Divisões exatas, 3–5 algarismos",
    ops: ["÷"],
    digits: [3, 5],
  },
  "misto-basico": {
    label: "Nível VII — Operações Mistas (Básico)",
    desc: "Soma, subtração, multiplicação e divisão, 1–2 algarismos",
    ops: ["+", "-", "×", "÷"],
    digits: [1, 2],
  },
  "misto-avancado": {
    label: "Nível VIII — Operações Mistas (Avançado)",
    desc: "As 4 operações, 2–5 algarismos",
    ops: ["+", "-", "×", "÷"],
    digits: [2, 5],
  },
  einstein: {
    label: "Nível Einstein",
    desc: "Modo extremo: múltiplas operações, parênteses, prioridade matemática",
    ops: ["+", "-", "×", "÷"],
    digits: [1, 5],
    multiOp: true,
    parentheses: true,
    allowNegative: true,
  },
};

// ---------- Game modes ----------

export const GAME_MODES = ["practice", "timed", "survival", "precision", "daily"] as const;
export type GameMode = (typeof GAME_MODES)[number];

export const GAME_MODE_LABEL: Record<GameMode, { label: string; desc: string }> = {
  practice: { label: "Prática", desc: "Questões ilimitadas, sem pressão." },
  timed: { label: "Contra o Tempo", desc: "Máximo de acertos em um tempo limite." },
  survival: { label: "Sobrevivência", desc: "Termina no primeiro erro. Maior sequência." },
  precision: { label: "Precisão", desc: "Número fixo de questões (20, 50 ou 100)." },
  daily: { label: "Desafio Diário", desc: "Mesmas questões para todos no dia." },
};

// ---------- Time per question ----------

export const TIME_OPTIONS = [3, 5, 7, 10, 15, 20, 0] as const; // 0 = no limit
export type TimeOption = (typeof TIME_OPTIONS)[number];

export const TIME_LABELS: Record<number, string> = {
  3: "3 segundos",
  5: "5 segundos",
  7: "7 segundos",
  10: "10 segundos",
  15: "15 segundos",
  20: "20 segundos",
  0: "Sem limite",
};

// ---------- Flash mode ----------

export const FLASH_OPTIONS = [0.5, 1, 2, 3, 5, 0] as const; // 0 = always visible
export type FlashOption = (typeof FLASH_OPTIONS)[number];

export const FLASH_LABELS: Record<number, string> = {
  0.5: "0,5 segundo",
  1: "1 segundo",
  2: "2 segundos",
  3: "3 segundos",
  5: "5 segundos",
  0: "Sempre visível",
};

// ---------- Timed mode durations ----------

export const TIMED_DURATIONS = [30, 60, 90, 120, 300] as const;
export const TIMED_DURATION_LABELS: Record<number, string> = {
  30: "30 segundos",
  60: "1 minuto",
  90: "1,5 minutos",
  120: "2 minutos",
  300: "5 minutos",
};

// ---------- Precision mode question counts ----------

export const PRECISION_COUNTS = [20, 50, 100] as const;

// ---------- Answer mode ----------

export type AnswerMode = "choices" | "input";

// ---------- Prefs ----------

export interface CalculoPrefs {
  level: Level;
  answerMode: AnswerMode;
  gameMode: GameMode;
  timePerQuestion: TimeOption; // seconds, 0 = no limit
  flashDuration: FlashOption; // seconds, 0 = always visible
  timedDuration: number; // seconds for timed mode
  precisionCount: number; // 20, 50, or 100
  vibrate: boolean;
}

export const DEFAULT_PREFS: CalculoPrefs = {
  level: "iniciante",
  answerMode: "input",
  gameMode: "practice",
  timePerQuestion: 0,
  flashDuration: 0,
  timedDuration: 60,
  precisionCount: 20,
  vibrate: true,
};

// ---------- Stats ----------

const StatsSchema = z.object({
  games: z.number().default(0),
  correct: z.number().default(0),
  total: z.number().default(0),
  bestStreak: z.number().default(0),
  avgMs: z.number().default(0),
  bestScore: z.number().default(0),
  bestTime: z.number().default(0), // best time for precision mode (ms)
  highestLevel: z.string().default(""), // highest level completed
  errorByOp: z.record(z.string(), z.number()).default({}), // op -> error count
  history: z.array(z.object({
    date: z.string().default(""),
    correct: z.number().default(0),
    total: z.number().default(0),
    avgMs: z.number().default(0),
  })).default([]),
});
export type Stats = z.infer<typeof StatsSchema>;

// ---------- Round result (for storage) ----------

export const RoundResultSchema = z.object({
  level: LevelSchema,
  mode: z.enum(["choices", "input"]),
  gameMode: z.enum(GAME_MODES),
  correct: z.number(),
  total: z.number(),
  avgMs: z.number(),
  bestStreak: z.number(),
  score: z.number(),
  playedAt: z.number(),
});
export type RoundResult = z.infer<typeof RoundResultSchema>;
