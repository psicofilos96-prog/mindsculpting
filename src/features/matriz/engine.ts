import type {
  Constraint,
  ConstraintType,
  Difficulty,
  GridSize,
  Hint,
  Puzzle,
} from "./types";
import { ROW_LABELS } from "./types";

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

// ── Latin Square generation ──────────────────────────────────────────────────

function generateLatinSquare(size: GridSize, rng: () => number): number[] {
  // Start with a base Latin square and shuffle rows/cols
  const base: number[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      base.push(((r + c) % size) + 1);
    }
  }

  // Shuffle rows
  const rowPerm = Array.from({ length: size }, (_, i) => i);
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rowPerm[i], rowPerm[j]] = [rowPerm[j]!, rowPerm[i]!];
  }

  // Shuffle cols
  const colPerm = Array.from({ length: size }, (_, i) => i);
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [colPerm[i], colPerm[j]] = [colPerm[j]!, colPerm[i]!];
  }

  // Apply permutations
  const result: number[] = new Array(size * size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const srcIdx = rowPerm[r]! * size + colPerm[c]!;
      const dstIdx = r * size + c;
      result[dstIdx] = base[srcIdx]!;
    }
  }

  return result;
}

// ── Row value convention ─────────────────────────────────────────────────────
//
// Each row A, B, C, ... is a variable. In v1 (arithmetic + order only), the
// "value" of a row variable is the value in the DIAGONAL cell of that row —
// i.e., row i, column i. This is unambiguous and makes constraints like
// A + B = C well-defined without needing the full N-digit number.
// This convention is documented here and used consistently by solver + generator.

function rowValue(grid: number[], row: number, size: number): number {
  return grid[row * size + row]!;
}

// ── Constraint evaluation ───────────────────────────────────────────────────

function evalConstraint(
  constraint: Constraint,
  grid: number[],
  size: number,
): boolean {
  const rows = constraint.rows;
  const getVal = (r: number) => rowValue(grid, r, size);

  switch (constraint.type) {
    case "sum": {
      const a = getVal(rows[0]!);
      const b = getVal(rows[1]!);
      const c = getVal(rows[2]!);
      return a + b === c;
    }
    case "diff": {
      const a = getVal(rows[0]!);
      const b = getVal(rows[1]!);
      const c = getVal(rows[2]!);
      return a - b === c;
    }
    case "prod": {
      const a = getVal(rows[0]!);
      const b = getVal(rows[1]!);
      const c = getVal(rows[2]!);
      return a * b === c;
    }
    case "quot": {
      const a = getVal(rows[0]!);
      const b = getVal(rows[1]!);
      const c = getVal(rows[2]!);
      return b !== 0 && a % b === 0 && a / b === c;
    }
    case "gt": return getVal(rows[0]!) > getVal(rows[1]!);
    case "lt": return getVal(rows[0]!) < getVal(rows[1]!);
    case "gte": return getVal(rows[0]!) >= getVal(rows[1]!);
    case "lte": return getVal(rows[0]!) <= getVal(rows[1]!);
    case "eq": return getVal(rows[0]!) === getVal(rows[1]!);
    case "neq": return getVal(rows[0]!) !== getVal(rows[1]!);
    case "gt_const": return getVal(rows[0]!) > constraint.constValue!;
    case "lt_const": return getVal(rows[0]!) < constraint.constValue!;
    case "gte_const": return getVal(rows[0]!) >= constraint.constValue!;
    case "lte_const": return getVal(rows[0]!) <= constraint.constValue!;
    case "eq_const": return getVal(rows[0]!) === constraint.constValue!;
    case "neq_const": return getVal(rows[0]!) !== constraint.constValue!;
    default: return true;
  }
}

/** Check if constraints can be evaluated (all referenced cells filled) */
function canEvalConstraint(constraint: Constraint, grid: number[], size: number): boolean {
  for (const r of constraint.rows) {
    if (grid[r * size + r] === 0) return false;
  }
  return true;
}

