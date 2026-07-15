export type RuleDifficulty = "easy" | "hard";

export interface Rule {
  id: string;
  text: string;
  difficulty: RuleDifficulty;
  /** Range de números que podem ser sorteados para esta regra */
  range: [number, number];
  apply: (n: number) => number;
}

export interface RegraConfig {
  difficulty: RuleDifficulty;
  count: 8 | 12 | 15;
  /** Tempo máximo (ms) para o usuário responder cada número */
  timeoutMs: number;
}

export interface RegraStats {
  sessions: number;
  totalAnswers: number;
  totalCorrect: number;
  bestStreak: number;
}

export const DEFAULT_CONFIG: RegraConfig = {
  difficulty: "easy",
  count: 12,
  timeoutMs: 4000,
};

export const COUNT_OPTIONS = [8, 12, 15] as const;
export const TIMEOUT_OPTIONS = [3000, 4000, 5000, 6000] as const;

// ---------- Regras ----------

export const RULES: Rule[] = [
  // fáceis (uma condição)
  {
    id: "even-plus2-odd-minus1",
    text: "Se o número for par, some 2. Se for ímpar, subtraia 1.",
    difficulty: "easy",
    range: [1, 20],
    apply: (n) => (n % 2 === 0 ? n + 2 : n - 1),
  },
  {
    id: "gt5-double-else-plus3",
    text: "Se for maior que 5, multiplique por 2. Se for menor ou igual a 5, some 3.",
    difficulty: "easy",
    range: [1, 12],
    apply: (n) => (n > 5 ? n * 2 : n + 3),
  },
  {
    id: "even-half-odd-plus5",
    text: "Se for par, divida por 2. Se for ímpar, some 5.",
    difficulty: "easy",
    range: [1, 20],
    apply: (n) => (n % 2 === 0 ? n / 2 : n + 5),
  },
  {
    id: "gt10-minus4-else-times2",
    text: "Se for maior que 10, subtraia 4. Caso contrário, multiplique por 2.",
    difficulty: "easy",
    range: [1, 20],
    apply: (n) => (n > 10 ? n - 4 : n * 2),
  },

  // difíceis (duas condições encadeadas)
  {
    id: "last-even-double-odd-minus5",
    text: "Se terminar em dígito par, dobre. Se terminar em ímpar, subtraia 5. Depois, se o resultado for negativo, some 10.",
    difficulty: "hard",
    range: [10, 40],
    apply: (n) => {
      const last = n % 10;
      const step1 = last % 2 === 0 ? n * 2 : n - 5;
      return step1 < 0 ? step1 + 10 : step1;
    },
  },
  {
    id: "even-plus3-odd-times2-gt20-minus10",
    text: "Se for par, some 3; se for ímpar, multiplique por 2. Depois, se o resultado for maior que 20, subtraia 10.",
    difficulty: "hard",
    range: [1, 15],
    apply: (n) => {
      const step1 = n % 2 === 0 ? n + 3 : n * 2;
      return step1 > 20 ? step1 - 10 : step1;
    },
  },
  {
    id: "gt10-minus5-else-plus7-even-plus1",
    text: "Se for maior que 10, subtraia 5; senão, some 7. Depois, se o resultado for par, some 1.",
    difficulty: "hard",
    range: [1, 20],
    apply: (n) => {
      const step1 = n > 10 ? n - 5 : n + 7;
      return step1 % 2 === 0 ? step1 + 1 : step1;
    },
  },
  {
    id: "multiple3-times2-else-plus4-gt15-minus3",
    text: "Se for múltiplo de 3, multiplique por 2; senão, some 4. Depois, se o resultado for maior que 15, subtraia 3.",
    difficulty: "hard",
    range: [1, 15],
    apply: (n) => {
      const step1 = n % 3 === 0 ? n * 2 : n + 4;
      return step1 > 15 ? step1 - 3 : step1;
    },
  },
];

export function pickRule(difficulty: RuleDifficulty, prevId?: string): Rule {
  const pool = RULES.filter((r) => r.difficulty === difficulty);
  const filtered = pool.length > 1 && prevId ? pool.filter((r) => r.id !== prevId) : pool;
  return filtered[Math.floor(Math.random() * filtered.length)]!;
}

export function randomInRange(range: [number, number]): number {
  const [min, max] = range;
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Gera 4 opções de resposta, incluindo a correta, sem repetir. */
export function buildOptions(correct: number): number[] {
  const set = new Set<number>([correct]);
  const distractors: number[] = [];
  const candidates = [
    correct + 1,
    correct - 1,
    correct + 2,
    correct - 2,
    correct + 3,
    correct - 3,
    correct + 5,
    correct - 5,
    Math.round(correct / 2),
    correct * 2,
  ];
  for (const c of candidates) {
    if (!set.has(c)) {
      set.add(c);
      distractors.push(c);
      if (set.size >= 4) break;
    }
  }
  // fallback caso pouco material
  let fill = correct + 10;
  while (set.size < 4) {
    if (!set.has(fill)) {
      set.add(fill);
      distractors.push(fill);
    }
    fill++;
  }
  const all = [correct, ...distractors].slice(0, 4);
  // shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all;
}
