// Módulo "Buffer Contínuo" (running memory / atualização contínua).
// Nome do diretório mantido como "arit" por compatibilidade de rotas.

export type BufferOrder = "chronological" | "reverse";
export type SessionMode = "time" | "rounds";

export interface BufferConfig {
  intervalMs: number;      // tempo entre números (1000..2500)
  lastN: 2 | 3 | 4;        // quantos últimos lembrar
  order: BufferOrder;      // ordem de resposta
  sessionMode: SessionMode;
  sessionValue: number;    // minutos (time) ou rodadas (rounds)
}

export interface BufferStats {
  sessions: number;
  totalRounds: number;
  totalCorrect: number;
  bestStreak: number;
}

export const DEFAULT_CONFIG: BufferConfig = {
  intervalMs: 1750,
  lastN: 3,
  order: "chronological",
  sessionMode: "rounds",
  sessionValue: 10,
};

export const INTERVAL_OPTIONS = [1000, 1250, 1500, 1750, 2000, 2500] as const;
export const LAST_N_OPTIONS = [2, 3, 4] as const;
export const TIME_OPTIONS = [2, 5] as const;             // minutos
export const ROUNDS_OPTIONS = [5, 10, 20] as const;

export const MIN_BEFORE_STOP = 6;
export const MAX_BEFORE_STOP = 12;

export const DIGITS = ["0","1","2","3","4","5","6","7","8","9"] as const;

export function randomDigit(prev?: string): string {
  let d: string;
  let tries = 0;
  do {
    d = DIGITS[Math.floor(Math.random() * DIGITS.length)]!;
    tries++;
  } while (d === prev && tries < 5);
  return d;
}

export function nextStopAt(): number {
  const range = MAX_BEFORE_STOP - MIN_BEFORE_STOP + 1;
  return MIN_BEFORE_STOP + Math.floor(Math.random() * range);
}

export function expectedAnswer(shown: string[], lastN: number, order: BufferOrder): string[] {
  const tail = shown.slice(-lastN);
  return order === "chronological" ? tail : [...tail].reverse();
}

export function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
