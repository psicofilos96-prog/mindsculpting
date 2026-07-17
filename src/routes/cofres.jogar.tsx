import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, RotateCw, Lightbulb, Clock, Check, X as XIcon,
  CircleDot, HelpCircle, Delete,
} from "lucide-react";
import {
  CATEGORY_LABEL,
  CATEGORY_SYMBOLS,
  DIFFICULTY_LABEL,
  GAME_MODE_LABEL,
  GAME_MODE_THEME,
  THEME_STYLES,
  type Category,
  type CellHypothesis,
  type Difficulty,
  type FeedbackLevel,
  type GameMode,
  type Theme,
  type VaultGame,
} from "@/features/cofres/types";
import {
  createGame,
  submitGuess,
  calculateFeedback,
  toggleExcluded,
  toggleCandidate,
  getHint,
  calculateScore,
} from "@/features/cofres/engine";
import { useCofresStorage } from "@/features/cofres/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cofres/jogar")({
  validateSearch: z.object({
    category: z.enum(["numeric", "letters"]).default("numeric"),
    difficulty: z.enum(["I", "II", "III", "mestre", "einstein"]).default("II"),
    feedbackLevel: z.enum(["easy", "medium", "hard"]).default("easy"),
    gameMode: z.enum(["classic", "timed", "survival", "hacker", "bank", "spy"]).default("classic"),
  }),
  component: CofresGame,
});

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function CofresGame() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { recordSolve } = useCofresStorage();
  const { category, difficulty, feedbackLevel, gameMode } = search;

  const theme: Theme = GAME_MODE_THEME[gameMode];
  const themeStyle = THEME_STYLES[theme];

  const [game, setGame] = useState<VaultGame | null>(null);
  const [currentGuess, setCurrentGuess] = useState<string[]>([]);
  const [hypotheses, setHypotheses] = useState<CellHypothesis>({ candidates: {}, excluded: new Set() });
  const [showNotes, setShowNotes] = useState(false);
  const [notesPosition, setNotesPosition] = useState<number | null>(null);
  const [startMs, setStartMs] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [showEnd, setShowEnd] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [hintFlash, setHintFlash] = useState<{ position: number; value: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedRef = useRef(false);

  // Init game
  useEffect(() => {
    const g = createGame({ category, difficulty, feedbackLevel, gameMode });
    setGame(g);
    setCurrentGuess([]);
    setHypotheses({ candidates: {}, excluded: new Set() });
    setStartMs(Date.now());
    setElapsed(0);
    setShowEnd(false);
    setFinalScore(0);
    setHintFlash(null);
    recordedRef.current = false;
  }, [category, difficulty, feedbackLevel, gameMode]);

  // Timer
  useEffect(() => {
    if (!game || game.solved || game.failed) return;
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startMs);
    }, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game, startMs]);

  // Check game end
  useEffect(() => {
    if (!game || recordedRef.current) return;
    if (game.solved || game.failed) {
      recordedRef.current = true;
      const finalTime = Date.now() - startMs;
      const score = game.solved ? calculateScore(game, finalTime) : 0;
      setFinalScore(score);
      recordSolve({
        difficulty: game.difficulty,
        timeMs: finalTime,
        guessesUsed: game.attempts.length,
        hintsUsed: game.hintsUsed,
        solved: game.solved,
      });
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => setShowEnd(true), 500);
    }
  }, [game, startMs, recordSolve]);

  const symbols = CATEGORY_SYMBOLS[category];
  const length = game?.secret.length ?? 4;
  const maxAttempts = game?.maxAttempts ?? 10;

  const handleSymbolClick = useCallback((sym: string) => {
    if (!game || game.solved || game.failed) return;
    setCurrentGuess((prev) => {
      if (prev.length >= length) return prev;
      return [...prev, sym];
    });
  }, [game, length]);

  const handleBackspace = useCallback(() => {
    setCurrentGuess((prev) => prev.slice(0, -1));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!game || currentGuess.length !== length) return;
    const newGame = submitGuess(game, currentGuess);
    setGame(newGame);
    setCurrentGuess([]);
  }, [game, currentGuess, length]);

  const handleRestart = useCallback(() => {
    const g = createGame({ category, difficulty, feedbackLevel, gameMode });
    setGame(g);
    setCurrentGuess([]);
    setHypotheses({ candidates: {}, excluded: new Set() });
    setStartMs(Date.now());
    setElapsed(0);
    setShowEnd(false);
    setFinalScore(0);
    setHintFlash(null);
    recordedRef.current = false;
  }, [category, difficulty, feedbackLevel, gameMode]);

  const handleHint = useCallback(() => {
    if (!game || game.solved || game.failed) return;
    const hint = getHint(game);
    if (hint) {
      setHintFlash(hint);
      setGame({ ...game, hintsUsed: game.hintsUsed + 1 });
      setTimeout(() => setHintFlash(null), 2000);
    }
  }, [game]);

  const handleToggleExcluded = useCallback((value: string) => {
    setHypotheses((prev) => toggleExcluded(prev, value));
  }, []);

  const handleToggleCandidate = useCallback((position: number, value: string) => {
    setHypotheses((prev) => toggleCandidate(prev, position, value));
  }, []);

  if (!game) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="text-muted-foreground">Gerando senha...</div>
      </div>
    );
  }

  const attemptsRemaining = maxAttempts - game.attempts.length;
  const isTimed = gameMode === "timed" || gameMode === "spy";

  return (
    <div className={cn("flex min-h-svh flex-col", themeStyle.bg)}>
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 backdrop-blur",
        themeStyle.border, themeStyle.header,
      )}>
        <button
          onClick={() => navigate({ to: "/cofres" })}
          className={cn("flex h-8 w-8 items-center justify-center rounded-full border bg-card/60", themeStyle.border, themeStyle.text)}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <span className={cn("rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", themeStyle.accent)}>
            {DIFFICULTY_LABEL[difficulty]}
          </span>
          <span className={cn("text-xs font-semibold", themeStyle.text)}>
            {GAME_MODE_LABEL[gameMode]}
          </span>
          <div className={cn("flex items-center gap-1.5 text-sm", themeStyle.text)}>
            <Clock className={cn("h-3.5 w-3.5", themeStyle.accent)} />
            <span className="font-mono font-bold tabular-nums">{formatTime(elapsed)}</span>
          </div>
        </div>

        <button
          onClick={handleRestart}
          title="Reiniciar"
          className={cn("flex h-8 w-8 items-center justify-center rounded-full border bg-card/60", themeStyle.border, themeStyle.text)}
        >
          <RotateCw className="h-4 w-4" />
        </button>
      </header>

      {/* Attempts counter */}
      <div className={cn("flex items-center justify-center gap-2 px-4 py-2 text-xs", themeStyle.text)}>
        <span className="font-semibold">Tentativas restantes:</span>
        <div className="flex gap-1">
          {Array.from({ length: maxAttempts }, (_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 w-2 rounded-full",
                i < game.attempts.length
                  ? game.attempts[i]?.feedback.exact === length
                    ? "bg-success"
                    : "bg-muted-foreground/40"
                  : theme === "hacker" ? "bg-emerald-500/30"
                  : theme === "bank" ? "bg-amber-500/30"
                  : theme === "spy" ? "bg-rose-500/30"
                  : "bg-primary/30",
              )}
            />
          ))}
        </div>
        <span className="font-mono font-bold">{attemptsRemaining}</span>
      </div>

      <main className="flex flex-1 flex-col items-center gap-3 px-4 pb-4 overflow-y-auto">
        {/* Attempt history */}
        <div className="w-full max-w-md space-y-2">
          {game.attempts.map((attempt, i) => (
            <AttemptRow
              key={i}
              attempt={attempt}
              length={length}
              theme={theme}
              isLatest={i === game.attempts.length - 1}
            />
          ))}

          {/* Current guess */}
          {!game.solved && !game.failed && (
            <div className={cn(
              "rounded-xl border-2 border-dashed p-3",
              themeStyle.border,
              theme === "hacker" ? "bg-emerald-950/20"
              : theme === "bank" ? "bg-amber-950/20"
              : theme === "spy" ? "bg-rose-950/20"
              : "bg-card/40",
            )}>
              <div className="flex justify-center gap-1.5">
                {Array.from({ length }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg border-2 font-display text-lg font-bold",
                      currentGuess[i]
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background/40 text-muted-foreground/30",
                      hintFlash && hintFlash.position === i && "border-accent bg-accent/15 animate-pulse",
                    )}
                  >
                    {currentGuess[i] ?? "·"}
                    {hintFlash && hintFlash.position === i && (
                      <span className="ml-0.5 text-accent text-xs">!</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Hint flash display */}
        {hintFlash && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-semibold",
              theme === "hacker" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : theme === "bank" ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
              : theme === "spy" ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
              : "border-accent/40 bg-accent/10 text-accent",
            )}
          >
            Dica: posição {hintFlash.position + 1} = {hintFlash.value}
          </motion.div>
        )}

        {/* Notes / Hypotheses */}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className={cn("flex items-center gap-1.5 text-xs font-semibold", themeStyle.accent)}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          {showNotes ? "Ocultar anotações" : "Anotações e hipóteses"}
        </button>

        <AnimatePresence>
          {showNotes && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-md"
            >
              <NotesPanel
                symbols={symbols}
                hypotheses={hypotheses}
                length={length}
                onToggleExcluded={handleToggleExcluded}
                onToggleCandidate={handleToggleCandidate}
                notesPosition={notesPosition}
                setNotesPosition={setNotesPosition}
                theme={theme}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="mt-auto w-full max-w-md space-y-2">
          <div className="flex gap-2">
            <CtrlButton onClick={handleHint} icon={<Lightbulb className="h-4 w-4" />} label="Dica" accent theme={theme} />
            <CtrlButton onClick={handleBackspace} disabled={currentGuess.length === 0} icon={<Delete className="h-4 w-4" />} label="Apagar" theme={theme} />
            <CtrlButton
              onClick={handleSubmit}
              disabled={currentGuess.length !== length}
              icon={<Check className="h-4 w-4" />}
              label="Confirmar"
              confirm
              theme={theme}
            />
          </div>

          {/* Symbol keyboard */}
          <div className={cn("grid gap-1.5", category === "numeric" ? "grid-cols-5" : "grid-cols-6")}>
            {symbols.map((sym) => {
              const isExcluded = hypotheses.excluded.has(sym);
              return (
                <button
                  key={sym}
                  onClick={() => handleSymbolClick(sym)}
                  disabled={game.solved || game.failed || isExcluded}
                  className={cn(
                    "flex h-12 items-center justify-center rounded-xl border-2 font-display text-lg font-bold transition-all active:scale-95",
                    isExcluded
                      ? "border-destructive/30 bg-destructive/5 text-muted-foreground/30 line-through"
                      : cn("border-border bg-card hover:border-primary/50 hover:bg-primary/10", themeStyle.text),
                  )}
                >
                  {sym}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* End overlay */}
      <AnimatePresence>
        {showEnd && (
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
                {game.solved ? (
                  <Check className="mx-auto h-12 w-12 text-success" />
                ) : (
                  <XIcon className="mx-auto h-12 w-12 text-destructive" />
                )}
              </div>
              <h2 className={cn("text-center font-display text-2xl font-bold", game.solved ? "text-gradient-neural" : "text-destructive")}>
                {game.solved ? "Cofre Aberto!" : "Sem Tentativas"}
              </h2>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                {GAME_MODE_LABEL[gameMode]} · {DIFFICULTY_LABEL[difficulty]}
              </p>

              {/* Reveal secret */}
              <div className="mt-3 rounded-xl border border-border bg-secondary/30 p-3">
                <div className="text-center text-[10px] uppercase tracking-wider text-muted-foreground">Senha</div>
                <div className="mt-1 flex justify-center gap-1">
                  {game.secret.map((s, i) => (
                    <div key={i} className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card font-display text-lg font-bold text-foreground">
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              {game.solved && (
                <div className="mt-5 grid grid-cols-4 gap-2">
                  <ResultStat label="Pontos" value={String(finalScore)} />
                  <ResultStat label="Tempo" value={formatTime(elapsed)} />
                  <ResultStat label="Tentativas" value={String(game.attempts.length)} />
                  <ResultStat label="Dicas" value={String(game.hintsUsed)} />
                </div>
              )}

              <div className="mt-5 space-y-2">
                <button
                  onClick={handleRestart}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-neural py-3.5 font-display text-base font-bold text-primary-foreground shadow-glow-primary active:scale-[0.98]"
                >
                  <RotateCw className="h-4 w-4" />
                  Novo cofre
                </button>
                <button
                  onClick={() => navigate({ to: "/cofres" })}
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

// ── Attempt row ──────────────────────────────────────────────────────────────

function AttemptRow({
  attempt,
  length,
  theme,
  isLatest,
}: {
  attempt: { guess: string[]; feedback: { exact: number; partial: number; display: string } };
  length: number;
  theme: Theme;
  isLatest: boolean;
}) {
  const allCorrect = attempt.feedback.exact === length;

  return (
    <motion.div
      initial={isLatest ? { opacity: 0, x: -20 } : false}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-2.5",
        allCorrect
          ? "border-success/50 bg-success/10"
          : theme === "hacker" ? "border-emerald-500/20 bg-emerald-950/10"
          : theme === "bank" ? "border-amber-500/20 bg-amber-950/10"
          : theme === "spy" ? "border-rose-500/20 bg-rose-950/10"
          : "border-border bg-card/60",
      )}
    >
      {/* Guess symbols */}
      <div className="flex gap-1">
        {attempt.guess.map((sym, i) => (
          <div
            key={i}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md border font-display text-base font-bold",
              i < attempt.feedback.exact
                ? "border-success bg-success/15 text-success"
                : "border-border bg-card text-foreground",
            )}
          >
            {sym}
          </div>
        ))}
      </div>

      {/* Feedback */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {/* Visual pins */}
          <div className="flex gap-0.5">
            {Array.from({ length: attempt.feedback.exact }, (_, i) => (
              <div key={`e${i}`} className="h-2.5 w-2.5 rounded-full bg-success" />
            ))}
            {Array.from({ length: attempt.feedback.partial }, (_, i) => (
              <div key={`p${i}`} className="h-2.5 w-2.5 rounded-full border-2 border-primary bg-primary/20" />
            ))}
          </div>
          {/* Text feedback */}
          <span className={cn(
            "text-xs font-medium",
            allCorrect ? "text-success font-bold" : "text-muted-foreground",
          )}>
            {attempt.feedback.display}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Notes panel ──────────────────────────────────────────────────────────────

function NotesPanel({
  symbols,
  hypotheses,
  length,
  onToggleExcluded,
  onToggleCandidate,
  notesPosition,
  setNotesPosition,
  theme,
}: {
  symbols: string[];
  hypotheses: CellHypothesis;
  length: number;
  onToggleExcluded: (v: string) => void;
  onToggleCandidate: (pos: number, v: string) => void;
  notesPosition: number | null;
  setNotesPosition: (p: number | null) => void;
  theme: Theme;
}) {
  const accentColor = theme === "hacker" ? "text-emerald-400"
    : theme === "bank" ? "text-amber-400"
    : theme === "spy" ? "text-rose-400"
    : "text-primary";

  return (
    <div className={cn("rounded-xl border p-3", theme === "hacker" ? "border-emerald-500/20 bg-emerald-950/10" : theme === "bank" ? "border-amber-500/20 bg-amber-950/10" : theme === "spy" ? "border-rose-500/20 bg-rose-950/10" : "border-border bg-card/60")}>
      {/* Excluded values */}
      <div className="mb-3">
        <div className={cn("mb-1.5 text-[10px] font-semibold uppercase tracking-wider", accentColor)}>
          Valores descartados (não existem na senha)
        </div>
        <div className="flex flex-wrap gap-1">
          {symbols.map((sym) => {
            const isExcluded = hypotheses.excluded.has(sym);
            return (
              <button
                key={sym}
                onClick={() => onToggleExcluded(sym)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border font-display text-sm font-bold transition-all active:scale-95",
                  isExcluded
                    ? "border-destructive bg-destructive/15 text-destructive line-through"
                    : "border-border bg-card/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {sym}
              </button>
            );
          })}
        </div>
      </div>

      {/* Candidates per position */}
      <div>
        <div className={cn("mb-1.5 text-[10px] font-semibold uppercase tracking-wider", accentColor)}>
          Candidatos por posição
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length }, (_, pos) => (
            <button
              key={pos}
              onClick={() => setNotesPosition(notesPosition === pos ? null : pos)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md border text-xs font-bold transition-all",
                notesPosition === pos
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-card/60 text-muted-foreground",
              )}
            >
              {pos + 1}
            </button>
          ))}
        </div>

        {notesPosition !== null && (
          <div className="mt-2">
            <div className="mb-1 text-[10px] text-muted-foreground">
              Candidatos para posição {notesPosition + 1}:
            </div>
            <div className="flex flex-wrap gap-1">
              {symbols.map((sym) => {
                const isCandidate = (hypotheses.candidates[notesPosition] ?? new Set()).has(sym);
                const isExcluded = hypotheses.excluded.has(sym);
                return (
                  <button
                    key={sym}
                    onClick={() => onToggleCandidate(notesPosition, sym)}
                    disabled={isExcluded}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md border font-display text-sm font-bold transition-all active:scale-95",
                      isCandidate
                        ? "border-amber-500 bg-amber-500/15 text-amber-500"
                        : isExcluded
                        ? "border-destructive/20 text-muted-foreground/30"
                        : "border-border bg-card/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Control button ───────────────────────────────────────────────────────────

function CtrlButton({
  onClick, disabled, icon, label, accent, confirm, theme,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
  confirm?: boolean;
  theme: Theme;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all active:scale-95",
        disabled
          ? "border-border bg-card/30 text-muted-foreground/50"
          : confirm
          ? "border-success bg-success/15 text-success hover:bg-success/25"
          : accent
          ? theme === "hacker" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
          : theme === "bank" ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
          : theme === "spy" ? "border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
          : "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
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
    <div className="rounded-xl border border-border bg-secondary/30 p-2 text-center">
      <div className="font-mono text-sm font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
