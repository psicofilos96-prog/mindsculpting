import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, CircleCheck as CheckCircle2, Heart, Lightbulb, RotateCw, X } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { generatePuzzleByLevel } from "@/features/cruzada/puzzles";
import {
  LEVEL_BADGE,
  LEVEL_LABEL,
  OP_SYMBOL,
  cellKey,
  collectBlanks,
  countBlanks,
  deriveEquations,
  evaluateEquation,
  type CellPos,
  type Level,
  type Puzzle,
} from "@/features/cruzada/types";
import { useCruzadaStorage } from "@/features/cruzada/useCruzadaStorage";
import { cn } from "@/lib/utils";

const LevelSchema = z.enum(["easy", "medium", "hard", "expert"]);
const searchSchema = z.object({ level: LevelSchema.optional() });

export const Route = createFileRoute("/cruzada/jogar")({
  validateSearch: (s) => searchSchema.parse(s),
  component: JogarCruzada,
});

const MAX_LIVES = 3;


interface PoolItem {
  id: number;
  value: number;
  used: boolean;
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* noop */
    }
  }
}

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function generatePool(blanks: CellPos[], puzzle: Puzzle): PoolItem[] {
  const solutions = blanks.map((p) => {
    const c = puzzle.cells[p.row]![p.col]!;
    return (c as { kind: "blank"; solution: number }).solution;
  });

  // Start with double the solutions for density (like reference Level 6)
  const items: number[] = [...solutions, ...solutions];
  const unique = [...new Set(solutions)];

  // Add decoys: ±1, ±2, ±3, +4 for each unique solution value
  for (const v of unique) {
    for (const d of [-3, -2, -1, 1, 2, 3, 4]) {
      const n = v + d;
      if (n >= 1 && n <= 30) items.push(n);
    }
  }

  const shuffled = fisherYates(items);
  const count = Math.max(solutions.length + 7, 12);
  return shuffled.slice(0, count).map((value, id) => ({ id, value, used: false }));
}

