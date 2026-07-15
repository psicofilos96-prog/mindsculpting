import { LEVEL_CONFIG, type Level, type Operator, type Problem, type Step } from "./types";

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

function apply(acc: number, step: Step): number {
  switch (step.op) {
    case "+": return acc + step.value;
    case "-": return acc - step.value;
    case "×": return acc * step.value;
    case "÷": return acc / step.value;
  }
}

function computeAnswer(start: number, steps: Step[]): number {
  return steps.reduce((acc, s) => apply(acc, s), start);
}

// Gera um passo válido dado o acumulador atual e um operador desejado.
// Garante que resultado permaneça inteiro e dentro de faixa razoável.
function generateStep(acc: number, op: Operator, level: Level): Step {
  const maxAbs = level === "dificil" || level === "einstein" ? 9999 : 999;

  if (op === "+") {
    let v: number;
    do { v = randInt(2, level === "facil" ? 20 : 30); } while (Math.abs(acc + v) > maxAbs);
    return { op, value: v };
  }
  if (op === "-") {
    let v: number;
    do { v = randInt(2, level === "facil" ? 20 : 30); } while (Math.abs(acc - v) > maxAbs);
    return { op, value: v };
  }
  if (op === "×") {
    const factors = level === "einstein" ? [2, 3, 4, 5, 6, 7, 8, 9] : [2, 3, 4, 5, 6];
    let v = pick(factors);
    let tries = 0;
    while (Math.abs(acc * v) > maxAbs && tries++ < 10) v = pick(factors);
    if (Math.abs(acc * v) > maxAbs) return { op: "+", value: randInt(2, 9) };
    return { op, value: v };
  }
  // ÷ — precisa ser divisão exata
  const divisors: number[] = [];
  for (const d of [2, 3, 4, 5, 6, 7, 8, 9]) {
    if (acc !== 0 && Number.isInteger(acc / d) && Math.abs(acc / d) >= 1) divisors.push(d);
  }
  if (divisors.length === 0) return { op: "+", value: randInt(2, 9) };
  return { op, value: pick(divisors) };
}

export function generateProblem(level: Level): Problem {
  const cfg = LEVEL_CONFIG[level];
  const stepCount = randInt(cfg.steps[0], cfg.steps[1]);

  // start
  let start: number;
  if (level === "facil") start = randInt(5, 40);
  else if (level === "medio") start = randInt(3, 12);
  else if (level === "dificil") start = randInt(6, 60);
  else start = randInt(4, 24);

  const steps: Step[] = [];
  let acc = start;
  // Para os níveis com × e ÷ evitamos começar por ÷.
  for (let i = 0; i < stepCount; i++) {
    const availableOps = cfg.ops.filter((o) => !(i === 0 && o === "÷"));
    // Bias: em einstein/médio força pelo menos 1× e 1÷ quando aplicável
    let op = pick(availableOps);
    if (level === "einstein" && i === 1 && Math.random() < 0.5) op = "×";
    if (level === "dificil" && i === 2 && cfg.ops.includes("÷")) op = "÷";
    const step = generateStep(acc, op, level);
    steps.push(step);
    acc = apply(acc, step);
  }

  const answer = computeAnswer(start, steps);
  const choices = buildChoices(start, steps, answer);
  return { start, steps, answer, choices };
}

// Armadilhas plausíveis:
//  - inverter o sinal do último operando
//  - ignorar o último passo
//  - inverter uma subtração/divisão (a-b vs b-a via +)
//  - erro ±1 no resultado (fence-post)
function buildChoices(start: number, steps: Step[], answer: number): number[] {
  const set = new Set<number>([answer]);

  // 1) ignora último passo
  if (steps.length > 1) {
    set.add(steps.slice(0, -1).reduce((a, s) => applyStep(a, s), start));
  }
  // 2) sinal do último operando trocado
  const last = steps[steps.length - 1];
  if (last) {
    const flipped: Step = { ...last, op: flipOp(last.op) };
    const withFlipped = [...steps.slice(0, -1), flipped].reduce((a, s) => applyStep(a, s), start);
    set.add(withFlipped);
  }
  // 3) off-by-one
  set.add(answer + 1);
  set.add(answer - 1);
  // 4) pequeno desvio proporcional
  const magnitude = Math.max(2, Math.round(Math.abs(answer) * 0.1) || 2);
  set.add(answer + magnitude);
  set.add(answer - magnitude);

  const arr = [...set].filter((n) => Number.isFinite(n));
  // pega 5 (garante que a resposta esteja)
  const picked: number[] = [answer];
  const others = arr.filter((n) => n !== answer);
  shuffle(others);
  for (const v of others) {
    if (picked.length >= 5) break;
    if (!picked.includes(v)) picked.push(v);
  }
  // preenche se faltar
  while (picked.length < 5) {
    const candidate = answer + randInt(-15, 15);
    if (!picked.includes(candidate)) picked.push(candidate);
  }
  shuffle(picked);
  return picked;
}

function applyStep(acc: number, s: Step): number {
  switch (s.op) {
    case "+": return acc + s.value;
    case "-": return acc - s.value;
    case "×": return acc * s.value;
    case "÷": return acc / s.value;
  }
}

function flipOp(op: Operator): Operator {
  if (op === "+") return "-";
  if (op === "-") return "+";
  if (op === "×") return "÷";
  return "×";
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

export function formatStep(step: Step): string {
  return `${step.op} ${step.value}`;
}
