import {
  DIGIT_POOL,
  LETTER_POOL,
  type MemoriaAlphabet,
  type MemoriaMode,
  type MemoriaProblem,
} from "./types";

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function alphabetPool(alphabet: MemoriaAlphabet): readonly string[] {
  if (alphabet === "digits") return DIGIT_POOL;
  if (alphabet === "letters") return LETTER_POOL;
  return [...DIGIT_POOL, ...LETTER_POOL];
}


export function generateSequence(alphabet: MemoriaAlphabet, length: number): string[] {
  const pool = alphabetPool(alphabet);
  const seq: string[] = [];
  let last = "";
  for (let i = 0; i < length; i++) {
    let sym: string;
    let tries = 0;
    do {
      sym = pool[randInt(0, pool.length - 1)]!;
      tries++;
    } while (sym === last && tries < 6);
    seq.push(sym);
    last = sym;
  }
  return seq;
}

export function generateProblem(
  mode: MemoriaMode,
  alphabet: MemoriaAlphabet,
  length: number,
): MemoriaProblem {
  const sequence = generateSequence(alphabet, length);
  const pool = alphabetPool(alphabet);

  let askIndex = 0;
  let choices: string[] = [];

  if (mode === "position") {
    askIndex = randInt(0, sequence.length - 1);
    const correct = sequence[askIndex]!;
    const distractors = shuffle(pool.filter((s) => s !== correct).slice()).slice(0, 4);
    choices = shuffle([correct, ...distractors]);
  } else {
    // "tap" input needs the full pool as choices (grid)
    choices = pool.slice();
  }

  return { sequence, mode, alphabet, askIndex, choices };
}

export function expectedAnswer(problem: MemoriaProblem): string[] {
  if (problem.mode === "reverse") return [...problem.sequence].reverse();
  if (problem.mode === "position") return [problem.sequence[problem.askIndex]!];
  return problem.sequence;
}

export function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