/** Check if a constraint is already violated (all cells filled and constraint fails) */
function isViolated(constraint: Constraint, grid: number[], size: number): boolean {
  if (!canEvalConstraint(constraint, grid, size)) return false;
  return !evalConstraint(constraint, grid, size);
}

// ── Solver (backtracking with pruning) ──────────────────────────────────────

/**
 * Finds all solutions to a partially-filled grid with given constraints.
 * Stops early if maxSolutions found.
 * Returns array of solution grids.
 */
export function solveGrid(
  partial: number[],
  size: number,
  constraints: Constraint[],
  maxSolutions: number = 2,
): number[][] {
  const solutions: number[][] = [];
  const grid = [...partial];

  // Find empty cells (value = 0)
  const emptyCells: { row: number; col: number; idx: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;
      if (grid[idx] === 0) {
        emptyCells.push({ row: r, col: c, idx });
      }
    }
  }

  function isValid(idx: number, val: number): boolean {
    const row = Math.floor(idx / size);
    const col = idx % size;

    // Row check
    for (let c = 0; c < size; c++) {
      if (c !== col && grid[row * size + c] === val) return false;
    }
    // Col check
    for (let r = 0; r < size; r++) {
      if (r !== row && grid[r * size + col] === val) return false;
    }

    // Temporarily set for constraint check
    grid[idx] = val;
    let constraintsOk = true;
    for (const con of constraints) {
      if (canEvalConstraint(con, grid, size) && !evalConstraint(con, grid, size)) {
        constraintsOk = false;
        break;
      }
    }
    grid[idx] = 0;
    return constraintsOk;
  }

  function backtrack(depth: number): boolean {
    if (solutions.length >= maxSolutions) return true;

    if (depth >= emptyCells.length) {
      solutions.push([...grid]);
      return solutions.length >= maxSolutions;
    }

    const cell = emptyCells[depth]!;
    for (let val = 1; val <= size; val++) {
      if (isValid(cell.idx, val)) {
        grid[cell.idx] = val;
        backtrack(depth + 1);
        grid[cell.idx] = 0;
        if (solutions.length >= maxSolutions) return true;
      }
    }
    return false;
  }

  backtrack(0);
  return solutions;
}

/** Check if a partial grid + constraints has a unique solution */
function hasUniqueSolution(
  partial: number[],
  size: number,
  constraints: Constraint[],
): boolean {
  const sols = solveGrid(partial, size, constraints, 2);
  return sols.length === 1;
}

// ── Constraint generation ───────────────────────────────────────────────────

function rowLabel(row: number): string {
  return ROW_LABELS[row]!;
}

function makeConstraint(
  type: ConstraintType,
  rows: number[],
  constValue?: number,
): Constraint {
  const id = `${type}-${rows.join(",")}-${constValue ?? ""}`;
  let label = "";

  switch (type) {
    case "sum":
      label = `${rowLabel(rows[0]!)} + ${rowLabel(rows[1]!)} = ${rowLabel(rows[2]!)}`;
      break;
    case "diff":
      label = `${rowLabel(rows[0]!)} − ${rowLabel(rows[1]!)} = ${rowLabel(rows[2]!)}`;
      break;
    case "prod":
      label = `${rowLabel(rows[0]!)} × ${rowLabel(rows[1]!)} = ${rowLabel(rows[2]!)}`;
      break;
    case "quot":
      label = `${rowLabel(rows[0]!)} ÷ ${rowLabel(rows[1]!)} = ${rowLabel(rows[2]!)}`;
      break;
    case "gt":
      label = `${rowLabel(rows[0]!)} > ${rowLabel(rows[1]!)}`;
      break;
    case "lt":
      label = `${rowLabel(rows[0]!)} < ${rowLabel(rows[1]!)}`;
      break;
    case "gte":
      label = `${rowLabel(rows[0]!)} ≥ ${rowLabel(rows[1]!)}`;
      break;
    case "lte":
      label = `${rowLabel(rows[0]!)} ≤ ${rowLabel(rows[1]!)}`;
      break;
    case "eq":
      label = `${rowLabel(rows[0]!)} = ${rowLabel(rows[1]!)}`;
      break;
    case "neq":
      label = `${rowLabel(rows[0]!)} ≠ ${rowLabel(rows[1]!)}`;
      break;
    case "gt_const":
      label = `${rowLabel(rows[0]!)} > ${constValue}`;
      break;
    case "lt_const":
      label = `${rowLabel(rows[0]!)} < ${constValue}`;
      break;
    case "gte_const":
      label = `${rowLabel(rows[0]!)} ≥ ${constValue}`;
      break;
    case "lte_const":
      label = `${rowLabel(rows[0]!)} ≤ ${constValue}`;
      break;
    case "eq_const":
      label = `${rowLabel(rows[0]!)} = ${constValue}`;
      break;
    case "neq_const":
      label = `${rowLabel(rows[0]!)} ≠ ${constValue}`;
      break;
  }

  return { id, type, rows, constValue, label };
}

