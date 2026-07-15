import { z } from "zod";

export const MEMORIA_MODES = ["forward", "reverse", "position"] as const;
export type MemoriaMode = (typeof MEMORIA_MODES)[number];
export const MemoriaModeSchema = z.enum(MEMORIA_MODES);

export const MEMORIA_ALPHABETS = ["digits", "letters", "mixed"] as const;
export type MemoriaAlphabet = (typeof MEMORIA_ALPHABETS)[number];
export const MemoriaAlphabetSchema = z.enum(MEMORIA_ALPHABETS);

export const MEMORIA_INPUTS = ["keypad", "tap"] as const;
export type MemoriaInput = (typeof MEMORIA_INPUTS)[number];
export const MemoriaInputSchema = z.enum(MEMORIA_INPUTS);

export const MEMORIA_DISPLAYS = ["sequential", "whole"] as const;
export type MemoriaDisplay = (typeof MEMORIA_DISPLAYS)[number];
export const MemoriaDisplaySchema = z.enum(MEMORIA_DISPLAYS);

export const MEMORIA_LENGTH_MODES = ["adaptive", "fixed"] as const;
export type MemoriaLengthMode = (typeof MEMORIA_LENGTH_MODES)[number];
export const MemoriaLengthModeSchema = z.enum(MEMORIA_LENGTH_MODES);

export const MEMORIA_MODE_LABEL: Record<MemoriaMode, { label: string; desc: string }> = {
  forward: { label: "Direto", desc: "Digite/toque na mesma ordem." },
  reverse: { label: "Reverso", desc: "De trás pra frente — memória de trabalho." },
  position: { label: "Posição", desc: "Responda qual símbolo estava em uma posição." },
};

export const MEMORIA_ALPHABET_LABEL: Record<MemoriaAlphabet, string> = {
  digits: "Números",
  letters: "Letras",
  mixed: "Misto",
};

export const MEMORIA_DISPLAY_LABEL: Record<MemoriaDisplay, { label: string; desc: string }> = {
  sequential: { label: "Sequencial", desc: "Um símbolo por vez, em ritmo constante." },
  whole: { label: "Inteiro", desc: "Toda a sequência aparece de uma vez pelo tempo escolhido." },
};

// Letras sem rima em pt-BR (evita confusão auditiva/rítmica)
export const LETTER_POOL = ["F", "H", "J", "K", "L", "M", "N", "Q", "R", "S", "X", "Z"] as const;
export const DIGIT_POOL = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export const MEMORIA_ROUNDS_PER_SESSION = 10;
export const MEMORIA_INITIAL_LENGTH = 4;
export const MEMORIA_MIN_LENGTH = 3;
export const MEMORIA_MAX_LENGTH = 12;
export const MEMORIA_GAP_MS = 200;
export const MEMORIA_CHUNK_PAUSE_MS = 500;

// Faixas para os sliders do usuário
export const MEMORIA_TIME_MIN_MS = 1500;
export const MEMORIA_TIME_MAX_MS = 20000;
export const MEMORIA_TIME_DEFAULT_MS = 4000;

export interface MemoriaProblem {
  sequence: string[];
  mode: MemoriaMode;
  alphabet: MemoriaAlphabet;
  // usado só quando mode === "position"
  askIndex: number;
  choices: string[]; // usado no modo "tap" e "position"
}

export const MemoriaPrefsSchema = z.object({
  mode: MemoriaModeSchema.default("forward"),
  alphabet: MemoriaAlphabetSchema.default("digits"),
  input: MemoriaInputSchema.default("keypad"),
  chunking: z.boolean().default(false),
  display: MemoriaDisplaySchema.default("sequential"),
  lengthMode: MemoriaLengthModeSchema.default("adaptive"),
  fixedLength: z.number().int().min(3).max(12).default(5),
  totalTimeMs: z.number().int().default(MEMORIA_TIME_DEFAULT_MS),
});
export type MemoriaPrefs = z.infer<typeof MemoriaPrefsSchema>;

export const MemoriaRoundResultSchema = z.object({
  mode: MemoriaModeSchema,
  alphabet: MemoriaAlphabetSchema,
  correct: z.number(),
  total: z.number(),
  maxLength: z.number(),
  avgMs: z.number(),
  playedAt: z.number(),
});
export type MemoriaRoundResult = z.infer<typeof MemoriaRoundResultSchema>;

export const MemoriaStatsSchema = z.object({
  games: z.number().default(0),
  correct: z.number().default(0),
  total: z.number().default(0),
  bestLength: z.number().default(0),
  avgMs: z.number().default(0),
});
export type MemoriaStats = z.infer<typeof MemoriaStatsSchema>;
