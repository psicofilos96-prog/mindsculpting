import type { Cell, Op, Puzzle } from "./types";

const E: Cell = { kind: "empty" };
const EQ: Cell = { kind: "equals" };
const F = (v: number): Cell => ({ kind: "fixed", value: v });
const B = (solution: number): Cell => ({ kind: "blank", solution });
const O = (op: Op): Cell => ({ kind: "op", op });

/**
 * EASY — cruzamento simples soma/subtração.
 *   . .  4 . .
 *   . .  + . .
 *   7 +  _ = _
 *   . .  = . .
 *   . .  _ . .
 * Equação linha 2 (row 2): 7 + _ = _ → 7+4=11
 * Equação coluna 2: 4 + _ = _ → 4+7=11  (usa a mesma célula do meio "_" cruzado)
 * Blanks preencham para: (2,2)=4? não, ela é fixa. Vamos ajustar:
 * Simplifiquemos: blanks = (2,4) e (4,2).
 */
const easy1: Puzzle = {
  id: "easy-1",
  name: "Cruzamento simples",
  level: "easy",
  rows: 5,
  cols: 5,
  cells: [
    [E, E, F(4), E, E],
    [E, E, O("+"), E, E],
    [F(7), O("+"), F(4), EQ, B(11)],
    [E, E, EQ, E, E],
    [E, E, B(11), E, E],
  ],
};

/**
 * EASY 2 — dois cruzamentos.
 *  3 + 2 = 5
 *  +
 *  4
 *  =
 *  7
 * Vertical col 0: 3+4=7. Horizontal row 0: 3+2=5.
 * Blanks: (0,2), (0,4), (2,0), (4,0)
 */
const easy2: Puzzle = {
  id: "easy-2",
  name: "L invertido",
  level: "easy",
  rows: 5,
  cols: 5,
  cells: [
    [F(3), O("+"), B(2), EQ, B(5)],
    [O("+"), E, E, E, E],
    [B(4), E, E, E, E],
    [EQ, E, E, E, E],
    [B(7), E, E, E, E],
  ],
};

/**
 * MEDIUM — soma + multiplicação, cruzamento.
 *  2 × 3 = 6
 *  +
 *  8
 *  =
 * 10
 * Vertical col 0: 2+8=10. Horizontal row 0: 2×3=6.
 * Blanks: (0,2), (2,0)
 */
const medium1: Puzzle = {
  id: "medium-1",
  name: "Multiplicação cruzada",
  level: "medium",
  rows: 5,
  cols: 5,
  cells: [
    [F(2), O("*"), B(3), EQ, F(6)],
    [O("+"), E, E, E, E],
    [B(8), E, E, E, E],
    [EQ, E, E, E, E],
    [F(10), E, E, E, E],
  ],
};

/**
 * MEDIUM 2 — retângulo com 4 equações em soma/mult.
 *  2 × 3 = 6
 *  +         +
 *  5         4
 *  =         =
 *  7 + 3 = 10
 * col 0: 2+5=7 ✓ ; col 4: 6+4=10 ✓
 * Blanks: (0,2), (2,0), (2,4), (4,2)
 */
const medium2: Puzzle = {
  id: "medium-2",
  name: "Quadrilátero",
  level: "medium",
  rows: 5,
  cols: 5,
  cells: [
    [F(2), O("*"), B(3), EQ, F(6)],
    [O("+"), E, E, E, O("+")],
    [B(5), E, E, E, B(4)],
    [EQ, E, E, E, EQ],
    [F(7), O("+"), B(3), EQ, F(10)],
  ],
};

/**
 * HARD — 4 operações, retângulo.
 *  12 ÷ 3 = 4
 *  −         ×
 *  5         2
 *  =         =
 *  7 + 1 = 8
 * col 0: 12−5=7 ✓ ; col 4: 4×2=8 ✓
 * row 0: 12÷3=4 ✓ ; row 4: 7+1=8 ✓
 * Blanks: (0,2), (2,0), (2,4), (4,2)
 */
const hard1: Puzzle = {
  id: "hard-1",
  name: "Quatro operações",
  level: "hard",
  rows: 5,
  cols: 5,
  cells: [
    [F(12), O("/"), B(3), EQ, F(4)],
    [O("-"), E, E, E, O("*")],
    [B(5), E, E, E, B(2)],
    [EQ, E, E, E, EQ],
    [F(7), O("+"), B(1), EQ, F(8)],
  ],
};

export const PUZZLES: Puzzle[] = [easy1, easy2, medium1, medium2, hard1];

export function puzzleById(id: string): Puzzle | undefined {
  return PUZZLES.find((p) => p.id === id);
}

/** Placeholder for future procedural generator. */
export function gerarTabuleiro(level?: Puzzle["level"]): Puzzle {
  const pool = level ? PUZZLES.filter((p) => p.level === level) : PUZZLES;
  const list = pool.length > 0 ? pool : PUZZLES;
  return list[Math.floor(Math.random() * list.length)]!;
}
