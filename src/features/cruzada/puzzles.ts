import type { Cell, Level, Op, Puzzle } from "./types";
import { templates as allTemplates, type Template } from "./templates";

// ── Template types ──────────────────────────────────────────────────────────

interface Template {
  id: string;
  difficulty: "facil" | "medio" | "dificil" | "especialista";
  rows: number;
  cols: number;
  equation_count: number;
  grid: string[];
}

const templates: Template[] = allTemplates;

const DIFFICULTY_TO_LEVEL: Record<Template["difficulty"], Level> = {
  facil: "easy",
  medio: "medium",
  dificil: "hard",
  especialista: "expert",
};

const LEVEL_TO_DIFFICULTY: Record<Level, Template["difficulty"]> = {
  easy: "facil",
  medium: "medio",
  hard: "dificil",
  expert: "especialista",
};

// ── Equation extraction ─────────────────────────────────────────────────────

interface Equation {
  cells: { row: number; col: number }[];
  // cells[0..k-1] are numbers, interleaved with ops, ending with = result
  numPositions: { row: number; col: number }[];
  ops: Op[];
  resultPos: { row: number; col: number };
}

function parseTemplate(t: Template): { cells: Cell[][]; equations: Equation[] } {
  const cells: Cell[][] = [];
  for (let r = 0; r < t.rows; r++) {
    const row: Cell[] = [];
    const line = t.grid[r] ?? "";
    for (let c = 0; c < t.cols; c++) {
      const ch = line[c] ?? ".";
      if (ch === ".") row.push({ kind: "empty" });
      else if (ch === "N") row.push({ kind: "fixed", value: 0 }); // placeholder, solver fills
      else if (ch === "+") row.push({ kind: "op", op: "+" });
      else if (ch === "-") row.push({ kind: "op", op: "-" });
      else if (ch === "*") row.push({ kind: "op", op: "*" });
      else if (ch === "/") row.push({ kind: "op", op: "/" });
      else if (ch === "=") row.push({ kind: "equals" });
      else row.push({ kind: "empty" });
    }
    cells.push(row);
  }

  const equations = extractEquations(cells, t.rows, t.cols);
  return { cells, equations };
}

function extractEquations(cells: Cell[][], rows: number, cols: number): Equation[] {
  const eqs: Equation[] = [];

  // Horizontal equations
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      if (cells[r]![c]!.kind === "fixed" || cells[r]![c]!.kind === "blank") {
        const eq = scanEquation(cells, r, c, 0, 1, rows, cols);
        if (eq) {
          eqs.push(eq);
          c = eq.cells[eq.cells.length - 1]!.col + 1;
        } else {
          c++;
        }
      } else {
        c++;
      }
    }
  }

  // Vertical equations
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      if (cells[r]![c]!.kind === "fixed" || cells[r]![c]!.kind === "blank") {
        const eq = scanEquation(cells, r, c, 1, 0, rows, cols);
        if (eq) {
          eqs.push(eq);
          r = eq.cells[eq.cells.length - 1]!.row + 1;
        } else {
          r++;
        }
      } else {
        r++;
      }
    }
  }

  return eqs;
}

function scanEquation(
  cells: Cell[][],
  startR: number,
  startC: number,
  dr: number,
  dc: number,
  rows: number,
  cols: number,
): Equation | null {
  const numPositions: { row: number; col: number }[] = [];
  const ops: Op[] = [];
  const allCells: { row: number; col: number }[] = [];
  let r = startR;
  let c = startC;
  let expectNum = true;
  let hasEquals = false;
  let resultPos: { row: number; col: number } | null = null;

  while (r >= 0 && r < rows && c >= 0 && c < cols) {
    const cell = cells[r]![c]!;
    if (cell.kind === "empty") break;

    allCells.push({ row: r, col: c });

    if (expectNum) {
      if (cell.kind === "fixed" || cell.kind === "blank") {
        numPositions.push({ row: r, col: c });
        expectNum = false;
      } else {
        break;
      }
    } else {
      if (cell.kind === "op") {
        ops.push(cell.op);
        expectNum = true;
      } else if (cell.kind === "equals") {
        hasEquals = true;
      } else {
        break;
      }
    }

    r += dr;
    c += dc;
  }

  if (!hasEquals || numPositions.length < 2 || !resultPos) {
    // resultPos is the last number after =
    // Re-scan: the last number in the sequence is the result
    if (numPositions.length >= 2) {
      resultPos = numPositions[numPositions.length - 1]!;
    } else {
      return null;
    }
  }

  // The result is the last number position; ops are between the non-result numbers
  const actualOps = ops.slice(0, numPositions.length - 2);
  const actualNums = numPositions.slice(0, numPositions.length - 1);
  resultPos = numPositions[numPositions.length - 1]!;

  if (actualNums.length < 1 || actualOps.length !== actualNums.length - 1) return null;

  return {
    cells: allCells,
    numPositions,
    ops: actualOps,
    resultPos,
  };
}

// ── Solver ──────────────────────────────────────────────────────────────────

