import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Delete } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { generateProblem, formatStep } from "@/features/calculo/engine";
import {
  LEVEL_CONFIG,
  LevelSchema,
  ROUNDS_PER_SESSION,
  type Level,
  type Problem,
} from "@/features/calculo/types";
import { useLocalProgress } from "@/features/progress/useLocalProgress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calculo/jogar")({
  validateSearch: z.object({ level: LevelSchema.optional() }),
  component: JogarPage,
});

type Phase = "countdown" | "sequence" | "answer" | "feedback" | "done";

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch { /* noop */ }
  }
}

function JogarPage() {
  const { level: levelParam } = Route.useSearch();
  const navigate = useNavigate();
  const { state, addRound } = useLocalProgress();
  const level: Level = levelParam ?? state.prefs.level ?? "facil";
  const cfg = LEVEL_CONFIG[level];
  const mode: "choices" | "input" = state.prefs.inputMode ? "input" : "choices";

  const [round, setRound] = useState(0);
  const [problem, setProblem] = useState<Problem>(() => generateProblem(level));
  const [phase, setPhase] = useState<Phase>("countdown");
  const [stepIdx, setStepIdx] = useState(-1); // -1 = start number
  const [countdown, setCountdown] = useState(3);
  const [inputVal, setInputVal] = useState("");
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const answerStartRef = useRef<number>(0);

  const totalItems = 1 + problem.steps.length; // start + steps

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("sequence");
      setStepIdx(-1);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Sequence timing
  useEffect(() => {
    if (phase !== "sequence") return;
    const t = setTimeout(() => {
      if (stepIdx + 1 >= problem.steps.length) {
        setPhase("answer");
        answerStartRef.current = performance.now();
        setInputVal("");
      } else {
        setStepIdx((i) => i + 1);
      }
    }, cfg.stepMs);
    return () => clearTimeout(t);
  }, [phase, stepIdx, cfg.stepMs, problem.steps.length]);

  const finalize = useCallback(
    (isCorrect: boolean) => {
      const elapsed = performance.now() - answerStartRef.current;
      setTimes((prev) => [...prev, elapsed]);
      setLastCorrect(isCorrect);
      vibrate(isCorrect ? 30 : [60, 40, 60]);
      if (isCorrect) {
        setCorrectCount((c) => c + 1);
        setStreak((s) => {
          const ns = s + 1;
          setBestStreak((b) => Math.max(b, ns));
          return ns;
        });
      } else {
        setStreak(0);
      }
      setPhase("feedback");
    },
    [],
  );

  const nextRound = useCallback(() => {
    if (round + 1 >= ROUNDS_PER_SESSION) {
      // finish
      const avgMs = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
      const finalCorrect = correctCount;
      const result = {
        level,
        mode,
        correct: finalCorrect,
        total: ROUNDS_PER_SESSION,
        avgMs,
        bestStreak,
        playedAt: Date.now(),
      };
      addRound(result);
      navigate({
        to: "/calculo/resultado",
        search: { level, correct: finalCorrect, total: ROUNDS_PER_SESSION, avgMs, bestStreak },
      });
      return;
    }
    setRound((r) => r + 1);
    setProblem(generateProblem(level));
    setStepIdx(-1);
    setLastCorrect(null);
    setInputVal("");
    setPhase("sequence");
  }, [round, times, correctCount, level, mode, bestStreak, addRound, navigate]);

  // Auto-advance feedback
  useEffect(() => {
    if (phase !== "feedback") return;
    const t = setTimeout(nextRound, 1100);
    return () => clearTimeout(t);
  }, [phase, nextRound]);

  const submitChoice = (val: number) => {
    if (phase !== "answer") return;
    finalize(val === problem.answer);
  };

  const submitInput = () => {
    if (phase !== "answer" || inputVal === "" || inputVal === "-") return;
    finalize(parseInt(inputVal, 10) === problem.answer);
  };

  const displayValue = useMemo(() => {
    if (phase === "countdown") return countdown > 0 ? String(countdown) : "GO";
    if (phase === "sequence") {
      if (stepIdx < 0) return String(problem.start);
      const step = problem.steps[stepIdx]!;
      return formatStep(step);
    }
    return "?";
  }, [phase, countdown, stepIdx, problem]);

  const progress = phase === "sequence" ? ((stepIdx + 2) / totalItems) * 100 : phase === "countdown" ? 0 : 100;

  return (
    <AppShell title={cfg.label} back="/calculo">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">Rodada {Math.min(round + 1, ROUNDS_PER_SESSION)}/{ROUNDS_PER_SESSION}</span>
        <span className="font-mono">
          Acertos: <span className="text-foreground">{correctCount}</span>
          {streak > 1 && <span className="ml-2 text-accent">🔥 {streak}</span>}
        </span>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-secondary/60">
        <div
          className="h-full bg-gradient-neural transition-all duration-200 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-6 flex min-h-[220px] items-center justify-center rounded-3xl border border-border bg-card/60 p-6 shadow-card">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${phase}-${stepIdx}-${countdown}-${round}`}
            initial={{ opacity: 0, scale: 0.7, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.3, filter: "blur(12px)" }}
            transition={{ duration: 0.25 }}
            className={cn(
              "font-mono text-6xl font-bold tabular-nums",
              phase === "answer" ? "text-accent" : "text-gradient-neural",
            )}
          >
            {displayValue}
          </motion.div>
        </AnimatePresence>
      </div>

      {phase === "answer" && (
        <div className="mt-6">
          {mode === "choices" ? (
            <div className="grid grid-cols-2 gap-3">
              {problem.choices.map((c) => (
                <button
                  key={c}
                  onClick={() => submitChoice(c)}
                  className="rounded-xl border border-border bg-card p-4 font-mono text-2xl font-bold tabular-nums text-foreground transition-all active:scale-95 hover:border-primary/50 hover:shadow-glow-primary"
                >
                  {c}
                </button>
              ))}
            </div>
          ) : (
            <NumberPad value={inputVal} onChange={setInputVal} onSubmit={submitInput} />
          )}
        </div>
      )}

      {phase === "feedback" && lastCorrect !== null && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mt-6 rounded-2xl border p-4 text-center",
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
          {!lastCorrect && (
            <div className="mt-1 text-sm text-muted-foreground">
              Resposta: <span className="font-mono font-bold text-foreground">{problem.answer}</span>
            </div>
          )}
        </motion.div>
      )}
    </AppShell>
  );
}

function NumberPad({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const press = (key: string) => {
    if (key === "back") return onChange(value.slice(0, -1));
    if (key === "±") {
      if (value.startsWith("-")) return onChange(value.slice(1));
      return onChange("-" + value);
    }
    if (value.length >= 7) return;
    onChange(value + key);
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "±", "0", "back"];

  return (
    <div>
      <div className="mb-3 flex h-14 items-center justify-center rounded-xl border border-border bg-card font-mono text-3xl font-bold tabular-nums">
        {value || <span className="text-muted-foreground">0</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className="flex h-14 items-center justify-center rounded-xl bg-secondary/70 font-mono text-xl font-semibold text-foreground transition-transform active:scale-95 hover:bg-secondary"
          >
            {k === "back" ? <Delete className="h-5 w-5" /> : k}
          </button>
        ))}
      </div>
      <button
        onClick={onSubmit}
        disabled={!value || value === "-"}
        className="mt-3 w-full rounded-xl bg-gradient-neural py-3.5 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-95 disabled:opacity-50 disabled:shadow-none"
      >
        Confirmar
      </button>
    </div>
  );
}
