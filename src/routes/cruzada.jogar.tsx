import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Eraser, Lightbulb, RotateCw } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { PUZZLES, puzzleById } from "@/features/cruzada/puzzles";
import {
  OP_SYMBOL,
  cellKey,
  collectBlanks,
  deriveEquations,
  evaluateEquation,
  type EqState,
  type Puzzle,
} from "@/features/cruzada/types";
import { useCruzadaStorage } from "@/features/cruzada/useCruzadaStorage";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/cruzada/jogar")({
  validateSearch: (s) => searchSchema.parse(s),
  component: JogarCruzada,
});

function JogarCruzada() {
  const navigate = useNavigate();
  const { id } = Route.useSearch();
  const puzzle = useMemo<Puzzle>(
    () => puzzleById(id ?? "") ?? PUZZLES[0]!,
    [id],
  );
  const equations = useMemo(() => deriveEquations(puzzle), [puzzle]);
  const blanks = useMemo(() => collectBlanks(puzzle), [puzzle]);
  const { recordSolve } = useCruzadaStorage();

  const [values, setValues] = useState<Map<string, number>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [startTs] = useState<number>(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const recordedRef = useRef(false);

  useEffect(() => {
    setValues(new Map());
    setSelected(null);
    setHintsUsed(0);
    setSolved(false);
    setShowCheck(false);
    recordedRef.current = false;
  }, [puzzle.id]);

  useEffect(() => {
    if (solved) return;
    const t = setInterval(() => setElapsed(Date.now() - startTs), 500);
    return () => clearInterval(t);
  }, [startTs, solved]);

  const eqStates = useMemo(() => {
    const m = new Map<number, EqState>();
    equations.forEach((eq, i) => m.set(i, evaluateEquation(eq, puzzle, values)));
    return m;
  }, [equations, puzzle, values]);

  // cell -> worst state across its equations
  const cellStates = useMemo(() => {
    const rank: Record<EqState, number> = { partial: 1, ok: 2, wrong: 3 };
    const m = new Map<string, EqState>();
    equations.forEach((eq, i) => {
      const st = eqStates.get(i)!;
      for (const p of eq.cells) {
        const k = cellKey(p.row, p.col);
        const prev = m.get(k);
        if (!prev || rank[st] > rank[prev]) m.set(k, st);
      }
    });
    return m;
  }, [equations, eqStates]);

  useEffect(() => {
    if (solved) return;
    const allFilled = blanks.every((p) => values.has(cellKey(p.row, p.col)));
    if (!allFilled) return;
    const allOk = Array.from(eqStates.values()).every((s) => s === "ok");
    if (allOk && !recordedRef.current) {
      recordedRef.current = true;
      setSolved(true);
      recordSolve(puzzle.id, Date.now() - startTs, hintsUsed);
    }
  }, [blanks, values, eqStates, solved, puzzle.id, startTs, hintsUsed, recordSolve]);

  const setCell = (key: string, value: number | null) => {
    setValues((prev) => {
      const next = new Map(prev);
      if (value === null) next.delete(key);
      else next.set(key, value);
      return next;
    });
    setShowCheck(false);
  };

  const handleNumber = (n: number) => {
    if (!selected || solved) return;
    const cur = values.get(selected);
    // support two-digit input: if current single digit and combined ≤ 99, append
    if (cur !== undefined && cur >= 1 && cur <= 9) {
      const combined = cur * 10 + n;
      if (combined <= 99) {
        setCell(selected, combined);
        return;
      }
    }
    setCell(selected, n);
  };

  const handleErase = () => {
    if (!selected || solved) return;
    setCell(selected, null);
  };

  const useHint = () => {
    if (solved) return;
    const empties = blanks.filter((p) => !values.has(cellKey(p.row, p.col)));
    if (empties.length === 0) return;
    const pick = empties[Math.floor(Math.random() * empties.length)]!;
    const cell = puzzle.cells[pick.row]![pick.col]!;
    if (cell.kind !== "blank") return;
    setCell(cellKey(pick.row, pick.col), cell.solution);
    setHintsUsed((h) => h + 1);
  };

  const restart = () => {
    setValues(new Map());
    setHintsUsed(0);
    setSolved(false);
    setShowCheck(false);
    recordedRef.current = false;
  };

  const filledCount = values.size;
  const progressPct = blanks.length > 0 ? Math.round((filledCount / blanks.length) * 100) : 0;
  const seconds = Math.floor(elapsed / 1000);
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;

  const cellSize = Math.min(56, Math.floor(340 / Math.max(puzzle.rows, puzzle.cols)));

  return (
    <AppShell title={puzzle.name} back="/cruzada">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">
          {mm}:{ss.toString().padStart(2, "0")}
        </span>
        <span className="font-mono">
          {filledCount}/{blanks.length} · <span className="text-accent">{progressPct}%</span>
        </span>
      </div>

      <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        Cada equação (linha e coluna) precisa fechar
      </p>

      <div className="mt-4 flex justify-center overflow-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${puzzle.cols}, ${cellSize}px)`,
            gap: 3,
          }}
        >
          {puzzle.cells.flatMap((row, r) =>
            row.map((cell, c) => {
              const key = cellKey(r, c);
              const sz = { width: cellSize, height: cellSize };

              if (cell.kind === "empty") {
                return <div key={`${r}-${c}`} style={sz} />;
              }

              if (cell.kind === "op") {
                return (
                  <div
                    key={`${r}-${c}`}
                    style={sz}
                    className="flex items-center justify-center font-display text-2xl font-bold text-muted-foreground"
                  >
                    {OP_SYMBOL[cell.op]}
                  </div>
                );
              }

              if (cell.kind === "equals") {
                return (
                  <div
                    key={`${r}-${c}`}
                    style={sz}
                    className="flex items-center justify-center font-display text-2xl font-bold text-muted-foreground"
                  >
                    =
                  </div>
                );
              }

              if (cell.kind === "fixed") {
                return (
                  <div
                    key={`${r}-${c}`}
                    style={sz}
                    className="flex items-center justify-center rounded-md border border-border bg-card font-mono text-lg font-bold text-foreground"
                  >
                    {cell.value}
                  </div>
                );
              }

              // blank
              const val = values.get(key);
              const state = cellStates.get(key);
              const isSel = selected === key;
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => setSelected(key)}
                  disabled={solved}
                  style={sz}
                  className={cn(
                    "flex items-center justify-center rounded-md border-2 font-mono text-lg font-bold transition-colors",
                    "border-dashed border-border/80 bg-secondary/30 text-foreground",
                    isSel && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                    showCheck && state === "ok" && "border-solid !border-primary !bg-primary/20 text-primary",
                    showCheck && state === "wrong" && "border-solid !border-destructive !bg-destructive/20 text-destructive",
                    solved && "border-solid !border-primary !bg-primary/20 text-primary",
                  )}
                >
                  {val ?? ""}
                </button>
              );
            }),
          )}
        </div>
      </div>

      {solved ? (
        <div className="mt-6 space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="font-display text-lg font-bold">Resolvido!</div>
          <div className="text-sm text-muted-foreground">
            Tempo <span className="font-mono text-foreground">{mm}:{ss.toString().padStart(2, "0")}</span>
            {" · "}
            dicas <span className="font-mono text-foreground">{hintsUsed}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={restart}
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
      ) : (
        <>
          <div className="mt-5 grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
              <button
                key={n}
                onClick={() => handleNumber(n)}
                disabled={!selected}
                className={cn(
                  "h-12 rounded-xl border font-mono text-lg font-bold transition-all active:scale-95",
                  selected
                    ? "border-border bg-card text-foreground hover:border-primary/50"
                    : "border-border/50 bg-card/40 text-muted-foreground",
                )}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              onClick={() => setShowCheck((v) => !v)}
              className="rounded-xl bg-secondary/60 py-2 text-xs font-medium text-foreground transition-transform active:scale-95"
            >
              {showCheck ? "Ocultar" : "Verificar"}
            </button>
            <button
              onClick={useHint}
              className="flex items-center justify-center gap-1 rounded-xl bg-accent/20 py-2 text-xs font-medium text-accent transition-transform active:scale-95"
            >
              <Lightbulb className="h-3.5 w-3.5" /> Dica
            </button>
            <button
              onClick={handleErase}
              disabled={!selected}
              className="flex items-center justify-center gap-1 rounded-xl bg-secondary/60 py-2 text-xs font-medium text-foreground transition-transform active:scale-95 disabled:opacity-50"
            >
              <Eraser className="h-3.5 w-3.5" /> Apagar
            </button>
          </div>

          <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded-sm border-2 border-dashed border-border align-middle" />
              editável
            </span>
            <button
              onClick={restart}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-foreground/80 transition-colors hover:text-foreground"
            >
              <RotateCw className="h-3 w-3" /> reiniciar
            </button>
          </div>
        </>
      )}
    </AppShell>
  );
}
