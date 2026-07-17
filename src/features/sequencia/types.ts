// ---------- Colors ----------

export interface SeqColor {
  id: string;
  label: string;
  // oklch values for base and lit states
  base: string;
  lit: string;
  // musical note frequency (Hz)
  freq: number;
}

// Standard 4-color Simon palette with fixed notes (C, D, E, G)
export const COLORS_4: SeqColor[] = [
  { id: "red", label: "Vermelho", base: "oklch(0.58 0.22 25)", lit: "oklch(0.75 0.20 25)", freq: 261.63 },
  { id: "yellow", label: "Amarelo", base: "oklch(0.80 0.17 85)", lit: "oklch(0.90 0.15 85)", freq: 392.0 },
  { id: "green", label: "Verde", base: "oklch(0.60 0.17 145)", lit: "oklch(0.78 0.16 145)", freq: 293.66 },
  { id: "blue", label: "Azul", base: "oklch(0.55 0.20 250)", lit: "oklch(0.72 0.16 250)", freq: 329.63 },
];

// Extended palettes for "random" mode (6, 8, 10 colors)
const EXTRA_COLORS: SeqColor[] = [
  { id: "orange", label: "Laranja", base: "oklch(0.65 0.19 55)", lit: "oklch(0.80 0.16 55)", freq: 349.23 },
  { id: "purple", label: "Roxo", base: "oklch(0.55 0.20 300)", lit: "oklch(0.72 0.16 300)", freq: 440.0 },
  { id: "cyan", label: "Ciano", base: "oklch(0.60 0.15 200)", lit: "oklch(0.78 0.12 200)", freq: 493.88 },
  { id: "pink", label: "Rosa", base: "oklch(0.65 0.22 350)", lit: "oklch(0.80 0.18 350)", freq: 523.25 },
  { id: "lime", label: "Lima", base: "oklch(0.70 0.18 120)", lit: "oklch(0.85 0.15 120)", freq: 587.33 },
  { id: "teal", label: "Turquesa", base: "oklch(0.55 0.12 180)", lit: "oklch(0.72 0.10 180)", freq: 659.25 },
];

export const COLORS_6 = [...COLORS_4, ...EXTRA_COLORS.slice(0, 2)];
export const COLORS_8 = [...COLORS_4, ...EXTRA_COLORS.slice(0, 4)];
export const COLORS_10 = [...COLORS_4, ...EXTRA_COLORS];

export function getPalette(count: number): SeqColor[] {
  if (count <= 4) return COLORS_4;
  if (count <= 6) return COLORS_6;
  if (count <= 8) return COLORS_8;
  return COLORS_10;
}

// ---------- Game modes ----------

export const MODES = ["classic", "timed", "reverse", "random", "lightning", "kids"] as const;
export type GameMode = (typeof MODES)[number];

export const MODE_LABEL: Record<GameMode, { label: string; desc: string; icon: string }> = {
  classic: { label: "Clássico", desc: "Sequência infinita, termina no primeiro erro.", icon: "Infinite" },
  timed: { label: "Cronometrado", desc: "Tempo limite curto para responder cada passo.", icon: "Timer" },
  reverse: { label: "Invertido", desc: "Repita a sequência de trás para frente.", icon: "Repeat2" },
  random: { label: "Aleatório", desc: "Painel com 6, 8 ou 10 cores em vez de 4.", icon: "Shuffle" },
  lightning: { label: "Relâmpago", desc: "Sequência em velocidade muito alta.", icon: "Zap" },
  kids: { label: "Infantil", desc: "Sequências curtas, velocidade baixa, sons suaves.", icon: "Baby" },
};

// ---------- Speed (ms per color during demo) ----------

export function getDemoSpeed(round: number, mode: GameMode): number {
  if (mode === "lightning") return 250;
  if (mode === "kids") return 900;
  if (round <= 5) return 700;
  if (round <= 10) return 550;
  if (round <= 15) return 400;
  return 300;
}

export function getGapMs(round: number, mode: GameMode): number {
  if (mode === "lightning") return 80;
  if (mode === "kids") return 300;
  return Math.max(120, Math.round(getDemoSpeed(round, mode) * 0.4));
}

// Timed mode: ms per input step
export function getTimedStepMs(round: number): number {
  return Math.max(1500, 4000 - round * 150);
}

// ---------- Config ----------

export interface SequenceConfig {
  mode: GameMode;
  colorCount: number; // for random mode: 6, 8, or 10
  soundEnabled: boolean;
  vibrateEnabled: boolean;
}

export const DEFAULT_CONFIG: SequenceConfig = {
  mode: "classic",
  colorCount: 6,
  soundEnabled: true,
  vibrateEnabled: true,
};

// ---------- Stats ----------

export interface SequenceStats {
  games: number;
  bestSequence: number; // longest sequence reached across all games
  totalScore: number;
  bestScore: number;
  bestByMode: Record<string, number>; // mode -> best sequence
  achievements: string[]; // unlocked achievement ids
}

export const DEFAULT_STATS: SequenceStats = {
  games: 0,
  bestSequence: 0,
  totalScore: 0,
  bestScore: 0,
  bestByMode: {},
  achievements: [],
};

// ---------- Achievements ----------

export interface Achievement {
  id: string;
  label: string;
  desc: string;
  threshold: number; // sequence length needed
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "round-10", label: "Dezena", desc: "Alcance 10 rodadas", threshold: 10 },
  { id: "round-25", label: "Memória de Aço", desc: "Alcance 25 rodadas", threshold: 25 },
  { id: "round-50", label: "Mente Brilhante", desc: "Alcance 50 rodadas", threshold: 50 },
  { id: "round-100", label: "Lendário", desc: "Alcance 100 rodadas", threshold: 100 },
];

// ---------- Game result ----------

export interface GameResult {
  mode: GameMode;
  sequenceLength: number; // rounds completed (= final sequence length)
  score: number;
  avgReactionMs: number;
  mistakes: number;
  playedAt: number;
}

// ---------- Scoring ----------

export function calcRoundScore(round: number, reactionMs: number, noMistakes: boolean): number {
  let score = 10; // base per round
  // Speed bonus: faster = more
  if (reactionMs > 0 && reactionMs < 2000) score += Math.round((2000 - reactionMs) / 100);
  // No-mistake bonus
  if (noMistakes) score += 5;
  // Higher rounds give slightly more
  score += Math.floor(round / 5) * 2;
  return score;
}

export function calcRecordBonus(sequenceLength: number, prevBest: number): number {
  if (sequenceLength > prevBest && prevBest > 0) return 50;
  return 0;
}
