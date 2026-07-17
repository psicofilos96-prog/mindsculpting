export interface MundoIConfig {
  wpm: number;
  maxSequenceLength: number;
}

export interface MundoIStats {
  sessions: number;
  totalRounds: number;
  totalCorrect: number;
  bestStreak: number;
  bestSequenceLength: number;
}

export const DEFAULT_CONFIG: MundoIConfig = {
  wpm: 15,
  maxSequenceLength: 4,
};

export const WPM_OPTIONS = [10, 15, 20, 25] as const;
