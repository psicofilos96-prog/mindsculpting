import { z } from "zod";

// ---------- Difficulty ----------

export const DIFFICULTIES = ["facil", "medio", "dificil", "especialista"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DifficultySchema = z.enum(DIFFICULTIES);

export const DIFFICULTY_LABEL: Record<Difficulty, { label: string; desc: string }> = {
  facil: { label: "Fácil", desc: "Maioria de palavras fáceis (F)." },
  medio: { label: "Médio", desc: "Mistura de fáceis e médias (F/M)." },
  dificil: { label: "Difícil", desc: "Maioria de médias e difíceis (M/D)." },
  especialista: { label: "Especialista", desc: "Maioria de palavras difíceis (D)." },
};

// Words per difficulty
export const WORDS_BY_DIFFICULTY: Record<Difficulty, number> = {
  facil: 8,
  medio: 12,
  dificil: 16,
  especialista: 20,
};

// Memorization time per word (ms)
export const MEMORIZE_MS_PER_WORD: Record<Difficulty, number> = {
  facil: 3000,
  medio: 2500,
  dificil: 2000,
  especialista: 1800,
};

// ---------- Game modes ----------

export const GAME_MODES = [
  "classico",
  "rodadas",
  "tardia",
  "ordem",
  "reconhecimento",
  "distrator",
] as const;
export type GameMode = (typeof GAME_MODES)[number];
export const GameModeSchema = z.enum(GAME_MODES);

export const GAME_MODE_LABEL: Record<GameMode, { label: string; desc: string }> = {
  classico: { label: "Clássico", desc: "Memorizar → recordar → resultado." },
  rodadas: { label: "Múltiplas Rodadas", desc: "Mesma lista repetida 5x. Curva de aprendizagem." },
  tardia: { label: "Recordação Tardia", desc: "Tarefa intermediária antes de recordar. Mede retenção longa." },
  ordem: { label: "Ordem Exata", desc: "Recordar na ordem original de apresentação." },
  reconhecimento: { label: "Reconhecimento", desc: "Recordação livre + tela de reconhecimento com distratores." },
  distrator: { label: "Com Distrator Cognitivo", desc: "Tarefa de 30s entre memorização e recordação." },
};

// ---------- List type ----------

export const LIST_TYPES = ["aleatoria", "categorias-ocultas"] as const;
export type ListType = (typeof LIST_TYPES)[number];
export const ListTypeSchema = z.enum(LIST_TYPES);

export const LIST_TYPE_LABEL: Record<ListType, { label: string; desc: string }> = {
  aleatoria: { label: "Aleatória", desc: "Palavras de categorias diferentes entre si." },
  "categorias-ocultas": { label: "Categorias Ocultas", desc: "Metade de uma categoria + metade espalhada. Revelado no fim." },
};

// ---------- Problem / list ----------

export interface WordListEntry {
  palavra: string;
  categoria: string;
  dificuldade: "F" | "M" | "D";
}

export interface RecallProblem {
  words: WordListEntry[];
  /** For categorias-ocultas: the concentrated category */
  hiddenCategory: string | null;
  /** For reconhecimento mode: distractor words not in the list */
  distractors: WordListEntry[];
}

// ---------- Validation result ----------

export interface ValidationResult {
  correct: string[];
  forgotten: string[];
  intrusions: string[];
  perseverations: string[];
  /** Order in which words were typed */
  typedOrder: string[];
  /** For ordem mode: positions matched correctly */
  orderCorrect: number;
  orderTotal: number;
}

// ---------- Recognition result ----------

export interface RecognitionResult {
  hits: number;       // correctly recognized as seen
  correctRejections: number; // correctly rejected as new
  misses: number;     // seen but marked as new
  falseAlarms: number; // new but marked as seen
  total: number;
}

// ---------- Round result (for storage) ----------

export const RecallRoundResultSchema = z.object({
  difficulty: DifficultySchema,
  gameMode: GameModeSchema,
  listType: ListTypeSchema,
  correct: z.number().default(0),
  total: z.number().default(0),
  intrusions: z.number().default(0),
  perseverations: z.number().default(0),
  orderCorrect: z.number().default(0),
  orderTotal: z.number().default(0),
  recognitionHits: z.number().default(0),
  recognitionTotal: z.number().default(0),
  /** For categorias-ocultas: recall rate of concentrated category words */
  hiddenCategoryRecall: z.number().default(0),
  scatteredRecall: z.number().default(0),
  hiddenCategory: z.string().default(""),
  /** For rodadas: recall per round */
  learningCurve: z.array(z.number()).default([]),
  score: z.number().default(0),
  playedAt: z.number().default(0),
});
export type RecallRoundResult = z.infer<typeof RecallRoundResultSchema>;

// ---------- Stats ----------

export const RecallStatsSchema = z.object({
  games: z.number().default(0),
  totalCorrect: z.number().default(0),
  totalWords: z.number().default(0),
  totalIntrusions: z.number().default(0),
  totalPerseverations: z.number().default(0),
  bestScore: z.number().default(0),
  bestRecall: z.number().default(0), // highest % recalled
  recognitionAccuracy: z.number().default(0),
  history: z.array(z.object({
    date: z.string().default(""),
    correct: z.number().default(0),
    total: z.number().default(0),
    score: z.number().default(0),
  })).default([]),
});
export type RecallStats = z.infer<typeof RecallStatsSchema>;

// ---------- Prefs ----------

export const RecallPrefsSchema = z.object({
  difficulty: DifficultySchema.default("facil"),
  gameMode: GameModeSchema.default("classico"),
  listType: ListTypeSchema.default("aleatoria"),
  vibrate: z.boolean().default(true),
});
export type RecallPrefs = z.infer<typeof RecallPrefsSchema>;

export const DEFAULT_RECALL_PREFS: RecallPrefs = {
  difficulty: "facil",
  gameMode: "classico",
  listType: "aleatoria",
  vibrate: true,
};

// ---------- Constants ----------

export const MAX_ROUNDS = 5;
export const DISTRACTOR_DURATION_MS = 30_000;
export const LATE_RECALL_DURATION_MS = 120_000;
export const RECOGNITION_DISTRACTOR_COUNT = 15;
