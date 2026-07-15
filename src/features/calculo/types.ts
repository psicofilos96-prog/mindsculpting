import { z } from "zod";

export const LEVELS = ["facil", "medio", "dificil", "einstein"] as const;
export type Level = (typeof LEVELS)[number];

export const LevelSchema = z.enum(LEVELS);

export type Operator = "+" | "-" | "×" | "÷";

export interface Step {
  op: Operator;
  value: number;
}

export interface Problem {
  start: number;
  steps: Step[];
  answer: number;
  choices: number[]; // 5 opções (embaralhadas) — apenas modo alternativas
}

export const RoundResultSchema = z.object({
  level: LevelSchema,
  mode: z.enum(["choices", "input"]),
  correct: z.number(),
  total: z.number(),
  avgMs: z.number(),
  bestStreak: z.number(),
  playedAt: z.number(),
});
export type RoundResult = z.infer<typeof RoundResultSchema>;

export interface LevelConfig {
  label: string;
  desc: string;
  steps: [number, number]; // min, max passos
  stepMs: number;
  ops: Operator[];
}

export const LEVEL_CONFIG: Record<Level, LevelConfig> = {
  facil:    { label: "Fácil",    desc: "Somas e subtrações",           steps: [3, 4], stepMs: 2000, ops: ["+", "-"] },
  medio:    { label: "Médio",    desc: "Multiplicações (com + e −)",  steps: [4, 5], stepMs: 1400, ops: ["+", "-", "×"] },
  dificil:  { label: "Difícil",  desc: "Divisões inteiras (mistura)",  steps: [4, 5], stepMs: 1000, ops: ["+", "-", "×", "÷"] },
  einstein: { label: "Einstein", desc: "As 4 operações, rápido",       steps: [6, 7], stepMs: 800,  ops: ["+", "-", "×", "÷"] },
};

export const ROUNDS_PER_SESSION = 10;
