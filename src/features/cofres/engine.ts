import type {
  Attempt,
  Category,
  CofresPrefs,
  Difficulty,
  DifficultyConfig,
  Feedback,
  FeedbackLevel,
  GameMode,
  VaultGame,
  CellHypothesis,
} from "./types";
import {
  CATEGORY_SYMBOLS,
  DIFFICULTY_CONFIG,
} from "./types";

// ── Seeded RNG (mulberry32) ──────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateSeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// ── Secret generation ────────────────────────────────────────────────────────

function generateSecret(
  category: Category,
  config: DifficultyConfig,
  rng: () => number,
): string[] {
  const symbols = CATEGORY_SYMBOLS[category];
  const length = config.length;

  if (!config.allowRepeat) {
    const shuffled = [...symbols];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled.slice(0, length);
  }

  const secret: string[] = [];
  for (let i = 0; i < length; i++) {
    secret.push(symbols[Math.floor(rng() * symbols.length)]!);
  }
  return secret;
}

// ── Feedback calculation (standard Mastermind algorithm) ──────────────────────

export function calculateFeedback(
  guess: string[],
  secret: string[],
  level: FeedbackLevel,
): Feedback {
  const length = secret.length;
  let exact = 0;
  let partial = 0;

  const secretRemaining: (string | null)[] = [...secret];
  const guessRemaining: (string | null)[] = [...guess];

  for (let i = 0; i < length; i++) {
    if (guess[i] === secret[i]) {
      exact++;
      secretRemaining[i] = null;
      guessRemaining[i] = null;
    }
  }

  const secretFreq: Record<string, number> = {};
  for (const v of secretRemaining) {
    if (v !== null) {
      secretFreq[v] = (secretFreq[v] ?? 0) + 1;
    }
  }

  for (const v of guessRemaining) {
    if (v !== null && secretFreq[v] && secretFreq[v]! > 0) {
      partial++;
      secretFreq[v]!--;
    }
  }

  const display = formatFeedback(exact, partial, level);
  return { exact, partial, display };
}

function formatFeedback(exact: number, partial: number, level: FeedbackLevel): string {
  switch (level) {
    case "easy":
      return `${exact} certo${exact !== 1 ? "s" : ""} na posição, ${partial} certo${partial !== 1 ? "s" : ""} fora de posição`;
    case "medium": {
      const total = exact + partial;
      return `${total} valor${total !== 1 ? "es" : ""} correto${total !== 1 ? "s" : ""}`;
    }
    case "hard": {
      const total = exact + partial;
      if (total === 0) return "Nenhum valor correto";
      if (total === 1) return "Pelo menos 1 correto";
      if (total <= 3) return "Pelo menos 2 corretos";
      if (total <= 5) return "Vários corretos";
      return "Muitos corretos";
    }
  }
}

// ── Game creation ────────────────────────────────────────────────────────────

export function createGame(
  prefs: CofresPrefs,
  seed?: number,
): VaultGame {
  const actualSeed = seed ?? Math.floor(Math.random() * 2 ** 31);
  const rng = mulberry32(actualSeed);
  const config = DIFFICULTY_CONFIG[prefs.difficulty];

  let maxAttempts = config.maxAttempts;
  if (prefs.gameMode === "survival" || prefs.gameMode === "spy") {
    maxAttempts = Math.max(4, Math.floor(config.maxAttempts * 0.6));
  }

  const secret = generateSecret(prefs.category, config, rng);

  return {
    id: `cofres-${prefs.category}-${prefs.difficulty}-${actualSeed}`,
    category: prefs.category,
    difficulty: prefs.difficulty,
    feedbackLevel: prefs.feedbackLevel,
    gameMode: prefs.gameMode,
    secret,
    maxAttempts,
    allowRepeat: config.allowRepeat,
    attempts: [],
    hypotheses: { candidates: {}, excluded: new Set() },
    solved: false,
    failed: false,
    hintsUsed: 0,
    seed: actualSeed,
  };
}

export function createDailyGame(prefs: CofresPrefs): VaultGame {
  return createGame(prefs, dateSeed());
}

// ── Attempt submission ────────────────────────────────────────────────────────

export function submitGuess(
  game: VaultGame,
  guess: string[],
): VaultGame {
  if (game.solved || game.failed) return game;
  if (guess.length !== game.secret.length) return game;
  if (game.attempts.length >= game.maxAttempts) return game;

  const feedback = calculateFeedback(guess, game.secret, game.feedbackLevel);
  const attempt: Attempt = { guess, feedback };
  const attempts = [...game.attempts, attempt];

  const solved = feedback.exact === game.secret.length;
  const failed = !solved && attempts.length >= game.maxAttempts;

  return { ...game, attempts, solved, failed };
}

// ── Hypothesis management ────────────────────────────────────────────────────

export function toggleExcluded(hypotheses: CellHypothesis, value: string): CellHypothesis {
  const excluded = new Set(hypotheses.excluded);
  if (excluded.has(value)) { excluded.delete(value); } else { excluded.add(value); }
  return { ...hypotheses, excluded };
}

export function toggleCandidate(hypotheses: CellHypothesis, position: number, value: string): CellHypothesis {
  const candidates = { ...hypotheses.candidates };
  const current = new Set(candidates[position] ?? []);
  if (current.has(value)) { current.delete(value); } else { current.add(value); }
  if (current.size === 0) { delete candidates[position]; } else { candidates[position] = current; }
  return { ...hypotheses, candidates };
}

// ── Hint engine ──────────────────────────────────────────────────────────────

export function getHint(game: VaultGame): { position: number; value: string } | null {
  if (game.solved || game.failed) return null;
  const revealed = new Set<number>();
  for (const attempt of game.attempts) {
    for (let i = 0; i < attempt.guess.length; i++) {
      if (attempt.guess[i] === game.secret[i]) revealed.add(i);
    }
  }
  for (let i = 0; i < game.secret.length; i++) {
    if (!revealed.has(i)) return { position: i, value: game.secret[i]! };
  }
  return null;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export function calculateScore(game: VaultGame, timeMs: number): number {
  const base: Record<Difficulty, number> = { I: 100, II: 200, III: 350, mestre: 600, einstein: 1000 };
  let score = base[game.difficulty];
  const attemptsUsed = game.attempts.length;
  const minPossible = Math.ceil(Math.log2(CATEGORY_SYMBOLS[game.category].length));
  const efficiency = Math.max(0, 1 - (attemptsUsed - minPossible) / game.maxAttempts);
  score = Math.round(score * (0.5 + 0.5 * efficiency));
  if (timeMs < 30000) score += 100;
  else if (timeMs < 60000) score += 50;
  if (game.hintsUsed === 0) score += 75;
  if (game.feedbackLevel === "hard") score = Math.round(score * 1.5);
  else if (game.feedbackLevel === "medium") score = Math.round(score * 1.2);
  return Math.max(0, score);
}
