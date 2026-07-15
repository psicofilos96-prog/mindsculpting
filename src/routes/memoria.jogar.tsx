import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Delete, Check } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { arraysEqual, expectedAnswer, generateProblem, alphabetPool } from "@/features/memoria/engine";
import {
  MEMORIA_CHUNK_PAUSE_MS,
  MEMORIA_GAP_MS,
  MEMORIA_INITIAL_LENGTH,
  MEMORIA_MAX_LENGTH,
  MEMORIA_MIN_LENGTH,
  MEMORIA_MODE_LABEL,
  MEMORIA_ROUNDS_PER_SESSION,
  MemoriaAlphabetSchema,
  MemoriaDisplaySchema,
  MemoriaInputSchema,
  MemoriaLengthModeSchema,
  MemoriaModeSchema,
  type MemoriaAlphabet,
  type MemoriaDisplay,
  type MemoriaInput,
  type MemoriaLengthMode,
  type MemoriaMode,
  type MemoriaProblem,
} from "@/features/memoria/types";
import { useLocalProgress } from "@/features/progress/useLocalProgress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/memoria/jogar")({
  validateSearch: z.object({
    mode: MemoriaModeSchema.optional(),
    alphabet: MemoriaAlphabetSchema.optional(),
    input: MemoriaInputSchema.optional(),
    display: MemoriaDisplaySchema.optional(),
    lengthMode: MemoriaLengthModeSchema.optional(),
    fixedLength: z.number().int().optional(),
    totalTimeMs: z.number().int().optional(),
    chunking: z.union([z.literal(0), z.literal(1)]).optional(),
  }),
  component: JogarMemoria,
});

type Phase = "countdown" | "sequence" | "gap" | "whole" | "answer" | "feedback";

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch { /* noop */ }
  }
}

