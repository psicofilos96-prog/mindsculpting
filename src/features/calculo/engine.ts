import {
  LEVEL_CONFIG,
  type Level,
  type Operator,
  type Problem,
} from "./types";

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]!;
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

// Generate a number with [minDigits, maxDigits] digits
function genNumber(minDigits: number, maxDigits: number, allowNegative = false): number {
  const digits = randInt(minDigits, maxDigits);
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  const n = randInt(min, max);
  if (allowNegative && Math.random() < 0.2) return -n;
  return n;
}

// Generate an exact division: pick divisor, compute dividend = divisor * quotient
function genExactDivision(minDigits: number, maxDigits: number): { a: number; b: number } {
  // 'a' is the dividend, 'b' is the divisor
  // quotient has 1-2 digits, divisor has minDigits..maxDigits
  const quotient = randInt(2, 12);
  const divisorDigits = randInt(minDigits, maxDigits);
  const divisor = randInt(Math.max(2, Math.pow(10, divisorDigits - 1)), Math.pow(10, divisorDigits) - 1);
  const dividend = divisor * quotient;
  return { a: dividend, b: divisor };
}

// ---------- Simple single-operation problem ----------

function genSimpleProblem(level: Level): Problem {
  const cfg = LEVEL_CONFIG[level];
  const op = cfg.ops.length === 1 ? cfg.ops[0]! : pick(cfg.ops);
  const [minD, maxD] = cfg.digits;

  let display: string;
  let answer: number;

  switch (op) {
    case "+": {
      const a = genNumber(minD, maxD);
      const b = genNumber(minD, maxD);
      display = `${a} + ${b}`;
      answer = a + b;
      break;
    }
    case "-": {
      let a = genNumber(minD, maxD);
      let b = genNumber(minD, maxD);
      // For non-Einstein levels, keep result non-negative
      if (level !== "einstein" && b > a) [a, b] = [b, a];
      display = `${a} - ${b}`;
      answer = a - b;
      break;
    }
    case "×": {
      const a = genNumber(minD, maxD);
      const b = genNumber(minD, maxD);
      display = `${a} × ${b}`;
      answer = a * b;
      break;
    }
    case "÷": {
      const { a, b } = genExactDivision(minD, maxD);
      display = `${a} ÷ ${b}`;
      answer = a / b;
      break;
    }
    default:
      display = "0";
      answer = 0;
  }

  const choices = buildChoices(answer);
  return { display, answer, choices };
}

// ---------- Einstein multi-operation problem ----------

function genEinsteinProblem(): Problem {
  const cfg = LEVEL_CONFIG.einstein;
  const useParentheses = cfg.parentheses && Math.random() < 0.3;
  const numOps = randInt(2, 3);
  const ops: Operator[] = [];

  for (let i = 0; i < numOps; i++) {
    ops.push(pick(cfg.ops));
  }

  // Generate numbers — cap at 1-3 digits to keep expressions and answers
  // within the display. Multiplication operands capped at 2 digits to avoid
  // products exceeding 5 digits.
  const numbers: number[] = [];
  for (let i = 0; i <= numOps; i++) {
    const op = ops[Math.min(i, ops.length - 1)]!;
    const isMult = op === "×" || (i < ops.length && ops[i] === "×");
    const maxDigits = isMult ? 2 : 3;
    numbers.push(genNumber(1, maxDigits, cfg.allowNegative ?? false));
  }

  // Build expression respecting operator precedence
  let display: string;
  let answer: number;

  if (useParentheses && numOps >= 2) {
    // (a op b) op c [op d]
    const [a, b, c, d] = numbers;
    const op1 = ops[0]!;
    const op2 = ops[1]!;
    const inner = applyOp(a, b, op1);
    if (numOps === 2) {
      display = `(${a} ${op1} ${b}) ${op2} ${c}`;
      answer = applyOp(inner, c, op2);
    } else {
      const op3 = ops[2]!;
      display = `(${a} ${op1} ${b}) ${op2} ${c} ${op3} ${d}`;
      // Evaluate with precedence: inner first, then op2 vs op3
      const afterInner = inner;
      const result = evalWithPrecedence(afterInner, op2, c, op3, d);
      answer = result;
    }
  } else {
    // a op1 b op2 c [op3 d] — evaluate with precedence
    const [a, b, c, d] = numbers;
    if (numOps === 2) {
      const op1 = ops[0]!;
      const op2 = ops[1]!;
      display = `${a} ${op1} ${b} ${op2} ${c}`;
      answer = evalWithPrecedence(a, op1, b, op2, c);
    } else {
      const op1 = ops[0]!;
      const op2 = ops[1]!;
      const op3 = ops[2]!;
      display = `${a} ${op1} ${b} ${op2} ${c} ${op3} ${d}`;
      answer = evalWithPrecedence3(a, op1, b, op2, c, op3, d);
    }
  }

  // Avoid trivially simple answers
  if (Math.abs(answer) < 2) {
    return genEinsteinProblem();
  }

  const choices = buildChoices(answer);
  return { display, answer, choices };
}

