import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Undo2, Redo2, Lightbulb, RotateCw, X, Eraser,
  CircleCheck as CheckCircle2, Clock, AlertTriangle,
} from "lucide-react";
import {
  DIFFICULTY_LABEL,
  ROW_LABELS,
  type Difficulty,
  type GameMode,
  type GridSize,
  type Hint,
  type Puzzle,
} from "@/features/matriz/types";
import {
  generatePuzzle,
  generateDailyPuzzleForDifficulty,
  generateHint,
  findViolatedConstraints,
  isComplete,
  isCellValid,
} from "@/features/matriz/engine";
import { useMatrizStorage } from "@/features/matriz/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/matriz/jogar")({
  validateSearch: z.object({
    difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
    mode: z.enum(["campaign", "daily", "endless", "timed"]).default("campaign"),
    level: z.number().optional(),
  }),
  component: MatrizGame,
});

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function MatrizGame() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { recordSolve, setMaxLevel } = useMatrizStorage();
  const { difficulty, mode, level } = search;

  // Generate puzzle
  const puzzle = useMemo<Puzzle>(() => {
    if (mode === "daily") return generateDailyPuzzleForDifficulty(difficulty);
    return generatePuzzle(difficulty);
  }, [difficulty, mode]);

  const size = puzzle.size as GridSize;

  // Game state
  const [grid, setGrid] = useState<number[]>(() => new Array(size * size).fill(0));
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [history, setHistory] = useState<number[][]>([]);
  const [redoStack, setRedoStack] = useState<number[][]>([]);
  const [errors, setErrors] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hint, setHint] = useState<Hint | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [solved, setSolved] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [startMs, setStartMs] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [wrongFlash, setWrongFlash] = useState<{ row: number; col: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedRef = useRef(false);

  // Timer
  useEffect(() => {
    if (solved) return;
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startMs);
    }, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [solved, startMs]);

  // Check completion
  useEffect(() => {
    if (isComplete(grid, size, puzzle.constraints) && !recordedRef.current) {
      recordedRef.current = true;
      setSolved(true);
      if (timerRef.current) clearInterval(timerRef.current);
      const finalTime = Date.now() - startMs;
      recordSolve({
        difficulty,
        timeMs: finalTime,
        errors,
        hintsUsed,
        solved: true,
      });
      if (mode === "campaign" && level) {
        setMaxLevel(Math.max(level, 1));
      }
      setTimeout(() => setShowWin(true), 400);
    }
  }, [grid, size, puzzle.constraints, startMs, recordSolve, difficulty, errors, hintsUsed, mode, level, setMaxLevel]);

  // Violated constraints
  const violated = useMemo(
    () => findViolatedConstraints(grid, size, puzzle.constraints),
    [grid, size, puzzle.constraints],
  );

  const handleCellClick = useCallback((row: number, col: number) => {
    if (solved) return;
    setSelectedCell({ row, col });
    setHint(null);
    setShowHint(false);
  }, [solved]);

  const handleNumberInput = useCallback((val: number) => {
    if (!selectedCell || solved) return;
    const { row, col } = selectedCell;
    const idx = row * size + col;

    // Check validity
    if (!isCellValid(grid, size, row, col, val)) {
      setErrors((e) => e + 1);
      setWrongFlash({ row, col });
      setTimeout(() => setWrongFlash(null), 500);
      return;
    }

    setHistory((h) => [...h, grid]);
    setRedoStack([]);
    setGrid((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  }, [selectedCell, solved, grid, size]);

  const handleErase = useCallback(() => {
    if (!selectedCell || solved) return;
    const { row, col } = selectedCell;
    const idx = row * size + col;
    if (grid[idx] === 0) return;
    setHistory((h) => [...h, grid]);
    setRedoStack([]);
    setGrid((prev) => {
      const next = [...prev];
      next[idx] = 0;
      return next;
    });
  }, [selectedCell, solved, grid, size]);

  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1]!;
      setRedoStack((r) => [...r, grid]);
      setGrid(prev);
      return h.slice(0, -1);
    });
  }, [grid]);

  const handleRedo = useCallback(() => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const next = r[r.length - 1]!;
      setHistory((h) => [...h, grid]);
      setGrid(next);
      return r.slice(0, -1);
    });
  }, [grid]);

  const handleHint = useCallback(() => {
    const h = generateHint(grid, size, puzzle.constraints);
    if (h) {
      setHint(h);
      setShowHint(true);
      setHintsUsed((n) => n + 1);
    }
  }, [grid, size, puzzle.constraints]);

  const handleRestart = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    recordedRef.current = false;
    setGrid(new Array(size * size).fill(0));
    setHistory([]);
    setRedoStack([]);
    setSelectedCell(null);
    setErrors(0);
    setHintsUsed(0);
    setHint(null);
    setShowHint(false);
    setSolved(false);
    setShowWin(false);
    setStartMs(Date.now());
    setElapsed(0);
  }, [size]);

  // Cell size calculation
  const maxGridPx = Math.min(340, typeof window !== "undefined" ? window.innerWidth - 48 : 320);
  const cellSize = Math.floor(maxGridPx / (size + 1)); // +1 for header
  const gridPx = cellSize * (size + 1);

  const numberKeys = Array.from({ length: size }, (_, i) => i + 1);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/matriz" })}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-4">
          <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            {DIFFICULTY_LABEL[difficulty]}
          </span>
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono font-bold tabular-nums text-foreground">
              {formatTime(elapsed)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-[11px] text-muted-foreground">Erros</span>
            <span className="font-mono font-bold tabular-nums text-destructive">{errors}</span>
          </div>
        </div>

        <button
          onClick={handleRestart}
          title="Reiniciar"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground active:scale-95"
        >
          <RotateCw className="h-4 w-4" />
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center gap-4 px-4 py-4 overflow-y-auto">
        {/* Grid */}
        <div style={{ width: gridPx }} className="shrink-0">
          {/* Column headers */}
          <div className="flex" style={{ height: cellSize }}>
            <div style={{ width: cellSize }} />
            {Array.from({ length: size }, (_, c) => (
              <div
                key={c}
                style={{ width: cellSize, height: cellSize }}
                className="flex items-center justify-center font-display text-sm font-bold text-muted-foreground"
              >
                {c + 1}
              </div>
            ))}
          </div>

          {/* Rows */}
          {Array.from({ length: size }, (_, r) => (
            <div key={r} className="flex" style={{ height: cellSize }}>
              {/* Row label */}
              <div
                style={{ width: cellSize, height: cellSize }}
                className="flex items-center justify-center font-display text-sm font-bold text-primary"
              >
                {ROW_LABELS[r]}
              </div>
              {/* Cells */}
              {Array.from({ length: size }, (_, c) => {
                const idx = r * size + c;
                const val = grid[idx]!;
                const isSelected = selectedCell?.row === r && selectedCell?.col === c;
                const isWrong = wrongFlash?.row === r && wrongFlash?.col === c;
                const isHintCell = hint?.row === r && hint?.col === c;
                const isDiagonal = r === c;

                return (
                  <button
                    key={c}
                    onClick={() => handleCellClick(r, c)}
                    style={{ width: cellSize, height: cellSize }}
                    className={cn(
                      "flex items-center justify-center border-2 font-display font-bold transition-all active:scale-95",
                      isSelected ? "border-primary ring-2 ring-primary/30" : "border-border",
                      isWrong && "border-destructive bg-destructive/20 animate-pulse",
                      isHintCell && "border-accent bg-accent/15 shadow-[0_0_12px_oklch(0.68_0.19_300/50%)]",
                      !isSelected && !isWrong && !isHintCell && val === 0 && "bg-card/40 hover:bg-card/70",
                      !isSelected && !isWrong && !isHintCell && val !== 0 && "bg-card",
                      isDiagonal && val !== 0 && !isWrong && "bg-primary/10",
                    )}
                  >
                    <span
                      style={{ fontSize: Math.max(12, cellSize * 0.4) }}
                      className={cn(
                        "tabular-nums leading-none",
                        val === 0 ? "text-transparent" : "text-foreground",
                      )}
                    >
                      {val === 0 ? "·" : val}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Constraints */}
        <div className="w-full max-w-md">
          <h3 className="mb-2 px-1 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Restrições
          </h3>
          <div className="space-y-1.5">
            {puzzle.constraints.map((con) => {
              const isViolated = violated.some((v) => v.id === con.id);
              return (
                <div
                  key={con.id}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-mono transition-colors",
                    isViolated
                      ? "border-destructive/50 bg-destructive/10 text-destructive"
                      : "border-border bg-card/60 text-foreground",
                  )}
                >
                  {isViolated && <AlertTriangle className="mr-1 inline h-3 w-3" />}
                  {con.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Hint display */}
        <AnimatePresence>
          {showHint && hint && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full max-w-md rounded-xl border border-accent/40 bg-accent/10 p-3"
            >
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div>
                  <div className="text-xs font-semibold text-accent">Dica</div>
                  <div className="mt-0.5 text-sm text-foreground">{hint.explanation}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Number pad + controls */}
        <div className="mt-auto w-full max-w-md space-y-2 pb-4">
          {/* Undo/Redo/Hint */}
          <div className="flex gap-2">
            <CtrlButton onClick={handleUndo} disabled={history.length === 0} icon={<Undo2 className="h-4 w-4" />} label="Desfazer" />
            <CtrlButton onClick={handleRedo} disabled={redoStack.length === 0} icon={<Redo2 className="h-4 w-4" />} label="Refazer" />
            <CtrlButton onClick={handleHint} icon={<Lightbulb className="h-4 w-4" />} label="Dica" accent />
            <CtrlButton onClick={handleErase} disabled={!selectedCell} icon={<Eraser className="h-4 w-4" />} label="Apagar" />
          </div>

          {/* Number keys */}
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
            {numberKeys.map((n) => (
              <button
                key={n}
                onClick={() => handleNumberInput(n)}
                className={cn(
                  "flex h-12 items-center justify-center rounded-xl border-2 border-border bg-card font-display text-lg font-bold text-foreground transition-all active:scale-95",
                  "hover:border-primary/50 hover:bg-primary/10",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Win overlay */}
      <AnimatePresence>
        {showWin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-[0_8px_48px_oklch(0_0_0/50%)]"
            >
              <div className="mb-4 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
              </div>
              <h2 className="text-center font-display text-2xl font-bold text-gradient-neural">
                Resolvido!
              </h2>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                {DIFFICULTY_LABEL[difficulty]} · {size}×{size}
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <ResultStat label="Tempo" value={formatTime(elapsed)} />
                <ResultStat label="Erros" value={String(errors)} />
                <ResultStat label="Dicas" value={String(hintsUsed)} />
              </div>

              <div className="mt-5 space-y-2">
                <button
                  onClick={handleRestart}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-3.5 font-display text-base font-bold text-primary-foreground shadow-glow-primary active:scale-[0.98]"
                >
                  <RotateCw className="h-4 w-4" />
                  Novo puzzle
                </button>
                <button
                  onClick={() => navigate({ to: "/matriz" })}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3.5 font-display text-base font-semibold text-foreground active:scale-[0.98]"
                >
                  Voltar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CtrlButton({
  onClick, disabled, icon, label, accent,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 rounded-xl border py-2 text-xs font-medium transition-all active:scale-95",
        disabled
          ? "border-border bg-card/30 text-muted-foreground/50"
          : accent
          ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
          : "border-border bg-card/60 text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-2.5 text-center">
      <div className="font-mono text-base font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