function JogarMemoria() {
  const search = Route.useSearch() as {
    mode?: MemoriaMode;
    alphabet?: MemoriaAlphabet;
    input?: MemoriaInput;
    display?: MemoriaDisplay;
    lengthMode?: MemoriaLengthMode;
    fixedLength?: number;
    totalTimeMs?: number;
    chunking?: 0 | 1;
  };
  const navigate = useNavigate();
  const { state, addMemoriaRound } = useLocalProgress();

  const prefs = state.memoriaPrefs;
  const mode = search.mode ?? prefs.mode;
  const alphabet = search.alphabet ?? prefs.alphabet;
  const input = mode === "position" ? "choices" : (search.input ?? prefs.input);
  const display: MemoriaDisplay =
    mode === "position" ? "sequential" : (search.display ?? prefs.display);
  const lengthMode = search.lengthMode ?? prefs.lengthMode;
  const fixedLength = search.fixedLength ?? prefs.fixedLength;
  const totalTimeMs = search.totalTimeMs ?? prefs.totalTimeMs;
  const chunking = search.chunking !== undefined ? search.chunking === 1 : prefs.chunking;

  const initialLength =
    lengthMode === "fixed"
      ? Math.max(MEMORIA_MIN_LENGTH, Math.min(MEMORIA_MAX_LENGTH, fixedLength))
      : MEMORIA_INITIAL_LENGTH;

  const [round, setRound] = useState(0);
  const [length, setLength] = useState(initialLength);
  const [problem, setProblem] = useState<MemoriaProblem>(() =>
    generateProblem(mode, alphabet, initialLength),
  );
  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [stepIdx, setStepIdx] = useState(0);
  const [answer, setAnswer] = useState<string[]>([]);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [maxLength, setMaxLength] = useState(initialLength);
  const [times, setTimes] = useState<number[]>([]);
  const answerStartRef = useRef<number>(0);

  const perItemMs = Math.max(300, Math.round(totalTimeMs / Math.max(1, length)));

  // Countdown 3-2-1 → primeira exibição
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      if (display === "whole") {
        setPhase("whole");
      } else {
        setStepIdx(0);
        setPhase("sequence");
      }
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, countdown, display]);

  // Whole mode: mostra sequência inteira por totalTimeMs
  useEffect(() => {
    if (phase !== "whole") return;
    const t = setTimeout(() => {
      setPhase("answer");
      setAnswer([]);
      answerStartRef.current = performance.now();
    }, totalTimeMs);
    return () => clearTimeout(t);
  }, [phase, totalTimeMs]);

  // Sequential: item → gap → próximo
  useEffect(() => {
    if (phase === "sequence") {
      const t = setTimeout(() => setPhase("gap"), perItemMs);
      return () => clearTimeout(t);
    }
    if (phase === "gap") {
      const isChunkBoundary = chunking && (stepIdx + 1) % 3 === 0 && stepIdx + 1 < problem.sequence.length;
      const wait = isChunkBoundary ? MEMORIA_CHUNK_PAUSE_MS : MEMORIA_GAP_MS;
      const t = setTimeout(() => {
        if (stepIdx + 1 >= problem.sequence.length) {
          setPhase("answer");
          setAnswer([]);
          answerStartRef.current = performance.now();
        } else {
          setStepIdx((i) => i + 1);
          setPhase("sequence");
        }
      }, wait);
      return () => clearTimeout(t);
    }
  }, [phase, stepIdx, problem.sequence.length, chunking, perItemMs]);

  const finalize = useCallback(
    (submitted: string[]) => {
      const expected = expectedAnswer(problem);
      const isCorrect = arraysEqual(submitted, expected);
      const elapsed = performance.now() - answerStartRef.current;
      setTimes((prev) => [...prev, elapsed]);
      setLastCorrect(isCorrect);
      vibrate(isCorrect ? 30 : [60, 40, 60]);
      if (isCorrect) setCorrectCount((c) => c + 1);
      setPhase("feedback");
    },
    [problem],
  );

  const nextRound = useCallback(() => {
    if (round + 1 >= MEMORIA_ROUNDS_PER_SESSION) {
      const avgMs = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
      addMemoriaRound({
        mode,
        alphabet,
        correct: correctCount,
        total: MEMORIA_ROUNDS_PER_SESSION,
        maxLength,
        avgMs,
        playedAt: Date.now(),
      });
      navigate({
        to: "/memoria/resultado",
        search: {
          mode,
          alphabet,
          correct: correctCount,
          total: MEMORIA_ROUNDS_PER_SESSION,
          maxLength,
          avgMs,
        },
      });
      return;
    }
    const nextLen =
      lengthMode === "fixed"
        ? length
        : Math.min(MEMORIA_MAX_LENGTH, Math.max(MEMORIA_MIN_LENGTH, length + (lastCorrect ? 1 : -1)));
    setLength(nextLen);
    setMaxLength((m) => Math.max(m, nextLen));
    setRound((r) => r + 1);
    setProblem(generateProblem(mode, alphabet, nextLen));
    setStepIdx(0);
    setAnswer([]);
    setLastCorrect(null);
    setCountdown(1);
    setPhase("countdown");
  }, [round, times, correctCount, mode, alphabet, length, lastCorrect, maxLength, lengthMode, addMemoriaRound, navigate]);

  useEffect(() => {
    if (phase !== "feedback") return;
    const t = setTimeout(nextRound, 1400);
    return () => clearTimeout(t);
  }, [phase, nextRound]);

  const totalItems = problem.sequence.length;
  const progress =
    phase === "sequence" || phase === "gap"
      ? ((stepIdx + 1) / totalItems) * 100
      : phase === "countdown"
        ? 0
        : phase === "whole"
          ? 50
          : 100;

  const wholeText = useMemo(
    () => (alphabet === "digits" ? problem.sequence.join("") : problem.sequence.join(" ")),
    [problem.sequence, alphabet],
  );

  const handleAdd = (sym: string) => {
    setAnswer((prev) => {
      const target = mode === "position" ? 1 : totalItems;
      if (prev.length >= target) return prev;
      const next = [...prev, sym];
      if (next.length >= target && mode !== "position") {
        setTimeout(() => finalize(next), 0);
      }
      return next;
    });
  };

  const handleBackspace = () => setAnswer((prev) => prev.slice(0, -1));

  return (
    <AppShell title={MEMORIA_MODE_LABEL[mode].label} back="/memoria">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">
          Rodada {Math.min(round + 1, MEMORIA_ROUNDS_PER_SESSION)}/{MEMORIA_ROUNDS_PER_SESSION}
        </span>
        <span className="font-mono">
          Acertos: <span className="text-foreground">{correctCount}</span>
          <span className="ml-2 text-accent">len {length}</span>
        </span>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-secondary/60">
        <div
          className="h-full bg-gradient-neural transition-all duration-200 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-6 flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-border bg-card/60 p-6 shadow-card">
        <AnimatePresence mode="wait">
          {phase === "countdown" && (
            <motion.div
              key={`cd-${countdown}`}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.3 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Prepare-se
              </div>
              <div className="font-display text-6xl font-bold text-muted-foreground/70">
                {countdown > 0 ? countdown : "•"}
              </div>
            </motion.div>
          )}

          {phase === "sequence" && (
            <motion.div
              key={`seq-${stepIdx}-${round}`}
              initial={{ opacity: 0, scale: 0.6, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.3, filter: "blur(12px)" }}
              transition={{ duration: 0.2 }}
              className="font-mono text-7xl font-bold tabular-nums text-gradient-neural"
            >
              {problem.sequence[stepIdx]}
            </motion.div>
          )}

          {phase === "gap" && (
            <motion.div key={`gap-${stepIdx}`} className="h-20" />
          )}

          {phase === "whole" && (
            <motion.div
              key={`whole-${round}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, filter: "blur(12px)" }}
              transition={{ duration: 0.25 }}
              className="text-center"
            >
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Memorize
              </div>
              <div
                className={cn(
                  "font-mono font-bold tabular-nums text-gradient-neural break-all",
                  wholeText.length > 8 ? "text-4xl" : "text-6xl",
                )}
              >
                {wholeText}
              </div>
              <WholeTimer durationMs={totalTimeMs} />
            </motion.div>
          )}

          {phase === "answer" && (
            <motion.div
              key={`ans-${round}`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.3 }}
              transition={{ duration: 0.2 }}
              className="font-mono text-6xl font-bold tabular-nums text-accent"
            >
              {mode === "position" ? `${problem.askIndex + 1}º ?` : "?"}
            </motion.div>
          )}

          {phase === "feedback" && (
            <motion.div
              key={`fb-${round}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "text-center font-mono text-4xl font-bold tabular-nums",
                lastCorrect ? "text-[color:var(--color-success)]" : "text-destructive",
              )}
            >
              {problem.sequence.join(alphabet === "digits" ? "" : " ")}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase === "answer" && (
        <div className="mt-6">
          {mode !== "position" && (
            <AnswerRow
              answer={answer}
              expectedLength={totalItems}
              onBackspace={handleBackspace}
            />
          )}

          {mode === "position" ? (
            <div className="grid grid-cols-5 gap-2">
              {problem.choices.map((c) => (
                <button
                  key={c}
                  onClick={() => finalize([c])}
                  className="flex h-16 items-center justify-center rounded-xl border border-border bg-card font-mono text-2xl font-bold text-foreground transition-all active:scale-95 hover:border-primary/50 hover:shadow-glow-primary"
                >
                  {c}
                </button>
              ))}
            </div>
          ) : input === "tap" ? (
            <SymbolGrid
              symbols={alphabetPool(alphabet)}
              onPress={handleAdd}
              onBackspace={handleBackspace}
              onSubmit={() => finalize(answer)}
              canSubmit={answer.length === totalItems}
            />
          ) : (
            <Keypad
              symbols={alphabetPool(alphabet)}
              onPress={handleAdd}
              onBackspace={handleBackspace}
              onSubmit={() => finalize(answer)}
              canSubmit={answer.length === totalItems}
              alphabet={alphabet}
            />
          )}
        </div>
      )}

      {phase === "feedback" && lastCorrect !== null && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mt-4 rounded-2xl border p-3 text-center",
            lastCorrect
              ? "border-[color:var(--color-success)]/50 bg-[color:var(--color-success)]/10"
              : "border-destructive/50 bg-destructive/10",
          )}
        >
          <div
            className={cn(
              "font-display text-lg font-bold",
              lastCorrect ? "text-[color:var(--color-success)]" : "text-destructive",
            )}
          >
            {lastCorrect ? "Correto!" : "Errado"}
          </div>
          {mode === "reverse" && (
            <div className="mt-1 text-xs text-muted-foreground">
              esperado (reverso):{" "}
              <span className="font-mono font-bold text-foreground">
                {[...problem.sequence].reverse().join(alphabet === "digits" ? "" : " ")}
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AppShell>
  );
}

