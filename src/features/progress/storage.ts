import { z } from "zod";
import { LevelSchema, RoundResultSchema, type Level, type RoundResult } from "../calculo/types";
import {
  MemoriaPrefsSchema,
  MemoriaRoundResultSchema,
  MemoriaStatsSchema,
  type MemoriaAlphabet,
  type MemoriaMode,
  type MemoriaRoundResult,
  type MemoriaStats,
} from "../memoria/types";

const STORAGE_KEY = "neurotrainer:v1";

const StatsSchema = z.object({
  games: z.number().default(0),
  correct: z.number().default(0),
  total: z.number().default(0),
  bestStreak: z.number().default(0),
  avgMs: z.number().default(0),
});
export type Stats = z.infer<typeof StatsSchema>;

const StateSchema = z.object({
  prefs: z
    .object({
      level: LevelSchema.default("facil"),
      inputMode: z.boolean().default(false),
      vibrate: z.boolean().default(true),
    })
    .default({ level: "facil", inputMode: false, vibrate: true }),
  stats: z.partialRecord(LevelSchema, StatsSchema).default({}),
  history: z.array(RoundResultSchema).default([]),
  memoriaPrefs: MemoriaPrefsSchema.default({
    mode: "forward",
    alphabet: "digits",
    input: "keypad",
    chunking: false,
    display: "sequential",
    lengthMode: "adaptive",
    fixedLength: 5,
    totalTimeMs: 4000,
  }),
  memoriaStats: z
    .record(z.string(), MemoriaStatsSchema)
    .default({}),
  memoriaHistory: z.array(MemoriaRoundResultSchema).default([]),
});
export type ProgressState = z.infer<typeof StateSchema>;

const DEFAULT_STATE: ProgressState = {
  prefs: { level: "facil", inputMode: false, vibrate: true },
  stats: {} as ProgressState["stats"],
  history: [],
  memoriaPrefs: {
    mode: "forward",
    alphabet: "digits",
    input: "keypad",
    chunking: false,
    display: "sequential",
    lengthMode: "adaptive",
    fixedLength: 5,
    totalTimeMs: 4000,
  },
  memoriaStats: {},
  memoriaHistory: [],
};

export function loadState(): ProgressState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = StateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: ProgressState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function recordRound(state: ProgressState, result: RoundResult): ProgressState {
  const prev = state.stats[result.level] ?? { games: 0, correct: 0, total: 0, bestStreak: 0, avgMs: 0 };
  const games = prev.games + 1;
  const correct = prev.correct + result.correct;
  const total = prev.total + result.total;
  const bestStreak = Math.max(prev.bestStreak, result.bestStreak);
  const avgMs = Math.round((prev.avgMs * prev.games + result.avgMs) / games);
  return {
    ...state,
    stats: { ...state.stats, [result.level]: { games, correct, total, bestStreak, avgMs } },
    history: [result, ...state.history].slice(0, 20),
  };
}

export function memoriaKey(mode: MemoriaMode, alphabet: MemoriaAlphabet): string {
  return `${mode}:${alphabet}`;
}

export function recordMemoriaRound(
  state: ProgressState,
  result: MemoriaRoundResult,
): ProgressState {
  const key = memoriaKey(result.mode, result.alphabet);
  const prev: MemoriaStats =
    state.memoriaStats[key] ?? { games: 0, correct: 0, total: 0, bestLength: 0, avgMs: 0 };
  const games = prev.games + 1;
  const correct = prev.correct + result.correct;
  const total = prev.total + result.total;
  const bestLength = Math.max(prev.bestLength, result.maxLength);
  const avgMs = Math.round((prev.avgMs * prev.games + result.avgMs) / games);
  return {
    ...state,
    memoriaStats: { ...state.memoriaStats, [key]: { games, correct, total, bestLength, avgMs } },
    memoriaHistory: [result, ...state.memoriaHistory].slice(0, 20),
  };
}

export function getLevelStats(state: ProgressState, level: Level): Stats {
  return state.stats[level] ?? { games: 0, correct: 0, total: 0, bestStreak: 0, avgMs: 0 };
}

export function getMemoriaStats(
  state: ProgressState,
  mode: MemoriaMode,
  alphabet: MemoriaAlphabet,
): MemoriaStats {
  return (
    state.memoriaStats[memoriaKey(mode, alphabet)] ?? {
      games: 0,
      correct: 0,
      total: 0,
      bestLength: 0,
      avgMs: 0,
    }
  );
}