function evalExpr(
  nums: number[],
  ops: Op[],
  leftToRight: boolean,
): number | null {
  if (nums.length === 0) return null;

  if (leftToRight) {
    let acc = nums[0]!;
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i]!;
      const n = nums[i + 1]!;
      if (op === "+") acc += n;
      else if (op === "-") acc -= n;
      else if (op === "*") acc *= n;
      else if (op === "/") {
        if (n === 0 || acc % n !== 0) return null;
        acc = acc / n;
      }
    }
    return acc;
  }

  // Standard precedence
  const vals = [...nums];
  const opsArr = [...ops];
  // Pass 1: * and /
  for (let i = 0; i < opsArr.length; ) {
    const op = opsArr[i]!;
    if (op === "*" || op === "/") {
      const a = vals[i]!;
      const b = vals[i + 1]!;
      let v: number;
      if (op === "*") v = a * b;
      else {
        if (b === 0 || a % b !== 0) return null;
        v = a / b;
      }
      vals.splice(i, 2, v);
      opsArr.splice(i, 1);
    } else {
      i++;
    }
  }
  // Pass 2: + and -
  let acc = vals[0]!;
  for (let i = 0; i < opsArr.length; i++) {
    const op = opsArr[i]!;
    if (op === "+") acc += vals[i + 1]!;
    else if (op === "-") acc -= vals[i + 1]!;
    else return null;
  }
  return acc;
}

interface SolverState {
  numValues: Map<string, number>; // "r,c" -> value
  numPositions: { row: number; col: number }[];
  equations: Equation[];
  leftToRight: boolean;
}

function posKey(r: number, c: number): string {
  return `${r},${c}`;
}

function solveBacktrack(
  state: SolverState,
  idx: number,
  maxDigits: number,
): boolean {
  if (idx >= state.numPositions.length) {
    // Check all equations
    for (const eq of state.equations) {
      const nums = eq.numPositions.map((p) => state.numValues.get(posKey(p.row, p.col)));
      if (nums.some((n) => n === undefined)) return false;
      const result = nums[nums.length - 1]!;
      const lhs = nums.slice(0, nums.length - 1)!;
      const val = evalExpr(lhs, eq.ops, state.leftToRight);
      if (val === null || val !== result) return false;
    }
    return true;
  }

  const pos = state.numPositions[idx]!;
  const key = posKey(pos.row, pos.col);

  // If already assigned (intersection), skip
  if (state.numValues.has(key)) {
    return solveBacktrack(state, idx + 1, maxDigits);
  }

  // Try values 1..maxDigits
  const candidates = shuffledCandidates(maxDigits);

  for (const v of candidates) {
    state.numValues.set(key, v);

    // Early check: verify all fully-assigned equations
    if (allAssignedEquationsValid(state)) {
      if (solveBacktrack(state, idx + 1, maxDigits)) return true;
    }

    state.numValues.delete(key);
  }

  return false;
}

function allAssignedEquationsValid(state: SolverState): boolean {
  for (const eq of state.equations) {
    const nums = eq.numPositions.map((p) => state.numValues.get(posKey(p.row, p.col)));
    if (nums.some((n) => n === undefined)) continue; // not fully assigned yet
    const result = nums[nums.length - 1]!;
    const lhs = nums.slice(0, nums.length - 1)!;
    const val = evalExpr(lhs, eq.ops, state.leftToRight);
    if (val === null || val !== result) return false;
  }
  return true;
}

