import {
  CATEGORIES,
  WORD_BANK,
  type WordEntry,
} from "./wordBank";
import {
  DISTRACTOR_DURATION_MS,
  MEMORIZE_MS_PER_WORD,
  RECOGNITION_DISTRACTOR_COUNT,
  WORDS_BY_DIFFICULTY,
  type Difficulty,
  type GameMode,
  type ListType,
  type RecognitionResult,
  type RecallProblem,
  type ValidationResult,
  type WordListEntry,
} from "./types";

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

// ---------- Difficulty filtering ----------

function filterByDifficulty(difficulty: Difficulty): WordEntry[] {
  switch (difficulty) {
    case "facil":
      // Majority F, some M
      return WORD_BANK.filter((w) => w.dificuldade === "F" || (w.dificuldade === "M" && Math.random() < 0.3));
    case "medio":
      // Mix F/M
      return WORD_BANK.filter((w) => w.dificuldade === "F" || w.dificuldade === "M");
    case "dificil":
      // Majority M/D
      return WORD_BANK.filter((w) => w.dificuldade === "M" || w.dificuldade === "D");
    case "especialista":
      // Majority D
      return WORD_BANK.filter((w) => w.dificuldade === "D" || (w.dificuldade === "M" && Math.random() < 0.2));
  }
}

// ---------- List generation ----------

export function generateList(
  difficulty: Difficulty,
  listType: ListType,
): RecallProblem {
  const count = WORDS_BY_DIFFICULTY[difficulty];
  const pool = filterByDifficulty(difficulty);

  if (listType === "categorias-ocultas") {
    return generateCategoriasOcultas(pool, count);
  }
  return generateAleatoria(pool, count);
}

function generateAleatoria(pool: WordEntry[], count: number): RecallProblem {
  // Sort words from DIFFERENT categories — no 2+ from same category
  const byCategory = new Map<string, WordEntry[]>();
  for (const w of pool) {
    const arr = byCategory.get(w.categoria) ?? [];
    arr.push(w);
    byCategory.set(w.categoria, arr);
  }

  const categories = shuffle([...byCategory.keys()]);
  const selected: WordEntry[] = [];

  for (const cat of categories) {
    if (selected.length >= count) break;
    const words = byCategory.get(cat)!;
    selected.push(pick(words));
  }

  // If not enough categories, fill from remaining
  if (selected.length < count) {
    const used = new Set(selected.map((w) => w.palavra));
    const remaining = shuffle(pool.filter((w) => !used.has(w.palavra)));
    while (selected.length < count && remaining.length > 0) {
      selected.push(remaining.pop()!);
    }
  }

  const words = shuffle(selected).slice(0, count);
  const distractors = generateDistractors(words, pool, RECOGNITION_DISTRACTOR_COUNT);

  return {
    words: words.map(toWordListEntry),
    hiddenCategory: null,
    distractors: distractors.map(toWordListEntry),
  };
}

function generateCategoriasOcultas(pool: WordEntry[], count: number): RecallProblem {
  const byCategory = new Map<string, WordEntry[]>();
  for (const w of pool) {
    const arr = byCategory.get(w.categoria) ?? [];
    arr.push(w);
    byCategory.set(w.categoria, arr);
  }

  // Pick one category to concentrate
  const categories = [...byCategory.keys()].filter((c) => byCategory.get(c)!.length >= 2);
  const hiddenCat = pick(categories);
  const half = Math.ceil(count / 2);
  const hiddenWords = shuffle(byCategory.get(hiddenCat)!).slice(0, half);

  // Other half from other categories
  const otherCats = categories.filter((c) => c !== hiddenCat);
  const scattered: WordEntry[] = [];
  for (const cat of shuffle(otherCats)) {
    if (scattered.length >= count - half) break;
    const words = byCategory.get(cat)!;
    scattered.push(pick(words));
  }

  // Fill if needed
  if (scattered.length < count - half) {
    const used = new Set([...hiddenWords, ...scattered].map((w) => w.palavra));
    const remaining = shuffle(pool.filter((w) => !used.has(w.palavra) && w.categoria !== hiddenCat));
    while (scattered.length < count - half && remaining.length > 0) {
      scattered.push(remaining.pop()!);
    }
  }

  const all = shuffle([...hiddenWords, ...scattered]).slice(0, count);
  const distractors = generateDistractors(all, pool, RECOGNITION_DISTRACTOR_COUNT);

  return {
    words: all.map(toWordListEntry),
    hiddenCategory: hiddenCat,
    distractors: distractors.map(toWordListEntry),
  };
}

function generateDistractors(listWords: WordEntry[], pool: WordEntry[], count: number): WordEntry[] {
  const used = new Set(listWords.map((w) => w.palavra));
  const available = pool.filter((w) => !used.has(w.palavra));
  return shuffle(available).slice(0, count);
}

function toWordListEntry(w: WordEntry): WordListEntry {
  return { palavra: w.palavra, categoria: w.categoria, dificuldade: w.dificuldade };
}

// ---------- Memorization time ----------

export function memorizeTimeMs(difficulty: Difficulty, wordCount: number): number {
  return MEMORIZE_MS_PER_WORD[difficulty] * wordCount;
}

// ---------- Validation ----------

