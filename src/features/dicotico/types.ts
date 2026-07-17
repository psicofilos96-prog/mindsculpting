import { z } from "zod";

// ---------- Sound definitions ----------

export type SoundKind = "tone" | "timbre" | "rhythm";
export type TimbreType = "bell" | "drum" | "whistle" | "click";

export interface SoundDef {
  id: string;
  label: string;
  icon: string; // lucide icon name
  kind: SoundKind;
  freq?: number; // for tone
  timbre?: TimbreType; // for timbre
  beats?: number; // for rhythm
}

export const TONE_SOUNDS: SoundDef[] = [
  { id: "tone-grave", label: "Grave", icon: "Radio", kind: "tone", freq: 220 },
  { id: "tone-medio", label: "Médio", icon: "AudioWaveform", kind: "tone", freq: 440 },
  { id: "tone-agudo", label: "Agudo", icon: "Activity", kind: "tone", freq: 880 },
  { id: "tone-super", label: "Muito Agudo", icon: "Zap", kind: "tone", freq: 1320 },
];

export const TIMBRE_SOUNDS: SoundDef[] = [
  { id: "timbre-sino", label: "Sino", icon: "Bell", kind: "timbre", timbre: "bell" },
  { id: "timbre-tambor", label: "Tambor", icon: "Drum", kind: "timbre", timbre: "drum" },
  { id: "timbre-apito", label: "Apito", icon: "Volume2", kind: "timbre", timbre: "whistle" },
  { id: "timbre-batida", label: "Batida Seca", icon: "Square", kind: "timbre", timbre: "click" },
];

export const RHYTHM_SOUNDS: SoundDef[] = [
  { id: "rhythm-1", label: "1 Batida", icon: "Circle", kind: "rhythm", beats: 1 },
  { id: "rhythm-2", label: "2 Batidas", icon: "CircleDot", kind: "rhythm", beats: 2 },
  { id: "rhythm-3", label: "3 Batidas", icon: "MoreHorizontal", kind: "rhythm", beats: 3 },
];

export const ALL_SOUNDS = [...TONE_SOUNDS, ...TIMBRE_SOUNDS, ...RHYTHM_SOUNDS];

export function soundById(id: string): SoundDef | undefined {
  return ALL_SOUNDS.find((s) => s.id === id);
}

export function getSoundPool(variation: VariationType): SoundDef[] {
  if (variation === "tone") return TONE_SOUNDS;
  if (variation === "timbre") return TIMBRE_SOUNDS;
  if (variation === "rhythm") return RHYTHM_SOUNDS;
  return ALL_SOUNDS;
}

// ---------- Config ----------

export const VARIATION_TYPES = ["tone", "timbre", "rhythm", "mixed"] as const;
export type VariationType = (typeof VARIATION_TYPES)[number];

export const VARIATION_LABEL: Record<VariationType, { label: string; desc: string }> = {
  tone: { label: "Tom / Frequência", desc: "Sons de alturas diferentes (grave, médio, agudo)." },
  timbre: { label: "Timbre / Instrumento", desc: "Sino, tambor, apito, batida seca." },
  rhythm: { label: "Padrão Rítmico", desc: "1, 2 ou 3 batidas — testa quantidade/ritmo." },
  mixed: { label: "Misto", desc: "Combina timbres, tons e ritmos — máximo desafio." },
};

export const QUESTION_TYPES = ["selective", "divided", "locate", "mixed"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[0]; // single resolved type per trial
export type ConfigQuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_LABEL: Record<ConfigQuestionType, { label: string; desc: string }> = {
  selective: { label: "Ouvido específico", desc: "Qual som no ouvido X? — atenção seletiva." },
  divided: { label: "Os dois simultâneo", desc: "Quais os dois sons? — processamento dividido." },
  locate: { label: "Localizar som-alvo", desc: "Em qual ouvido estava o som X? — lateralização." },
  mixed: { label: "Misto", desc: " Alterna entre os três tipos de pergunta." },
};

export const DURATION_OPTIONS = [1000, 1500, 2000] as const;
export const ROUNDS_OPTIONS = [10, 20, 30] as const;

export interface DicoticoConfig {
  variationType: VariationType;
  questionType: ConfigQuestionType;
  durationMs: number;
  rounds: number;
}

export const DEFAULT_CONFIG: DicoticoConfig = {
  variationType: "timbre",
  questionType: "selective",
  durationMs: 1500,
  rounds: 20,
};

// ---------- Trial ----------

export type TrialQuestionType = "selective-left" | "selective-right" | "divided" | "locate";

export interface Trial {
  leftSound: SoundDef;
  rightSound: SoundDef;
  questionType: TrialQuestionType;
  targetSound?: SoundDef; // for "locate"
  // correct answer: sound id (selective), [leftId, rightId] (divided), "left"|"right" (locate)
  correct: string | string[] | "left" | "right";
  options: SoundDef[]; // options to display
}

// ---------- Stats ----------

export interface DicoticoStats {
  sessions: number;
  totalAnswers: number;
  totalCorrect: number;
  leftCorrect: number;
  leftTotal: number;
  rightCorrect: number;
  rightTotal: number;
  selectiveCorrect: number;
  selectiveTotal: number;
  dividedCorrect: number;
  dividedTotal: number;
  locateCorrect: number;
  locateTotal: number;
}

export const DEFAULT_STATS: DicoticoStats = {
  sessions: 0,
  totalAnswers: 0,
  totalCorrect: 0,
  leftCorrect: 0,
  leftTotal: 0,
  rightCorrect: 0,
  rightTotal: 0,
  selectiveCorrect: 0,
  selectiveTotal: 0,
  dividedCorrect: 0,
  dividedTotal: 0,
  locateCorrect: 0,
  locateTotal: 0,
};

// ---------- Answer record (per trial) ----------

export interface AnswerRecord {
  correct: boolean;
  questionType: TrialQuestionType;
  ear?: "left" | "right"; // for selective
}
