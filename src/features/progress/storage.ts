import { z } from "zod";
import {
  LevelSchema,
  RoundResultSchema,
  GAME_MODES,
  DEFAULT_PREFS,
  type Level,
  type RoundResult,
} from "../calculo/types";
import {
  MemoriaPrefsSchema,
  MemoriaRoundResultSchema,
  MemoriaStatsSchema,
  type MemoriaAlphabet,
  type MemoriaMode,
  type MemoriaRoundResult,
  type MemoriaStats,
} from "../memoria/types";
import {
  RecallPrefsSchema,
  RecallRoundResultSchema,
  RecallStatsSchema,
  DEFAULT_RECALL_PREFS,
  type Difficulty,
  type RecallRoundResult,
  type RecallStats,
} from "../recall/types";
import {
  SlidePrefsSchema,
  SlideStatsSchema,
  DEFAULT_SLIDE_PREFS,
  DEFAULT_SLIDE_STATS,
  type SlideStats,
  type GridSize,
} from "../slide/types";

const STORAGE_KEY = "neurotrainer:v1";

const StatsSchema = z.object({
  games: z.number().default(0),
  correct: z.number().default(0),
  total: z.number().default(0),
  bestStreak: z.number().default(0),
  avgMs: z.number().default(0),
  bestScore: z.number().default(0),
  bestTime: z.number().default(0),
  highestLevel: z.string().default(""),
  errorByOp: z.record(z.string(), z.number()).default({}),
  history: z.array(z.object({
    date: z.string().default(""),
    correct: z.number().default(0),
    total: z.number().default(0),
    avgMs: z.number().default(0),
  })).default([]),
});
export type Stats = z.infer<typeof StatsSchema>;

const CalculoPrefsSchema = z.object({
  level: LevelSchema.default("iniciante"),
  answerMode: z.enum(["choices", "input"]).default("input"),
  gameMode: z.enum(GAME_MODES).default("practice"),
  timePerQuestion: z.number().default(0),
  flashDuration: z.number().default(0),
  timedDuration: z.number().default(60),
  precisionCount: z.number().default(20),
  vibrate: z.boolean().default(true),
});
export type CalculoPrefs = z.infer<typeof CalculoPrefsSchema>;

const StateSchema = z.object({
  prefs: CalculoPrefsSchema.default(DEFAULT_PREFS),
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
  memoriaStats: z.record(z.string(), MemoriaStatsSchema).default({}),
  memoriaHistory: z.array(MemoriaRoundResultSchema).default([]),
  recallPrefs: RecallPrefsSchema.default(DEFAULT_RECALL_PREFS),
  recallStats: z.record(z.string(), RecallStatsSchema).default({}),
  recallHistory: z.array(RecallRoundResultSchema).default([]),
  slidePrefs: SlidePrefsSchema.default(DEFAULT_SLIDE_PREFS),
  slideStats: SlideStatsSchema.default(DEFAULT_SLIDE_STATS),
});
export type ProgressState = z.infer<typeof StateSchema>;