function applyOp(a: number, b: number, op: Operator): number {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "×": return a * b;
    case "÷": return b !== 0 ? a / b : 0;
  }
}

// Evaluate a op1 b op2 c with correct precedence (× ÷ before + -)
function evalWithPrecedence(a: number, op1: Operator, b: number, op2: Operator, c: number): number {
  const op1Prec = op1 === "×" || op1 === "÷";
  const op2Prec = op2 === "×" || op2 === "÷";
  if (op1Prec >= op2Prec) {
    const mid = applyOp(a, b, op1);
    return applyOp(mid, c, op2);
  }
  const mid = applyOp(b, c, op2);
  return applyOp(a, mid, op1);
}

function evalWithPrecedence3(
  a: number, op1: Operator, b: number, op2: Operator, c: number, op3: Operator, d: number,
): number {
  // Left-to-right with precedence: first resolve ×/÷ segments
  // Simple approach: evaluate left to right but prioritize ×/÷
  const op1Prec = op1 === "×" || op1 === "÷";
  const op2Prec = op2 === "×" || op2 === "÷";
  const op3Prec = op3 === "×" || op3 === "÷";

  let nums = [a, b, c, d];
  let ops = [op1, op2, op3];

  // First pass: handle × and ÷ left to right
  for (let i = 0; i < ops.length; ) {
    if (ops[i] === "×" || ops[i] === "÷") {
      nums[i] = applyOp(nums[i]!, nums[i + 1]!, ops[i]!);
      nums.splice(i + 1, 1);
      ops.splice(i, 1);
    } else {
      i++;
    }
  }
  // Second pass: handle + and - left to right
  let result = nums[0]!;
  for (let i = 0; i < ops.length; i++) {
    result = applyOp(result, nums[i + 1]!, ops[i]!);
  }
  return result;
}

// ---------- Multiple choice distractors ----------

function buildChoices(answer: number): number[] {
  const set = new Set<number>([answer]);
  set.add(answer + 1);
  set.add(answer - 1);
  const mag = Math.max(2, Math.round(Math.abs(answer) * 0.1) || 2);
  set.add(answer + mag);
  set.add(answer - mag);
  set.add(answer + 2);
  set.add(answer - 2);

  const arr = [...set].filter((n) => Number.isFinite(n) && Number.isInteger(n));
  const picked = shuffle(arr.filter((n) => n !== answer)).slice(0, 4);
  const result = shuffle([answer, ...picked]);
  while (result.length < 5) {
    const c = answer + randInt(-15, 15);
    if (!result.includes(c)) result.push(c);
  }
  return result;
}

// ---------- Main generator ----------

let lastProblem: Problem | null = null;

export function generateProblem(level: Level): Problem {
  let problem: Problem;
  let tries = 0;
  do {
    problem = level === "einstein" ? genEinsteinProblem() : genSimpleProblem(level);
    tries++;
  } while (lastProblem && problem.display === lastProblem.display && tries < 5);
  lastProblem = problem;
  return problem;
}

// ---------- Daily challenge ----------

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDailyProblems(level: Level, count: number, date: Date): Problem[] {
  const seed =
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const rng = mulberry32(seed);
  const problems: Problem[] = [];
  for (let i = 0; i < count; i++) {
    // Use rng to influence generation
    const r = rng();
    const problem = level === "einstein" ? genEinsteinProblemSeeded(rng) : genSimpleProblemSeeded(level, rng);
    problems.push(problem);
    void r;
  }
  return problems;
}