export function validateRecall(
  typedWords: string[],
  problem: RecallProblem,
  orderMode: boolean,
): ValidationResult {
  const listWords = problem.words.map((w) => w.palavra.toLowerCase());
  const typed = typedWords.map((w) => w.trim().toLowerCase());

  const correct: string[] = [];
  const forgotten: string[] = [];
  const intrusions: string[] = [];
  const perseverations: string[] = [];
  const typedOrder: string[] = [];

  const seen = new Set<string>();
  const matched = new Set<number>();

  for (let i = 0; i < typed.length; i++) {
    const word = typed[i]!;
    typedOrder.push(word);

    // Perseveration: already typed by user
    if (seen.has(word)) {
      perseverations.push(word);
      continue;
    }

    // Check if word is in the list (not yet matched)
    const idx = listWords.findIndex((w, wi) => w === word && !matched.has(wi));
    if (idx >= 0) {
      matched.add(idx);
      correct.push(word);
    } else {
      // Not in list → intrusion
      intrusions.push(word);
    }
    seen.add(word);
  }

  // Forgotten = list words not matched
  for (let i = 0; i < listWords.length; i++) {
    if (!matched.has(i)) {
      forgotten.push(problem.words[i]!.palavra);
    }
  }

  // Order check
  let orderCorrect = 0;
  if (orderMode) {
    for (let i = 0; i < Math.min(typed.length, listWords.length); i++) {
      if (typed[i] === listWords[i]) orderCorrect++;
    }
  }

  return {
    correct,
    forgotten,
    intrusions,
    perseverations,
    typedOrder,
    orderCorrect,
    orderTotal: listWords.length,
  };
}

// ---------- Recognition validation ----------

export function validateRecognition(
  markedAsSeen: Set<string>,
  problem: RecallProblem,
): RecognitionResult {
  const seenWords = new Set(problem.words.map((w) => w.palavra.toLowerCase()));
  const allWords = [...problem.words, ...problem.distractors].map((w) => w.palavra);

  let hits = 0;
  let correctRejections = 0;
  let misses = 0;
  let falseAlarms = 0;

  for (const word of allWords) {
    const lw = word.toLowerCase();
    const wasSeen = seenWords.has(lw);
    const marked = markedAsSeen.has(lw);

    if (wasSeen && marked) hits++;
    else if (wasSeen && !marked) misses++;
    else if (!wasSeen && marked) falseAlarms++;
    else correctRejections++;
  }

  return {
    hits,
    correctRejections,
    misses,
    falseAlarms,
    total: allWords.length,
  };
}

// ---------- Scoring ----------

export function calcScore(
  correct: number,
  total: number,
  intrusions: number,
  perseverations: number,
  difficulty: Difficulty,
  orderCorrect: number = 0,
  orderTotal: number = 0,
): number {
  let score = correct * 10;
  // Intrusion penalty
  score -= intrusions * 3;
  // Perseveration penalty
  score -= perseverations * 2;
  // Difficulty bonus
  const diffBonus: Record<Difficulty, number> = {
    facil: 0,
    medio: 5,
    dificil: 10,
    especialista: 15,
  };
  score += correct * diffBonus[difficulty];
  // Order bonus
  if (orderTotal > 0 && orderCorrect === orderTotal) {
    score += 20;
  }
  return Math.max(0, score);
}

// ---------- Hidden category analysis ----------

export function analyzeHiddenCategory(
  typedWords: string[],
  problem: RecallProblem,
): { hiddenRecall: number; scatteredRecall: number; hiddenTotal: number; scatteredTotal: number } {
  if (!problem.hiddenCategory) {
    return { hiddenRecall: 0, scatteredRecall: 0, hiddenTotal: 0, scatteredTotal: 0 };
  }

  const hiddenWords = problem.words
    .filter((w) => w.categoria === problem.hiddenCategory)
    .map((w) => w.palavra.toLowerCase());
  const scatteredWords = problem.words
    .filter((w) => w.categoria !== problem.hiddenCategory)
    .map((w) => w.palavra.toLowerCase());

  const typed = new Set(typedWords.map((w) => w.trim().toLowerCase()));

  const hiddenRecall = hiddenWords.filter((w) => typed.has(w)).length;
  const scatteredRecall = scatteredWords.filter((w) => typed.has(w)).length;

  return {
    hiddenRecall,
    scatteredRecall,
    hiddenTotal: hiddenWords.length,
    scatteredTotal: scatteredWords.length,
  };
}

// ---------- Distractor task (reuses cálculo mental engine) ----------

export function generateDistractorProblems(count: number): { display: string; answer: number }[] {
  const problems: { display: string; answer: number }[] = [];
  for (let i = 0; i < count; i++) {
    const a = randInt(1, 20);
    const b = randInt(1, 20);
    const ops = ["+", "-", "×"] as const;
    const op = pick(ops);
    let display: string;
    let answer: number;
    switch (op) {
      case "+": display = `${a} + ${b}`; answer = a + b; break;
      case "-": display = `${Math.max(a, b)} - ${Math.min(a, b)}`; answer = Math.abs(a - b); break;
      case "×": display = `${a} × ${b}`; answer = a * b; break;
    }
    problems.push({ display, answer });
  }
  return problems;
}

export { DISTRACTOR_DURATION_MS, CATEGORIES };