function WholeTimer({ durationMs }: { durationMs: number }) {
  return (
    <div className="mx-auto mt-4 h-1 w-40 overflow-hidden rounded-full bg-secondary/60">
      <motion.div
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: durationMs / 1000, ease: "linear" }}
        className="h-full bg-gradient-neural"
      />
    </div>
  );
}

function AnswerRow({
  answer,
  expectedLength,
  onBackspace,
}: {
  answer: string[];
  expectedLength: number;
  onBackspace: () => void;
}) {
  return (
    <div className="mb-3 flex items-start gap-2">
      <div className="flex flex-1 flex-wrap gap-1.5 rounded-xl border border-border bg-card/60 p-2 font-mono text-xl font-bold tabular-nums min-h-[3.5rem]">
        {Array.from({ length: expectedLength }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md border text-lg",
              answer[i]
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-dashed border-border text-muted-foreground",
            )}
          >
            {answer[i] ?? "·"}
          </span>
        ))}
      </div>
      <button
        onClick={onBackspace}
        disabled={answer.length === 0}
        aria-label="Apagar"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary/70 text-foreground transition-transform active:scale-95 disabled:opacity-40"
      >
        <Delete className="h-5 w-5" />
      </button>
    </div>
  );
}

function Keypad({
  symbols,
  onPress,
  onBackspace,
  onSubmit,
  canSubmit,
  alphabet,
}: {
  symbols: readonly string[];
  onPress: (s: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  alphabet: MemoriaAlphabet;
}) {
  if (alphabet === "digits") {
    const layout = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "ok"];
    return (
      <div className="grid grid-cols-3 gap-2">
        {layout.map((k, idx) => (
          <KeypadKey
            key={`${k}-${idx}`}
            k={k}
            onPress={onPress}
            onBackspace={onBackspace}
            onSubmit={onSubmit}
            canSubmit={canSubmit}
          />
        ))}
      </div>
    );
  }
  // letters or mixed: symbol grid + back + ok
  return (
    <div className="space-y-2">
      <div className={cn("grid gap-2", symbols.length > 12 ? "grid-cols-6" : "grid-cols-4")}>
        {symbols.map((s) => (
          <button
            key={s}
            onClick={() => onPress(s)}
            className="flex h-12 items-center justify-center rounded-xl bg-secondary/70 font-mono text-lg font-semibold text-foreground transition-transform active:scale-95 hover:bg-secondary"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onBackspace}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary/70 text-sm font-medium text-foreground transition-transform active:scale-95"
        >
          <Delete className="h-4 w-4" /> Apagar
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-neural text-sm font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-95 disabled:opacity-40 disabled:shadow-none"
        >
          <Check className="h-4 w-4" /> Confirmar
        </button>
      </div>
    </div>
  );
}

function KeypadKey({
  k,
  onPress,
  onBackspace,
  onSubmit,
  canSubmit,
}: {
  k: string;
  onPress: (s: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
}) {
  if (k === "back") {
    return (
      <button
        onClick={onBackspace}
        aria-label="Apagar"
        className="flex h-14 items-center justify-center rounded-xl bg-secondary/70 text-foreground transition-transform active:scale-95"
      >
        <Delete className="h-5 w-5" />
      </button>
    );
  }
  if (k === "ok") {
    return (
      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        aria-label="Confirmar"
        className="flex h-14 items-center justify-center rounded-xl bg-gradient-neural text-primary-foreground shadow-glow-primary transition-transform active:scale-95 disabled:opacity-40 disabled:shadow-none"
      >
        <Check className="h-5 w-5" />
      </button>
    );
  }
  return (
    <button
      onClick={() => onPress(k)}
      className="flex h-14 items-center justify-center rounded-xl bg-secondary/70 font-mono text-xl font-semibold text-foreground transition-transform active:scale-95 hover:bg-secondary"
    >
      {k}
    </button>
  );
}

function SymbolGrid({
  symbols,
  onPress,
  onBackspace,
  onSubmit,
  canSubmit,
}: {
  symbols: readonly string[];
  onPress: (s: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
}) {
  const cols =
    symbols.length <= 10 ? "grid-cols-5" : symbols.length <= 12 ? "grid-cols-4" : "grid-cols-6";
  return (
    <div className="space-y-2">
      <div className={cn("grid gap-2", cols)}>
        {symbols.map((s) => (
          <button
            key={s}
            onClick={() => onPress(s)}
            className="flex h-12 items-center justify-center rounded-xl border border-border bg-card font-mono text-lg font-bold text-foreground transition-all active:scale-95 hover:border-primary/50"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onBackspace}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary/70 text-sm font-medium text-foreground transition-transform active:scale-95"
        >
          <Delete className="h-4 w-4" /> Apagar
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-neural text-sm font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-95 disabled:opacity-40 disabled:shadow-none"
        >
          <Check className="h-4 w-4" /> Confirmar
        </button>
      </div>
    </div>
  );
}