/** Generate a random constraint that is true for the given solution */
function generateRandomConstraint(
  solution: number[],
  size: number,
  rng: () => number,
  difficulty: Difficulty,
): Constraint | null {
  const maxVal = size;
  const rows = Array.from({ length: size }, (_, i) => i);

  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]!;

  // Decide constraint family based on difficulty
  const useArithmetic = difficulty === "easy"
    ? rng() < 0.4
    : difficulty === "medium"
    ? rng() < 0.3
    : rng() < 0.25;

  if (useArithmetic) {
    // Arithmetic: pick 3 distinct rows
    const shuffled = [...rows].sort(() => rng() - 0.5);
    const [a, b, c] = shuffled;
    const av = rowValue(solution, a!, size);
    const bv = rowValue(solution, b!, size);
    const cv = rowValue(solution, c!, size);

    const types: ConstraintType[] = [];
    if (av + bv === cv && av !== bv) types.push("sum");
    if (av - bv === cv && av !== bv) types.push("diff");
    if (av * bv === cv && av !== 1 && bv !== 1) types.push("prod");
    if (bv !== 0 && av % bv === 0 && av / bv === cv && av !== bv && bv !== 1) types.push("quot");

    if (types.length === 0) return null;
    return makeConstraint(pick(types), [a!, b!, c!]);
  }

  // Order constraints
  const useConst = rng() < 0.35;

  if (useConst) {
    // Constant comparison
    const r = pick(rows);
    const val = rowValue(solution, r, size);
    const types: ConstraintType[] = [];
    if (val > 1) types.push("gt_const", "gte_const", "neq_const");
    if (val < maxVal) types.push("lt_const", "lte_const", "neq_const");
    types.push("eq_const");

    const type = pick(types);
    let constValue: number;

    switch (type) {
      case "gt_const":
        constValue = pick(range(1, val - 1));
        break;
      case "lt_const":
        constValue = pick(range(val + 1, maxVal));
        break;
      case "gte_const":
        constValue = pick(range(1, val));
        break;
      case "lte_const":
        constValue = pick(range(val, maxVal));
        break;
      case "eq_const":
        constValue = val;
        break;
      case "neq_const":
        constValue = pick(range(1, maxVal).filter((v) => v !== val));
        break;
      default:
        return null;
    }

    return makeConstraint(type, [r], constValue);
  }

  // Binary order constraint between two rows
  const shuffled = [...rows].sort(() => rng() - 0.5);
  const [a, b] = shuffled;
  const av = rowValue(solution, a!, size);
  const bv = rowValue(solution, b!, size);
  if (av === bv) return null;

  const types: ConstraintType[] = [];
  if (av > bv) types.push("gt", "gte", "neq");
  else types.push("lt", "lte", "neq");

  return makeConstraint(pick(types), [a!, b!]);
}

function range(min: number, max: number): number[] {
  const result: number[] = [];
  for (let i = min; i <= max; i++) result.push(i);
  return result;
}

// ── Puzzle generation with unique-solution guarantee ────────────────────────

const DIFFICULTY_CONSTRAINT_COUNT: Record<Difficulty, [number, number]> = {
  easy: [2, 3],
  medium: [3, 5],
  hard: [5, 8],
};

