export type Op = "+" | "-" | "*" | "/";
export type Level = "easy" | "medium" | "hard" | "expert";

export type Cell =
  | { kind: "empty" }
  | { kind: "fixed"; value: number }
  | { kind: "blank"; solution: number }
  | { kind: "op"; op: Op }
  | { kind: "equals" };

export interface Puzzle {
  id: string;
  name: string;
  level: Level;
  rows: number;
  cols: number;
  leftToRight: boolean;
  cells: Cell[][]; // [row][col]
}

export const LEVEL_LABEL: Record<Level, string> = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
  expert: "Especialista",
};

export const LEVEL_BADGE: Record<Level, string> = {
  easy: "bg-emerald-500/15 text-emerald-600",
  medium: "bg-amber-500/15 text-amber-600",
  hard: "bg-destructive/15 text-destructive",
  expert: "bg-purple-500/15 text-purple-400",
};

export const OP_SYMBOL: Record<Op, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};

export interface CellPos {
  row: number;
  col: number;
}

export interface Equation {
  direction: "row" | "col";
  cells: CellPos[]; // full run of non-empty cells
}

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

/** Extract equations = maximal contiguous non-empty runs containing '=' and at least one op. */
export function deriveEquations(puzzle: Puzzle): Equation[] {
  const eqs: Equation[] = [];
  const { rows, cols, cells } = puzzle;

  const scan = (direction: "row" | "col") => {
    const outer = direction === "row" ? rows : cols;
    const inner = direction === "row" ? cols : rows;
    for (let a = 0; a < outer; a++) {
      let run: CellPos[] = [];
      for (let b = 0; b <= inner; b++) {
        const r = direction === "row" ? a : b;
        const c = direction === "row" ? b : a;
        const cell = b < inner ? cells[r]![c]! : { kind: "empty" as const };
        if (cell.kind === "empty") {
          if (run.length >= 3) {
            const kinds = run.map((p) => cells[p.row]![p.col]!.kind);
            if (kinds.includes("equals") && kinds.includes("op")) {
              eqs.push({ direction, cells: run });
            }
          }
          run = [];
        } else {
          run.push({ row: r, col: c });
        }
      }
    }
  };

  scan("row");
  scan("col");
  return eqs;
}

type Token =
  | { t: "num"; v: number }
  | { t: "op"; op: Op }
  | { t: "eq" }
  | { t: "hole" };

function tokensFor(
  eq: Equation,
  puzzle: Puzzle,
  values: Map<string, number>,
): Token[] {
  return eq.cells.map<Token>((p) => {
    const cell = puzzle.cells[p.row]![p.col]!;
    switch (cell.kind) {
      case "fixed":
        return { t: "num", v: cell.value };
      case "op":
        return { t: "op", op: cell.op };
      case "equals":
        return { t: "eq" };
      case "blank": {
        const v = values.get(cellKey(p.row, p.col));
        return v === undefined ? { t: "hole" } : { t: "num", v };
      }
      case "empty":
        return { t: "hole" };
    }
  });
}

function evalExpr(tokens: Token[], leftToRight: boolean): number | null {
  if (leftToRight) {
    if (tokens.length === 0 || tokens[0]!.t !== "num") return null;
    let acc = (tokens[0] as { t: "num"; v: number }).v;
    for (let i = 1; i < tokens.length; i += 2) {
      const opTk = tokens[i];
      const nTk = tokens[i + 1];
      if (!opTk || opTk.t !== "op" || !nTk || nTk.t !== "num") return null;
      if (opTk.op === "+") acc += nTk.v;
      else if (opTk.op === "-") acc -= nTk.v;
      else if (opTk.op === "*") acc *= nTk.v;
      else if (opTk.op === "/") {
        if (nTk.v === 0 || acc % nTk.v !== 0) return null;
        acc = acc / nTk.v;
      } else return null;
    }
    return acc;
  }
  // Standard precedence: * and / before + and -
  const arr: Token[] = tokens.slice();
  for (let i = 1; i < arr.length - 1; ) {
    const tk = arr[i]!;
    if (tk.t === "op" && (tk.op === "*" || tk.op === "/")) {
      const a = arr[i - 1];
      const b = arr[i + 1];
      if (!a || a.t !== "num" || !b || b.t !== "num") return null;
      let v: number;
      if (tk.op === "*") v = a.v * b.v;
      else {
        if (b.v === 0) return null;
        if (a.v % b.v !== 0) return null;
        v = a.v / b.v;
      }
      arr.splice(i - 1, 3, { t: "num", v });
    } else {
      i++;
    }
  }
  if (arr.length === 0 || arr[0]!.t !== "num") return null;
  let acc = (arr[0] as { t: "num"; v: number }).v;
  for (let i = 1; i < arr.length; i += 2) {
    const opTk = arr[i];
    const nTk = arr[i + 1];
    if (!opTk || opTk.t !== "op" || !nTk || nTk.t !== "num") return null;
    if (opTk.op === "+") acc += nTk.v;
    else if (opTk.op === "-") acc -= nTk.v;
    else return null;
  }
  return acc;
}

export type EqState = "partial" | "ok" | "wrong";

export function evaluateEquation(
  eq: Equation,
  puzzle: Puzzle,
  values: Map<string, number>,
): EqState {
  const tokens = tokensFor(eq, puzzle, values);
  if (tokens.some((t) => t.t === "hole")) return "partial";
  // split at '='
  const eqIdx = tokens.findIndex((t) => t.t === "eq");
  if (eqIdx < 0) return "wrong";
  const lhs = tokens.slice(0, eqIdx);
  const rhs = tokens.slice(eqIdx + 1);
  const l = evalExpr(lhs, puzzle.leftToRight);
  const r = evalExpr(rhs, puzzle.leftToRight);
  if (l === null || r === null) return "wrong";
  return l === r ? "ok" : "wrong";
}

export function countBlanks(puzzle: Puzzle): number {
  let n = 0;
  for (const row of puzzle.cells) for (const c of row) if (c.kind === "blank") n++;
  return n;
}

export function collectBlanks(puzzle: Puzzle): CellPos[] {
  const arr: CellPos[] = [];
  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      if (puzzle.cells[r]![c]!.kind === "blank") arr.push({ row: r, col: c });
    }
  }
  return arr;
}
