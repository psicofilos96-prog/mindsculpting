import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, RotateCw, Lightbulb, Clock, Check, AlertTriangle,
  CircleCheck as CheckCircle2,
} from "lucide-react";
import type {
  Category,
  Difficulty,
  GameMode,
  Hint,
  Puzzle,
} from "@/features/einstein/types";
import {
  generatePuzzle,
  generateDailyPuzzle,
  themeToPuzzle,
  generateHint,
  checkSolution,
  isGridComplete,
  isGridValid,
  findViolatedClues,
} from "@/features/einstein/engine";
import { THEMES } from "@/features/einstein/themes";
import { useEinsteinStorage } from "@/features/einstein/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/einstein/jogar")({
  validateSearch: z.object({
    themeId: z.string().default("einstein_original"),
    difficulty: z.enum(["easy", "medium", "hard", "expert"]).default("medium"),
    gameMode: z.enum(["campaign", "daily", "endless", "timed"]).default("campaign"),
  }),
  component: EinsteinGame,
});

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function EinsteinGame() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { recordSolve, setCampaignLevel } = useEinsteinStorage();
  const { themeId, difficulty, gameMode } = search;

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [playerGrid, setPlayerGrid] = useState<Record<string, string>[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; cat: string } | null>(null);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hint, setHint] = useState<Hint | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [solved, setSolved] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [startMs, setStartMs] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedRef = useRef(false);

  // Generate puzzle
  const theme = useMemo(() => THEMES.find((t) => t.id === themeId) ?? THEMES[0]!, [themeId]);

  useEffect(() => {
    let p: Puzzle;
    if (gameMode === "daily") {
      p = generateDailyPuzzle(THEMES);
    } else if (gameMode === "endless" || gameMode === "timed") {
      p = generatePuzzle(theme, difficulty);
    } else {
      // Campaign: use the theme's pre-built puzzle
      p = themeToPuzzle(theme, difficulty);
    }
    setPuzzle(p);
    setPlayerGrid(
      Array.from({ length: p.numHouses }, () => {
        const house: Record<string, string> = {};
        for (const cat of p.categories) {
          house[cat.name] = "";
        }
        return house;
      }),
    );
    setSelectedCell(null);
    setSelectedValue(null);
    setHintsUsed(0);
    setHint(null);
    setShowHint(false);
    setSolved(false);
    setShowWin(false);
    setStartMs(Date.now());
    setElapsed(0);
    recordedRef.current = false;
  }, [themeId, difficulty, gameMode, theme]);

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
    if (!puzzle || recordedRef.current) return;
    if (isGridComplete(playerGrid, puzzle.categories, puzzle.numHouses)) {
      if (checkSolution(playerGrid, puzzle.solution)) {
        recordedRef.current = true;
        setSolved(true);
        if (timerRef.current) clearInterval(timerRef.current);
        const finalTime = Date.now() - startMs;
        recordSolve({ timeMs: finalTime, hintsUsed, solved: true, themeId });
        if (gameMode === "campaign") {
          setCampaignLevel(1);
        }
        setTimeout(() => setShowWin(true), 400);
      }
    }
  }, [playerGrid, puzzle, startMs, hintsUsed, recordSolve, gameMode, themeId, setCampaignLevel]);

  // Violated clues
  const violatedClues = useMemo(() => {
    if (!puzzle) return [];
    return findViolatedClues(playerGrid, puzzle.clues, puzzle.categories);
  }, [playerGrid, puzzle]);

  const handleCellClick = useCallback((row: number, cat: string) => {
    if (solved) return;
    setSelectedCell({ row, cat });
    setSelectedValue(playerGrid[row]?.[cat] ?? null);
  }, [solved, playerGrid]);

  const handleValueSelect = useCallback((value: string) => {
    if (!selectedCell || !puzzle || solved) return;
    const { row, cat } = selectedCell;

    // Check if value is already used in this category
    for (let h = 0; h < puzzle.numHouses; h++) {
      if (h !== row && playerGrid[h]?.[cat] === value) {
        // Remove from old position (reassign)
        setPlayerGrid((prev) => {
          const next = [...prev];
          next[h] = { ...next[h]!, [cat]: "" };
          next[row] = { ...next[row]!, [cat]: value };
          return next;
        });
        setSelectedCell(null);
        setSelectedValue(null);
        return;
      }
    }

    setPlayerGrid((prev) => {
      const next = [...prev];
      next[row] = { ...next[row]!, [cat]: value };
      return next;
    });
    setSelectedCell(null);
    setSelectedValue(null);
  }, [selectedCell, puzzle, solved, playerGrid]);

  const handleClearCell = useCallback(() => {
    if (!selectedCell || solved) return;
    const { row, cat } = selectedCell;
    setPlayerGrid((prev) => {
      const next = [...prev];
      next[row] = { ...next[row]!, [cat]: "" };
      return next;
    });
    setSelectedCell(null);
    setSelectedValue(null);
  }, [selectedCell, solved]);

  const handleHint = useCallback(() => {
    if (!puzzle || solved) return;
    const h = generateHint(playerGrid, puzzle.categories, puzzle.numHouses, puzzle.clues, puzzle.solution);
    if (h) {
      setHint(h);
      setShowHint(true);
      setHintsUsed((n) => n + 1);
    }
  }, [puzzle, playerGrid, solved]);

  const handleRestart = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPlayerGrid(
      Array.from({ length: puzzle?.numHouses ?? 5 }, () => {
        const house: Record<string, string> = {};
        for (const cat of puzzle?.categories ?? []) {
          house[cat.name] = "";
        }
        return house;
      }),
    );
    setSelectedCell(null);
    setSelectedValue(null);
    setHintsUsed(0);
    setHint(null);
    setShowHint(false);
    setSolved(false);
    setShowWin(false);
    setStartMs(Date.now());
    setElapsed(0);
    recordedRef.current = false;
  }, [puzzle]);

  if (!puzzle) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="text-muted-foreground">Gerando puzzle...</div>
      </div>
    );
  }

  // Build value picker options for the selected category
  const pickerValues = selectedCell
    ? puzzle.categories.find((c) => c.name === selectedCell.cat)?.values ?? []
    : [];

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/einstein" })}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            {puzzle.themeName}
          </span>
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono font-bold tabular-nums text-foreground">{formatTime(elapsed)}</span>
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

      <main className="flex flex-1 flex-col gap-3 px-4 py-4 overflow-y-auto">
        {/* Question banner */}
        {puzzle.question && (
          <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">Pergunta</span>
            <p className="mt-1 text-sm font-bold text-foreground">{puzzle.question}</p>
          </div>
        )}

        {/* Grid */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background p-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Casa
                </th>
                {Array.from({ length: puzzle.numHouses }, (_, i) => (
                  <th key={i} className="p-1.5 text-center text-xs font-bold text-primary">
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {puzzle.categories.map((cat) => (
                <tr key={cat.name}>
                  <td className="sticky left-0 z-10 bg-background p-1.5 text-left text-[10px] font-semibold text-muted-foreground">
                    {cat.name}
                  </td>
                  {Array.from({ length: puzzle.numHouses }, (_, h) => {
                    const val = playerGrid[h]?.[cat.name] ?? "";
                    const isSelected = selectedCell?.row === h && selectedCell?.cat === cat.name;
                    const isCorrect = val !== "" && val === puzzle.solution[h]?.[cat.name];
                    const isWrong = val !== "" && val !== puzzle.solution[h]?.[cat.name];

                    return (
                      <td key={h} className="p-1">
                        <button
                          onClick={() => handleCellClick(h, cat.name)}
                          className={cn(
                            "flex min-h-9 w-full min-w-16 items-center justify-center rounded-md border-2 px-1 py-1.5 text-xs font-semibold transition-all active:scale-95",
                            isSelected
                              ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                              : isCorrect
                              ? "border-success/40 bg-success/10 text-success"
                              : isWrong && violatedClues.length > 0
                              ? "border-destructive/40 bg-destructive/5 text-destructive"
                              : val
                              ? "border-border bg-card text-foreground"
                              : "border-border bg-card/40 text-muted-foreground/30 hover:bg-card/70",
                          )}
                        >
                          {val || "·"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Clues */}
        <div className="w-full">
          <h3 className="mb-2 px-1 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pistas ({puzzle.clues.length})
          </h3>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border bg-card/40 p-2">
            {puzzle.clues.map((clue, i) => {
              const isViolated = violatedClues.some((c) => c.id === clue.id);
              return (
                <div
                  key={clue.id}
                  className={cn(
                    "flex items-start gap-1.5 rounded-md px-2 py-1.5 text-xs",
                    isViolated
                      ? "bg-destructive/10 text-destructive"
                      : "text-foreground/80",
                  )}
                >
                  {isViolated && <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />}
                  <span className="font-mono text-[10px] text-muted-foreground">{i + 1}.</span>
                  <span>{clue.text}</span>
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
              className="rounded-xl border border-accent/40 bg-accent/10 p-3"
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

        {/* Value picker */}
        <div className="mt-auto space-y-2 pb-4">
          {selectedCell && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Selecionando: <span className="font-semibold text-foreground">{selectedCell.cat}</span> na casa {selectedCell.row + 1}
              </span>
              <button
                onClick={handleClearCell}
                className="text-xs font-medium text-destructive hover:text-destructive/80"
              >
                Limpar
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleHint}
              className="flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2.5 text-sm font-semibold text-accent transition-all active:scale-95 hover:bg-accent/20"
            >
              <Lightbulb className="h-4 w-4" />
              Dica
            </button>
          </div>

          {selectedCell && (
            <div className="flex flex-wrap gap-1.5">
              {pickerValues.map((val) => {
                // Check if already used
                let usedElsewhere = false;
                for (let h = 0; h < puzzle.numHouses; h++) {
                  if (h !== selectedCell.row && playerGrid[h]?.[selectedCell.cat] === val) {
                    usedElsewhere = true;
                    break;
                  }
                }
                return (
                  <button
                    key={val}
                    onClick={() => handleValueSelect(val)}
                    className={cn(
                      "flex items-center justify-center rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all active:scale-95",
                      usedElsewhere
                        ? "border-border bg-secondary/30 text-muted-foreground/50"
                        : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/10",
                    )}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          )}
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
                {puzzle.themeName}
              </p>

              {puzzle.question && puzzle.answer && (
                <div className="mt-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-center">
                  <div className="text-xs text-muted-foreground">{puzzle.question}</div>
                  <div className="mt-1 font-display text-lg font-bold text-accent">{puzzle.answer}</div>
                </div>
              )}

              <div className="mt-5 grid grid-cols-3 gap-2">
                <ResultStat label="Tempo" value={formatTime(elapsed)} />
                <ResultStat label="Dicas" value={String(hintsUsed)} />
                <ResultStat label="Pistas" value={String(puzzle.clues.length)} />
              </div>

              <div className="mt-5 space-y-2">
                <button
                  onClick={handleRestart}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-neural py-3.5 font-display text-base font-bold text-primary-foreground shadow-glow-primary active:scale-[0.98]"
                >
                  <RotateCw className="h-4 w-4" />
                  Jogar novamente
                </button>
                <button
                  onClick={() => navigate({ to: "/einstein" })}
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

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-2 text-center">
      <div className="font-mono text-sm font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