const DIFFICULTY_SIZE: Record<Difficulty, GridSize[]> = {
  easy: [4],
  medium: [4, 5],
  hard: [5],
};

export function generatePuzzle(
  difficulty: Difficulty,
  seed?: number,
  forcedSize?: GridSize,
): Puzzle {
  const actualSeed = seed ?? Math.floor(Math.random() * 2 ** 31);
  const rng = mulberry32(actualSeed);

  const sizeOptions = forcedSize
    ? [forcedSize]
    : DIFFICULTY_SIZE[difficulty];
  const size = sizeOptions[Math.floor(rng() * sizeOptions.length)]!;

  const solution = generateLatinSquare(size, rng);
  const [minCon, maxCon] = DIFFICULTY_CONSTRAINT_COUNT[difficulty]!;
  const targetCount = minCon + Math.floor(rng() * (maxCon - minCon + 1));

  // Generate constraints that are true for this solution
  // and verify uniqueness
  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    const constraints: Constraint[] = [];
    const seenIds = new Set<string>();

    // Try to generate targetCount constraints
    let genAttempts = 0;
    while (constraints.length < targetCount && genAttempts < 100) {
      genAttempts++;
      const con = generateRandomConstraint(solution, size, rng, difficulty);
      if (con && !seenIds.has(con.id)) {
        constraints.push(con);
        seenIds.add(con.id);
      }
    }

    if (constraints.length < 2) {
      attempts++;
      continue;
    }

    // Check uniqueness: start from empty grid + constraints
    const empty = new Array(size * size).fill(0);
    if (hasUniqueSolution(empty, size, constraints)) {
      return {
        id: `matriz-${difficulty}-${actualSeed}`,
        size,
        difficulty,
        solution,
        constraints,
        seed: actualSeed,
      };
    }

    attempts++;
  }

  // Fallback: add enough constraints to guarantee uniqueness
  // Start with a few and keep adding until unique
  const constraints: Constraint[] = [];
  const seenIds = new Set<string>();
  let genAttempts = 0;
  while (genAttempts < 200) {
    genAttempts++;
    const con = generateRandomConstraint(solution, size, rng, difficulty);
    if (con && !seenIds.has(con.id)) {
      constraints.push(con);
      seenIds.add(con.id);

      const empty = new Array(size * size).fill(0);
      if (hasUniqueSolution(empty, size, constraints)) {
        return {
          id: `matriz-${difficulty}-${actualSeed}`,
          size,
          difficulty,
          solution,
          constraints,
          seed: actualSeed,
        };
      }
    }
  }

  // Last resort: reveal some diagonal cells as eq_const constraints
  for (let r = 0; r < size; r++) {
    const val = rowValue(solution, r, size);
    const con = makeConstraint("eq_const", [r], val);
    constraints.push(con);
    const empty = new Array(size * size).fill(0);
    if (hasUniqueSolution(empty, size, constraints)) {
      return {
        id: `matriz-${difficulty}-${actualSeed}`,
        size,
        difficulty,
        solution,
        constraints,
        seed: actualSeed,
      };
    }
  }

  // Should never reach here
  return {
    id: `matriz-${difficulty}-${actualSeed}`,
    size,
    difficulty,
    solution,
    constraints,
    seed: actualSeed,
  };
}

// ── Hint engine ─────────────────────────────────────────────────────────────

/**
 * Find the next logical step: a cell with only one possible value given the
 * current grid state and constraints. Returns a hint with explanation.
 */