const DEFAULT_STATE: ProgressState = {
  prefs: { ...DEFAULT_PREFS },
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
  recallPrefs: { ...DEFAULT_RECALL_PREFS },
  recallStats: {},
  recallHistory: [],
  slidePrefs: { ...DEFAULT_SLIDE_PREFS },
  slideStats: { ...DEFAULT_SLIDE_STATS },
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
  const prev = state.stats[result.level] ?? {
    games: 0, correct: 0, total: 0, bestStreak: 0, avgMs: 0,
    bestScore: 0, bestTime: 0, highestLevel: "", errorByOp: {}, history: [],
  };
  const games = prev.games + 1;
  const correct = prev.correct + result.correct;
  const total = prev.total + result.total;
  const bestStreak = Math.max(prev.bestStreak, result.bestStreak);
  const avgMs = Math.round((prev.avgMs * prev.games + result.avgMs) / games);
  const bestScore = Math.max(prev.bestScore, result.score);

  const today = new Date().toISOString().slice(0, 10);
  const newHistory = [
    { date: today, correct: result.correct, total: result.total, avgMs: result.avgMs },
    ...prev.history,
  ].slice(0, 30);

  return {
    ...state,
    stats: {
      ...state.stats,
      [result.level]: {
        games, correct, total, bestStreak, avgMs, bestScore,
        bestTime: prev.bestTime, highestLevel: prev.highestLevel,
        errorByOp: prev.errorByOp, history: newHistory,
      },
    },
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
  return state.stats[level] ?? {
    games: 0, correct: 0, total: 0, bestStreak: 0, avgMs: 0,
    bestScore: 0, bestTime: 0, highestLevel: "", errorByOp: {}, history: [],
  };
}

export function getMemoriaStats(
  state: ProgressState,
  mode: MemoriaMode,
  alphabet: MemoriaAlphabet,
): MemoriaStats {
  return (
    state.memoriaStats[memoriaKey(mode, alphabet)] ?? {
      games: 0, correct: 0, total: 0, bestLength: 0, avgMs: 0,
    }
  );
}

export function recallKey(difficulty: Difficulty): string {
  return difficulty;
}

export function recordRecallRound(
  state: ProgressState,
  result: RecallRoundResult,
): ProgressState {
  const key = recallKey(result.difficulty);
  const prev: RecallStats =
    state.recallStats[key] ?? {
      games: 0, totalCorrect: 0, totalWords: 0, totalIntrusions: 0,
      totalPerseverations: 0, bestScore: 0, bestRecall: 0,
      recognitionAccuracy: 0, history: [],
    };
  const games = prev.games + 1;
  const totalCorrect = prev.totalCorrect + result.correct;
  const totalWords = prev.totalWords + result.total;
  const totalIntrusions = prev.totalIntrusions + result.intrusions;
  const totalPerseverations = prev.totalPerseverations + result.perseverations;
  const bestScore = Math.max(prev.bestScore, result.score);
  const recallPct = result.total > 0 ? (result.correct / result.total) * 100 : 0;
  const bestRecall = Math.max(prev.bestRecall, recallPct);
  const today = new Date().toISOString().slice(0, 10);
  const newHistory = [
    { date: today, correct: result.correct, total: result.total, score: result.score },
    ...prev.history,
  ].slice(0, 30);
  return {
    ...state,
    recallStats: {
      ...state.recallStats,
      [key]: {
        games, totalCorrect, totalWords, totalIntrusions, totalPerseverations,
        bestScore, bestRecall, recognitionAccuracy: prev.recognitionAccuracy, history: newHistory,
      },
    },
    recallHistory: [result, ...state.recallHistory].slice(0, 20),
  };
}

export function getRecallStats(state: ProgressState, difficulty: Difficulty): RecallStats {
  return (
    state.recallStats[recallKey(difficulty)] ?? {
      games: 0, totalCorrect: 0, totalWords: 0, totalIntrusions: 0,
      totalPerseverations: 0, bestScore: 0, bestRecall: 0,
      recognitionAccuracy: 0, history: [],
    }
  );
}

export interface SlideRoundResult {
  gridSize: GridSize;
  moves: number;
  elapsedSec: number;
  score: number;
}

export function recordSlideRound(
  state: ProgressState,
  result: SlideRoundResult,
): ProgressState {
  const prev = state.slideStats ?? DEFAULT_SLIDE_STATS;
  const sizeKey = String(result.gridSize) as keyof typeof prev.bestTimes;
  const prevBestTime = prev.bestTimes[result.gridSize] ?? Infinity;
  const prevBestMoves = prev.bestMoves[result.gridSize] ?? Infinity;
  const newStreak = prev.currentStreak + 1;
  return {
    ...state,
    slideStats: {
      games: prev.games + 1,
      totalMoves: prev.totalMoves + result.moves,
      totalSolved: prev.totalSolved + 1,
      currentStreak: newStreak,
      bestStreak: Math.max(prev.bestStreak, newStreak),
      bestTimes: {
        ...prev.bestTimes,
        [sizeKey]: Math.min(prevBestTime, result.elapsedSec),
      },
      bestMoves: {
        ...prev.bestMoves,
        [sizeKey]: Math.min(prevBestMoves, result.moves),
      },
    },
  };
}

export function getSlideStats(state: ProgressState): SlideStats {
  return state.slideStats ?? DEFAULT_SLIDE_STATS;
}