function shuffledCandidates(maxDigits: number): number[] {
  const arr = Array.from({ length: maxDigits }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

// ── Puzzle generation ───────────────────────────────────────────────────────

const LEVEL_DIGITS: Record<Level, number> = {
  easy: 9,
  medium: 9,
  hard: 12,
  expert: 15,
};

const LEVEL_BLANK_RATIO: Record<Level, number> = {
  easy: 0.35, // 35% of N cells are blank
  medium: 0.5,
  hard: 0.6,
  expert: 0.7,
};

const LEVEL_NAMES: Record<Level, string[]> = {
  easy: ["Soma Simples", "Cruz de Números", "Subtração Cruzada", "Soma Dupla", "Cruz Pequena"],
  medium: ["Cruz Média", "Malha Dupla", "Teia de Soma", "Grade Média", "Cruzada Mista"],
  hard: ["Grande Cruz", "Teia Difícil", "Malha Densa", "Cruzada Complexa"],
  expert: ["Teia Especialista", "Malha Extrema", "Cruzada Mestra"],
};

function generatePuzzle(level: Level): Puzzle {
  const difficulty = LEVEL_TO_DIFFICULTY[level];
  const pool = templates.filter((t) => t.difficulty === difficulty);
  const template = pool[Math.floor(Math.random() * pool.length)]!;

  const { cells, equations } = parseTemplate(template);

  // Collect all N positions
  const numPositions: { row: number; col: number }[] = [];
  for (let r = 0; r < template.rows; r++) {
    for (let c = 0; c < template.cols; c++) {
      if (cells[r]![c]!.kind === "fixed") {
        numPositions.push({ row: r, col: c });
      }
    }
  }

  const leftToRight = level === "easy" || level === "medium";
  const maxDigits = LEVEL_DIGITS[level];

  // Run solver with retries
  let solved = false;
  let attempts = 0;
  const maxAttempts = 5;

  while (!solved && attempts < maxAttempts) {
    const state: SolverState = {
      numValues: new Map(),
      numPositions,
      equations,
      leftToRight,
    };

    if (solveBacktrack(state, 0, maxDigits)) {
      // Write values into cells
      for (const pos of numPositions) {
        const val = state.numValues.get(posKey(pos.row, pos.col))!;
        cells[pos.row]![pos.col] = { kind: "fixed", value: val };
      }

      // Decide which cells become blanks
      const blankCount = Math.max(1, Math.floor(numPositions.length * LEVEL_BLANK_RATIO[level]));
      const shuffled = [...numPositions].sort(() => Math.random() - 0.5);
      const blankSet = new Set(shuffled.slice(0, blankCount).map((p) => posKey(p.row, p.col)));

      for (const pos of numPositions) {
        const key = posKey(pos.row, pos.col);
        const cell = cells[pos.row]![pos.col]!;
        if (cell.kind === "fixed" && blankSet.has(key)) {
          cells[pos.row]![pos.col] = { kind: "blank", solution: cell.value };
        }
      }

      solved = true;
    }
    attempts++;
  }

  // Fallback: if solver fails (shouldn't happen), use first template with simple values
  if (!solved) {
    // Assign all 1s as a last resort (will still be structurally valid)
    for (const pos of numPositions) {
      cells[pos.row]![pos.col] = { kind: "fixed", value: 1 };
    }
  }

  const name = LEVEL_NAMES[level][Math.floor(Math.random() * LEVEL_NAMES[level]!.length)]!;

  return {
    id: `${template.id}-${Date.now()}`,
    name,
    level,
    rows: template.rows,
    cols: template.cols,
    leftToRight,
    cells,
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

export function generatePuzzleByLevel(level: Level): Puzzle {
  return generatePuzzle(level);
}

export function generatePuzzleByTemplateId(templateId: string, level: Level): Puzzle {
  const template = templates.find((t) => t.id === templateId);
  if (!template) return generatePuzzle(level);

  // Same as generatePuzzle but with specific template
  const difficulty = LEVEL_TO_DIFFICULTY[level];
  const { cells, equations } = parseTemplate(template);
  const numPositions: { row: number; col: number }[] = [];
  for (let r = 0; r < template.rows; r++) {
    for (let c = 0; c < template.cols; c++) {
      if (cells[r]![c]!.kind === "fixed") {
        numPositions.push({ row: r, col: c });
      }
    }
  }

  const leftToRight = level === "easy" || level === "medium";
  const maxDigits = LEVEL_DIGITS[level];
  let solved = false;
  let attempts = 0;
  while (!solved && attempts < 5) {
    const state: SolverState = {
      numValues: new Map(),
      numPositions,
      equations,
      leftToRight,
    };
    if (solveBacktrack(state, 0, maxDigits)) {
      for (const pos of numPositions) {
        const val = state.numValues.get(posKey(pos.row, pos.col))!;
        cells[pos.row]![pos.col] = { kind: "fixed", value: val };
      }
      const blankCount = Math.max(1, Math.floor(numPositions.length * LEVEL_BLANK_RATIO[level]));
      const shuffled = [...numPositions].sort(() => Math.random() - 0.5);
      const blankSet = new Set(shuffled.slice(0, blankCount).map((p) => posKey(p.row, p.col)));
      for (const pos of numPositions) {
        const key = posKey(pos.row, pos.col);
        const cell = cells[pos.row]![pos.col]!;
        if (cell.kind === "fixed" && blankSet.has(key)) {
          cells[pos.row]![pos.col] = { kind: "blank", solution: cell.value };
        }
      }
      solved = true;
    }
    attempts++;
  }
  if (!solved) {
    for (const pos of numPositions) {
      cells[pos.row]![pos.col] = { kind: "fixed", value: 1 };
    }
  }

  return {
    id: `${template.id}-${Date.now()}`,
    name: template.id,
    level,
    rows: template.rows,
    cols: template.cols,
    leftToRight,
    cells,
  };
}

export const TEMPLATE_COUNT = templates.length;

export function templateCountByLevel(level: Level): number {
  return templates.filter((t) => t.difficulty === LEVEL_TO_DIFFICULTY[level]).length;
}

// ── Legacy compat (for any code still using PUZZLES) ─────────────────────────
// Generate a few static puzzles for backward compat
export const PUZZLES: Puzzle[] = [
  generatePuzzle("easy"),
  generatePuzzle("medium"),
  generatePuzzle("hard"),
];

export function puzzleById(_id: string): Puzzle | undefined {
  return undefined; // Dynamic generation replaces static lookup
}

export function gerarTabuleiro(level?: Level): Puzzle {
  return generatePuzzle(level ?? "easy");
}