function JogarCruzada() {
  const navigate = useNavigate();
  const { level } = Route.useSearch();
  const currentLevel = level ?? "easy";
  const [restartKey, setRestartKey] = useState(0);
  const puzzle = useMemo<Puzzle>(
    () => generatePuzzleByLevel(currentLevel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLevel, restartKey],
  );
  const equations = useMemo(() => deriveEquations(puzzle), [puzzle]);
  const blanks = useMemo(() => collectBlanks(puzzle), [puzzle]);
  const blankCount = useMemo(() => countBlanks(puzzle), [puzzle]);
  const { recordSolve } = useCruzadaStorage();
  const recordedRef = useRef(false);
  const wrongFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [values, setValues] = useState<Map<string, number>>(new Map());
  const [cellToPoolId, setCellToPoolId] = useState<Map<string, number>>(new Map());
  const [pool, setPool] = useState<PoolItem[]>(() => generatePool(blanks, puzzle));
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);
  const [lives, setLives] = useState(MAX_LIVES);
  const [wrongCells, setWrongCells] = useState<Set<string>>(new Set());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [solved, setSolved] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [startTs, setStartTs] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Reset when puzzle changes
  useEffect(() => {
    setValues(new Map());
    setCellToPoolId(new Map());
    setPool(generatePool(collectBlanks(puzzle), puzzle));
    setSelectedCell(null);
    setSelectedPoolId(null);
    setLives(MAX_LIVES);
    setWrongCells(new Set());
    setHintsUsed(0);
    setSolved(false);
    setGameOver(false);
    setStartTs(Date.now());
    setElapsed(0);
    recordedRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id]);

  // Timer
  useEffect(() => {
    if (solved || gameOver) return;
    const t = setInterval(() => setElapsed(Date.now() - startTs), 500);
    return () => clearInterval(t);
  }, [startTs, solved, gameOver]);

  const flashWrongCells = (cells: Set<string>) => {
    if (wrongFlashRef.current) clearTimeout(wrongFlashRef.current);
    setWrongCells(cells);
    wrongFlashRef.current = setTimeout(() => setWrongCells(new Set()), 900);
  };

  const placeNumber = (cellKeyStr: string, item: PoolItem) => {
    if (solved || gameOver) return;
    const pos = blanks.find((p) => cellKey(p.row, p.col) === cellKeyStr);
    if (!pos) return;

    // Capture equation states BEFORE placement
    const prevStates = equations.map((eq) => evaluateEquation(eq, puzzle, values));

    // Build new values map
    const existingPoolId = cellToPoolId.get(cellKeyStr);
    const newValues = new Map(values).set(cellKeyStr, item.value);
    const newCellToPoolId = new Map(cellToPoolId).set(cellKeyStr, item.id);

    // Update pool: free old item, mark new item used
    const newPool = pool.map((p) => {
      if (existingPoolId !== undefined && p.id === existingPoolId) return { ...p, used: false };
      if (p.id === item.id) return { ...p, used: true };
      return p;
    });

    // Check which equations newly became wrong
    const newlyWrong = equations.filter(
      (eq, i) => prevStates[i] !== "wrong" && evaluateEquation(eq, puzzle, newValues) === "wrong",
    );
    const lostLife = newlyWrong.length > 0;
    const newLives = lostLife ? lives - 1 : lives;

    // Commit all state at once
    setValues(newValues);
    setCellToPoolId(newCellToPoolId);
    setPool(newPool);
    setSelectedCell(null);
    setSelectedPoolId(null);

    if (lostLife) {
      const flash = new Set<string>();
      newlyWrong.forEach((eq) => eq.cells.forEach((p) => flash.add(cellKey(p.row, p.col))));
      flashWrongCells(flash);
      setLives(newLives);
      vibrate([40, 30, 40]);
      if (newLives <= 0) {
        setGameOver(true);
        vibrate([60, 40, 60, 40, 120]);
      }
    } else {
      // Check win
      const allFilled = blanks.every((p) => newValues.has(cellKey(p.row, p.col)));
      if (allFilled) {
        const allOk = equations.every((eq) => evaluateEquation(eq, puzzle, newValues) === "ok");
        if (allOk && !recordedRef.current) {
          recordedRef.current = true;
          setSolved(true);
          recordSolve(puzzle.id, Date.now() - startTs, hintsUsed);
          vibrate([20, 10, 20, 10, 50]);
        }
      }
    }
  };

  const handleCellTap = (key: string) => {
    if (solved || gameOver) return;
    if (selectedPoolId !== null) {
      const item = pool.find((p) => p.id === selectedPoolId);
      if (item) placeNumber(key, item);
    } else {
      setSelectedCell((prev) => (prev === key ? null : key));
    }
  };

  const handlePoolTap = (item: PoolItem) => {
    if (solved || gameOver || item.used) return;
    if (selectedCell !== null) {
      placeNumber(selectedCell, item);
    } else {
      setSelectedPoolId((prev) => (prev === item.id ? null : item.id));
    }
  };

  const handleShufflePool = () => {
    setPool((prev) => fisherYates([...prev]));
  };

  const handleHint = () => {
    if (solved || gameOver) return;
    const empties = blanks.filter((p) => !values.has(cellKey(p.row, p.col)));
    if (!empties.length) return;
    const pick = empties[Math.floor(Math.random() * empties.length)]!;
    const cell = puzzle.cells[pick.row]![pick.col]!;
    if (cell.kind !== "blank") return;
    const key = cellKey(pick.row, pick.col);
    const solution = cell.solution;

    // Find an unused pool item matching the solution
    const poolItem = pool.find((p) => !p.used && p.value === solution);
    const newValues = new Map(values).set(key, solution);

    let newPool = pool;
    let newCellToPoolId = cellToPoolId;
    if (poolItem) {
      newPool = pool.map((p) => (p.id === poolItem.id ? { ...p, used: true } : p));
      newCellToPoolId = new Map(cellToPoolId).set(key, poolItem.id);
    }

    setValues(newValues);
    setPool(newPool);
    setCellToPoolId(newCellToPoolId);
    setHintsUsed((h) => h + 1);
    setSelectedCell(null);
    setSelectedPoolId(null);

    // Check win after hint
    const allFilled = blanks.every((p) => newValues.has(cellKey(p.row, p.col)));
    if (allFilled) {
      const allOk = equations.every((eq) => evaluateEquation(eq, puzzle, newValues) === "ok");
      if (allOk && !recordedRef.current) {
        recordedRef.current = true;
        setSolved(true);
        recordSolve(puzzle.id, Date.now() - startTs, hintsUsed + 1);
        vibrate([20, 10, 20, 10, 50]);
      }
    }
  };

  const handleRestart = () => {
    setValues(new Map());
    setCellToPoolId(new Map());
    setPool(generatePool(blanks, puzzle));
    setSelectedCell(null);
    setSelectedPoolId(null);
    setLives(MAX_LIVES);
    setWrongCells(new Set());
    setHintsUsed(0);
    setSolved(false);
    setGameOver(false);
    setStartTs(Date.now());
    setElapsed(0);
    recordedRef.current = false;
    setRestartKey((k) => k + 1);
  };

  const selectedPoolItem = pool.find((p) => p.id === selectedPoolId);
  const filledCount = values.size;
  const progressPct = blankCount > 0 ? Math.round((filledCount / blankCount) * 100) : 0;
  const seconds = Math.floor(elapsed / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const maxDim = Math.max(puzzle.rows, puzzle.cols);
  const cellSize = Math.min(52, Math.floor(308 / maxDim));
  const numFont = cellSize >= 46 ? "text-base" : cellSize >= 36 ? "text-sm" : "text-xs";
  const symFont = cellSize >= 46 ? "text-base" : "text-sm";

  return (
    <AppShell title={puzzle.name} back="/cruzada">
      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-bold text-foreground">
            {puzzle.name}
          </span>
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              LEVEL_BADGE[puzzle.level],
            )}
          >
            {LEVEL_LABEL[puzzle.level]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Hearts */}
          <div className="flex items-center gap-0.5">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <Heart
                key={i}
                className={cn(
                  "h-5 w-5 transition-colors",
                  i < lives ? "fill-red-500 text-red-500" : "text-muted-foreground/40",
                )}
              />
            ))}
          </div>

          {/* Timer */}
          <span className="font-mono text-xs text-muted-foreground">
            {mm}:{ss}
          </span>

          {/* Restart */}
          <button
            onClick={handleRestart}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/60 text-foreground transition-colors hover:bg-secondary"
            aria-label="Reiniciar"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── PROGRESS ──────────────────────────────────────── */}
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary/60">
        <div
          className="h-full bg-gradient-neural transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">
        {filledCount}/{blankCount}
      </p>

      {/* ── GRID ──────────────────────────────────────────── */}
      <div className="mt-3 flex justify-center overflow-auto">
        <table className="border-collapse" style={{ borderSpacing: 0 }}>
          <tbody>
            {puzzle.cells.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => {
                  const key = cellKey(r, c);
                  const sz = { width: cellSize, height: cellSize, minWidth: cellSize, minHeight: cellSize };

                  if (cell.kind === "empty") {
                    return <td key={key} style={sz} className="border-0 bg-transparent" />;
                  }

                  if (cell.kind === "op") {
                    return (
                      <td
                        key={key}
                        style={sz}
                        className={cn("border border-border bg-card text-center align-middle font-display font-bold text-muted-foreground", symFont)}
                      >
                        {OP_SYMBOL[cell.op]}
                      </td>
                    );
                  }

                  if (cell.kind === "equals") {
                    return (
                      <td
                        key={key}
                        style={sz}
                        className={cn("border border-border bg-card text-center align-middle font-display font-bold text-muted-foreground", symFont)}
                      >
                        =
                      </td>
                    );
                  }

                  if (cell.kind === "fixed") {
                    return (
                      <td
                        key={key}
                        style={sz}
                        className={cn("border border-border bg-card text-center align-middle font-mono font-bold text-foreground", numFont)}
                      >
                        {cell.value}
                      </td>
                    );
                  }

                  // blank cell
                  const val = values.get(key);
                  const isSel = selectedCell === key;
                  const isWrong = wrongCells.has(key);

                  return (
                    <td
                      key={key}
                      style={sz}
                      onClick={() => handleCellTap(key)}
                      className={cn(
                        // Same base style as fixed cells (spec requirement)
                        cn("border border-border bg-card text-center align-middle font-mono font-bold transition-colors", numFont),
                        "cursor-pointer select-none",
                        // Filled value color
                        val !== undefined && !isSel && !isWrong && "text-foreground",
                        // Empty blank — no visible text, but same bg
                        val === undefined && !isSel && "text-transparent",
                        // Selected: green highlight (only visual difference)
                        isSel && "!bg-emerald-500/20 !border-emerald-500 text-emerald-700",
                        // Wrong flash
                        isWrong && "!bg-destructive/25 !border-destructive text-destructive",
                        // Solved
                        solved && "!bg-primary/15 text-primary",
                      )}
                    >
                      {val ?? "\u00A0"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── POOL AREA (hidden when solved/game over) ──────── */}
      {!solved && !gameOver && (
        <div className="mt-5">
          {/* Selected number large preview */}
          <div className="mb-4 flex min-h-[56px] items-center justify-center">
            {selectedPoolItem ? (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-emerald-500 bg-emerald-500/15 font-mono text-2xl font-bold text-emerald-600 shadow-sm">
                {selectedPoolItem.value}
              </div>
            ) : selectedCell ? (
              <p className="text-sm text-muted-foreground">Toque um número abaixo</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Toque uma célula vazia ou um número do pool
              </p>
            )}
          </div>

          {/* Number pills pool */}
          <div className="flex flex-wrap justify-center gap-2">
            {pool.map((item) => (
              <button
                key={item.id}
                onClick={() => handlePoolTap(item)}
                disabled={item.used}
                className={cn(
                  "min-w-[44px] rounded-full border px-3 py-1.5 font-mono text-base font-bold transition-all active:scale-90",
                  item.used &&
                    "border-border bg-muted text-muted-foreground opacity-35 cursor-default",
                  !item.used &&
                    selectedPoolId === item.id &&
                    "border-emerald-500 bg-emerald-500/20 text-emerald-700 shadow-sm",
                  !item.used &&
                    selectedPoolId !== item.id &&
                    "border-border bg-card text-foreground hover:border-primary/60 hover:bg-primary/5",
                )}
              >
                {item.value}
              </button>
            ))}
          </div>

          {/* Bottom controls: shuffle left, hint right */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={handleShufflePool}
              className="flex items-center gap-1.5 rounded-xl bg-secondary/70 px-4 py-2 text-sm font-medium text-foreground transition-transform active:scale-95"
            >
              <ArrowUpDown className="h-4 w-4" />
              Embaralhar
            </button>
            <button
              onClick={handleHint}
              className="flex items-center gap-1.5 rounded-xl bg-accent/15 px-4 py-2 text-sm font-medium text-accent transition-transform active:scale-95"
            >
              <Lightbulb className="h-4 w-4" />
              Dica
            </button>
          </div>
        </div>
      )}

      {/* ── SOLVED ────────────────────────────────────────── */}
      {solved && (
        <div className="mt-6 space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <p className="font-display text-xl font-bold text-foreground">Resolvido!</p>
          <p className="text-sm text-muted-foreground">
            Tempo{" "}
            <span className="font-mono text-foreground">
              {mm}:{ss}
            </span>
            {" · "}dicas{" "}
            <span className="font-mono text-foreground">{hintsUsed}</span>
            {" · "}vidas restantes{" "}
            <span className="font-mono text-foreground">{lives}</span>
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleRestart}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary/70 font-medium text-foreground transition-transform active:scale-95"
            >
              <RotateCw className="h-4 w-4" /> Refazer
            </button>
            <button
              onClick={() => navigate({ to: "/cruzada" })}
              className="flex h-12 items-center justify-center rounded-xl bg-gradient-neural font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-95"
            >
              Escolher outro
            </button>
          </div>
        </div>
      )}

      {/* ── GAME OVER ─────────────────────────────────────── */}
      {gameOver && !solved && (
        <div className="mt-6 space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15">
            <X className="h-8 w-8 text-destructive" />
          </div>
          <p className="font-display text-xl font-bold text-destructive">Game Over</p>
          <p className="text-sm text-muted-foreground">
            Você esgotou as {MAX_LIVES} vidas.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleRestart}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary/70 font-medium text-foreground transition-transform active:scale-95"
            >
              <RotateCw className="h-4 w-4" /> Tentar de novo
            </button>
            <button
              onClick={() => navigate({ to: "/cruzada" })}
              className="flex h-12 items-center justify-center rounded-xl bg-gradient-neural font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-95"
            >
              Escolher outro
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
