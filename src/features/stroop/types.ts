export type ColorId = "red" | "blue" | "green" | "yellow" | "purple" | "orange" | "pink" | "cyan";

export interface StroopColor {
  id: ColorId;
  label: string;
  hex: string;
}

export const ALL_COLORS: StroopColor[] = [
  { id: "red", label: "VERMELHO", hex: "#ef4444" },
  { id: "blue", label: "AZUL", hex: "#3b82f6" },
  { id: "green", label: "VERDE", hex: "#22c55e" },
  { id: "yellow", label: "AMARELO", hex: "#eab308" },
  { id: "purple", label: "ROXO", hex: "#a855f7" },
  { id: "orange", label: "LARANJA", hex: "#f97316" },
  { id: "pink", label: "ROSA", hex: "#ec4899" },
  { id: "cyan", label: "CIANO", hex: "#06b6d4" },
];

export interface StroopConfig {
  colorCount: 4 | 6 | 8;
  rounds: 15 | 20 | 30;
  timeLimitMs: 1500 | 2500 | 4000;
  incongruentRatio: 0.5 | 0.7 | 0.9; // proportion of incongruent trials
}

export interface StroopStats {
  sessions: number;
  totalAnswers: number;
  totalCorrect: number;
  bestAccuracy: number; // 0..100
  bestAvgMs: number; // lower is better; 0 = none
}

export const DEFAULT_CONFIG: StroopConfig = {
  colorCount: 4,
  rounds: 20,
  timeLimitMs: 2500,
  incongruentRatio: 0.7,
};

export const COLOR_COUNT_OPTIONS = [4, 6, 8] as const;
export const ROUNDS_OPTIONS = [15, 20, 30] as const;
export const TIME_LIMIT_OPTIONS = [1500, 2500, 4000] as const;
export const RATIO_OPTIONS = [0.5, 0.7, 0.9] as const;

export interface Trial {
  wordColor: StroopColor; // the color name shown as text
  fontColor: StroopColor; // the color used to render — this is the answer
  congruent: boolean;
}

export function pickPalette(count: number): StroopColor[] {
  return ALL_COLORS.slice(0, count);
}

export function generateTrial(palette: StroopColor[], incongruentRatio: number): Trial {
  const wantIncongruent = Math.random() < incongruentRatio;
  const fontColor = palette[Math.floor(Math.random() * palette.length)]!;
  let wordColor: StroopColor;
  if (!wantIncongruent) {
    wordColor = fontColor;
  } else {
    const others = palette.filter((c) => c.id !== fontColor.id);
    wordColor = others[Math.floor(Math.random() * others.length)] ?? fontColor;
  }
  return { wordColor, fontColor, congruent: wordColor.id === fontColor.id };
}