export function generateHint(
  grid: number[],
  size: number,
  constraints: Constraint[],
): Hint | null {
  // Find empty cells
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;
      if (grid[idx] !== 0) continue;

      // Find valid values for this cell
      const validValues: number[] = [];
      for (let val = 1; val <= size; val++) {
        // Row check
        let ok = true;
        for (let cc = 0; cc < size; cc++) {
          if (cc !== c && grid[r * size + cc] === val) { ok = false; break; }
        }
        if (!ok) continue;
        // Col check
        for (let rr = 0; rr < size; rr++) {
          if (rr !== r && grid[rr * size + c] === val) { ok = false; break; }
        }
        if (!ok) continue;
        // Constraint check (temporarily set)
        grid[idx] = val;
        for (const con of constraints) {
          if (canEvalConstraint(con, grid, size) && !evalConstraint(con, grid, size)) {
            ok = false;
            break;
          }
        }
        grid[idx] = 0;
        if (ok) validValues.push(val);
      }

      if (validValues.length === 1) {
        const value = validValues[0]!;
        // Find which constraint(s) helped eliminate other values
        const reasons: string[] = [];
        for (const con of constraints) {
          if (con.rows.includes(r) && canEvalConstraint(con, grid, size)) {
            // Check if this constraint would be violated by other values
            for (const otherVal of [1, 2, 3, 4, 5].slice(0, size)) {
              if (otherVal === value) continue;
              grid[idx] = otherVal;
              if (canEvalConstraint(con, grid, size) && !evalConstraint(con, grid, size)) {
                reasons.push(con.label);
                grid[idx] = 0;
                break;
              }
              grid[idx] = 0;
            }
          }
        }

        // Also check row/column elimination
        const rowVals = new Set<number>();
        for (let cc = 0; cc < size; cc++) {
          if (cc !== c && grid[r * size + cc] !== 0) rowVals.add(grid[r * size + cc]!);
        }
        const colVals = new Set<number>();
        for (let rr = 0; rr < size; rr++) {
          if (rr !== r && grid[rr * size + c] !== 0) colVals.add(grid[rr * size + c]!);
        }

        const eliminated: number[] = [];
        for (let v = 1; v <= size; v++) {
          if (v === value) continue;
          if (rowVals.has(v) || colVals.has(v)) eliminated.push(v);
        }

        let explanation: string;
        if (reasons.length > 0) {
          explanation = `Pela restrição ${reasons[0]}, ${rowLabel(r)} só pode ser ${value}.`;
        } else if (eliminated.length > 0) {
          explanation = `Por eliminação de linha/coluna, a célula ${rowLabel(r)}${c + 1} só pode ser ${value}.`;
        } else {
          explanation = `${rowLabel(r)}${c + 1} só pode ser ${value}.`;
        }

        return { row: r, col: c, value, explanation };
      }
    }
  }

  return null;
}

// ── Validation helpers for the UI ────────────────────────────────────────────

/** Check which constraints are currently violated */
export function findViolatedConstraints(
  grid: number[],
  size: number,
  constraints: Constraint[],
): Constraint[] {
  return constraints.filter((c) => isViolated(c, grid, size));
}

/** Check if grid is fully filled and valid (Latin square + all constraints) */
export function isComplete(
  grid: number[],
  size: number,
  constraints: Constraint[],
): boolean {
  for (const v of grid) {
    if (v === 0) return false;
  }
  // Check Latin square
  for (let r = 0; r < size; r++) {
    const seen = new Set<number>();
    for (let c = 0; c < size; c++) {
      const v = grid[r * size + c]!;
      if (seen.has(v)) return false;
      seen.add(v);
    }
  }
  for (let c = 0; c < size; c++) {
    const seen = new Set<number>();
    for (let r = 0; r < size; r++) {
      const v = grid[r * size + c]!;
      if (seen.has(v)) return false;
      seen.add(v);
    }
  }
  // Check constraints
  for (const con of constraints) {
    if (!evalConstraint(con, grid, size)) return false;
  }
  return true;
}

/** Check if a cell placement is valid (row + col uniqueness) */
export function isCellValid(
  grid: number[],
  size: number,
  row: number,
  col: number,
  val: number,
): boolean {
  for (let c = 0; c < size; c++) {
    if (c !== col && grid[row * size + c] === val) return false;
  }
  for (let r = 0; r < size; r++) {
    if (r !== row && grid[r * size + col] === val) return false;
  }
  return true;
}

// ── Daily puzzle ─────────────────────────────────────────────────────────────

export function generateDailyPuzzle(): Puzzle {
  return generatePuzzle("medium", dateSeed());
}

export function generateDailyPuzzleForDifficulty(difficulty: Difficulty): Puzzle {
  return generatePuzzle(difficulty, dateSeed());
}