function genSimpleProblemSeeded(level: Level, rng: () => number): Problem {
  const cfg = LEVEL_CONFIG[level];
  const op = cfg.ops.length === 1 ? cfg.ops[0]! : cfg.ops[Math.floor(rng() * cfg.ops.length)]!;
  const [minD, maxD] = cfg.digits;
  const ri = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

  let display: string;
  let answer: number;
  switch (op) {
    case "+": {
      const a = ri(Math.pow(10, minD - 1), Math.pow(10, maxD) - 1);
      const b = ri(Math.pow(10, minD - 1), Math.pow(10, maxD) - 1);
      display = `${a} + ${b}`;
      answer = a + b;
      break;
    }
    case "-": {
      let a = ri(Math.pow(10, minD - 1), Math.pow(10, maxD) - 1);
      let b = ri(Math.pow(10, minD - 1), Math.pow(10, maxD) - 1);
      if (b > a) [a, b] = [b, a];
      display = `${a} - ${b}`;
      answer = a - b;
      break;
    }
    case "×": {
      const a = ri(Math.pow(10, minD - 1), Math.pow(10, maxD) - 1);
      const b = ri(Math.pow(10, minD - 1), Math.pow(10, maxD) - 1);
      display = `${a} × ${b}`;
      answer = a * b;
      break;
    }
    case "÷": {
      const quotient = ri(2, 12);
      const divisor = ri(2, Math.pow(10, maxD) - 1);
      const dividend = divisor * quotient;
      display = `${dividend} ÷ ${divisor}`;
      answer = dividend / divisor;
      break;
    }
    default:
      display = "0";
      answer = 0;
  }
  return { display, answer, choices: buildChoices(answer) };
}

function genEinsteinProblemSeeded(rng: () => number): Problem {
  // Simplified seeded version: 2-op expression without parentheses
  const cfg = LEVEL_CONFIG.einstein;
  const ri = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
  const ops: Operator[] = cfg.ops;
  const numOps = 2 + Math.floor(rng() * 2); // 2 or 3
  const numbers: number[] = [];
  for (let i = 0; i <= numOps; i++) {
    const op = ops[Math.min(i, ops.length - 1)]!;
    const isMult = op === "×";
    const maxDigits = isMult ? 2 : 3;
    numbers.push(ri(1, Math.pow(10, maxDigits) - 1));
  }
  const o: Operator[] = [];
  for (let i = 0; i < numOps; i++) o.push(ops[Math.floor(rng() * ops.length)]!);

  let display: string;
  let answer: number;
  if (numOps === 2) {
    display = `${numbers[0]} ${o[0]} ${numbers[1]} ${o[1]} ${numbers[2]}`;
    answer = evalWithPrecedence(numbers[0]!, o[0]!, numbers[1]!, o[1]!, numbers[2]!);
  } else {
    display = `${numbers[0]} ${o[0]} ${numbers[1]} ${o[1]} ${numbers[2]} ${o[2]} ${numbers[3]}`;
    answer = evalWithPrecedence3(numbers[0]!, o[0]!, numbers[1]!, o[1]!, numbers[2]!, o[2]!, numbers[3]!);
  }
  return { display, answer, choices: buildChoices(answer) };
}

// ---------- Scoring ----------

export function calcScore(
  isCorrect: boolean,
  reactionMs: number,
  streak: number,
  level: Level,
): number {
  if (!isCorrect) return 0;
  let score = 10;
  // Speed bonus: faster = more
  if (reactionMs > 0 && reactionMs < 5000) {
    score += Math.round((5000 - reactionMs) / 200);
  }
  // Streak bonus
  if (streak >= 5) score += 5;
  if (streak >= 10) score += 5;
  if (streak >= 20) score += 10;
  // Level difficulty bonus
  const levelBonus: Record<Level, number> = {
    iniciante: 0,
    intermediario: 2,
    "mult-basica": 3,
    "mult-avancada": 5,
    "div-basica": 3,
    "div-avancada": 5,
    "misto-basico": 4,
    "misto-avancado": 7,
    einstein: 15,
  };
  score += levelBonus[level];
  return score;
}

// ---------- Error tracking ----------

export function extractOperator(display: string): Operator | null {
  if (display.includes("÷")) return "÷";
  if (display.includes("×")) return "×";
  if (display.includes("-")) return "-";
  if (display.includes("+")) return "+";
  return null;
}
