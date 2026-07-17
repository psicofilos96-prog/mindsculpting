import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Delete, Check, Zap } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { calcScore, generateProblem, generateDailyProblems, extractOperator } from "@/features/calculo/engine";
import {
  GAME_MODES,
  LEVEL_CONFIG,
  LevelSchema,
  type AnswerMode,
  type GameMode,
  type Level,
  type Problem,
} from "@/features/calculo/types";
import { useLocalProgress } from "@/features/progress/useLocalProgress";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  level: LevelSchema.optional(),
  gameMode: z.enum(GAME_MODES).optional(),
});

export const Route = createFileRoute("/calculo/jogar")({
  validateSearch: (s) => searchSchema.parse(s),
  component: JogarPage,
});

type Phase = "countdown" | "flash" | "answer" | "feedback" | "done";

function vibrate(pattern: number | number[], enabled: boolean) {
  if (enabled && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch { /* noop */ }
  }
}

function JogarPage() {
  const search = Route.useSearch() as { level?: Level; gameMode?: GameMode };
  const navigate = useNavigate();
  const { state, setPrefs, addRound } = useLocalProgress();
  const prefs = state.prefs;

  const level: Level = search.level ?? prefs.level ?? "iniciante";
  const gameMode: GameMode = search.gameMode ?? prefs.gameMode ?? "practice";
  const answerMode: AnswerMode = prefs.answerMode;
  const timePerQuestion = prefs.timePerQuestion; // seconds, 0 = no limit
  const flashDuration = prefs.flashDuration; // seconds, 0 = always visible
  const timedDuration = prefs.timedDuration; // seconds for timed mode
  const precisionCount = prefs.precisionCount;
  const vibrateOn = prefs.vibrate;

  const cfg = LEVEL_CONFIG[level];

  const [problem, setProblem] = useState<Problem>(() => generateProblem(level));
  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [inputVal, setInputVal] = useState("");
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [questionNum, setQuestionNum] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0); // per-question timer (ms)
  const [gameTimeLeft, setGameTimeLeft] = useState(0); // timed mode total (ms)
  const [errorOps, setErrorOps] = useState<Record<string, number>>({});
  const [flashHidden, setFlashHidden] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [dailyProblems, setDailyProblems] = useState<Problem[] | null>(null);

  const answerStartRef = useRef<number>(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRef = useRef<number | null>(null);

  const totalQuestions = gameMode === "precision" ? precisionCount : Infinity;
  const totalGameMs = gameMode === "timed" ? timedDuration * 1000 : 0;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Persist prefs for next visit
  useEffect(() => {
    setPrefs({ level, gameMode });
  }, [level, gameMode, setPrefs]);

  // Daily challenge: generate fixed problems
  useEffect(() => {
    if (gameMode !== "daily") return;
    const today = new Date();
    const problems = generateDailyProblems(level, 20, today);
    setDailyProblems(problems);
  }, [gameMode, level]);

  // Countdown 3-2-1 → first question
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase(flashDuration > 0 ? "flash" : "answer");
      if (flashDuration > 0) {
        setFlashHidden(false);
      }
      answerStartRef.current = performance.now();
      if (timePerQuestion > 0) setTimeLeft(timePerQuestion * 1000);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, countdown, flashDuration, timePerQuestion]);

  // Flash mode: show problem briefly, then hide
  useEffect(() => {
    if (phase !== "flash") return;
    const flashMs = flashDuration * 1000;
    const t = setTimeout(() => {
      setFlashHidden(true);
      setPhase("answer");
      answerStartRef.current = performance.now();
      if (timePerQuestion > 0) setTimeLeft(timePerQuestion * 1000);
    }, flashMs);
    return () => clearTimeout(t);
  }, [phase, flashDuration, timePerQuestion]);

  // Per-question timer (countdown)
  useEffect(() => {
    if (phase !== "answer" || timePerQuestion <= 0) return;
    const start = performance.now();
    const limit = timePerQuestion * 1000;
    const tick = () => {
      const left = limit - (performance.now() - start);
      if (left <= 0) {
        setTimeLeft(0);
        handleTimeout();
        return;
      }
      setTimeLeft(left);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timePerQuestion]);

  // Timed mode: overall game timer
  useEffect(() => {
    if (gameMode !== "timed" || phase === "done" || phase === "countdown") return;
    if (gameTimeLeft <= 0 && phase !== "countdown") {
      finishGame();
      return;
    }
    const start = performance.now();
    const remaining = gameTimeLeft;
    const tick = () => {
      const left = remaining - (performance.now() - start);
      if (left <= 0) {
        setGameTimeLeft(0);
        finishGame();
        return;
      }
      setGameTimeLeft(left);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, phase]);

  // Initialize game timer for timed mode
  useEffect(() => {
    if (gameMode === "timed") setGameTimeLeft(totalGameMs);
  }, [gameMode, totalGameMs]);

  const handleTimeout = useCallback(() => {
    if (phase !== "answer") return;
    clearTimers();
    const elapsed = performance.now() - answerStartRef.current;
    setTimes((prev) => [...prev, elapsed]);
    setLastCorrect(false);
    setStreak(0);
    vibrate([60, 40, 60], vibrateOn);
    trackError();
    setShowAnswer(true);

    if (gameMode === "survival") {
      setPhase("done");
      return;
    }
    setPhase("feedback");
  }, [phase, clearTimers, vibrateOn, gameMode]);

  const trackError = useCallback(() => {
    const op = extractOperator(problem.display);
    if (op) {
      setErrorOps((prev) => ({ ...prev, [op]: (prev[op] ?? 0) + 1 }));
    }
  }, [problem.display]);

  const finalize = useCallback(
    (isCorrect: boolean) => {
      if (phase !== "answer") return;
      clearTimers();
      const elapsed = performance.now() - answerStartRef.current;
      setTimes((prev) => [...prev, elapsed]);
      setLastCorrect(isCorrect);
      vibrate(isCorrect ? 30 : [60, 40, 60], vibrateOn);

      if (isCorrect) {
        setCorrectCount((c) => c + 1);
        setStreak((s) => {
          const ns = s + 1;
          setBestStreak((b) => Math.max(b, ns));
          return ns;
        });
        const pts = calcScore(true, elapsed, streak + 1, level);
        setScore((s) => s + pts);
      } else {
        setStreak(0);
        trackError();
        setShowAnswer(true);
      }

      if (!isCorrect && gameMode === "survival") {
        setPhase("done");
        return;
      }

      setPhase("feedback");
    },
    [phase, clearTimers, vibrateOn, streak, level, gameMode, trackError],
  );

  const nextQuestion = useCallback(() => {
    // Check end conditions
    if (gameMode === "precision" && questionNum >= precisionCount) {
      finishGame();
      return;
    }
    if (gameMode === "daily" && dailyProblems && questionNum >= dailyProblems.length) {
      finishGame();
      return;
    }

    setQuestionNum((n) => n + 1);
    setShowAnswer(false);
    setInputVal("");

    if (gameMode === "daily" && dailyProblems) {
      setProblem(dailyProblems[questionNum] ?? generateProblem(level));
    } else {
      setProblem(generateProblem(level));
    }

    if (flashDuration > 0) {
      setFlashHidden(false);
      setPhase("flash");
    } else {
      setPhase("answer");
      answerStartRef.current = performance.now();
      if (timePerQuestion > 0) setTimeLeft(timePerQuestion * 1000);
    }
  }, [gameMode, questionNum, precisionCount, dailyProblems, level, flashDuration, timePerQuestion]);

  // Auto-advance feedback
  useEffect(() => {
    if (phase !== "feedback") return;
    const t = setTimeout(nextQuestion, 1100);
    return () => clearTimeout(t);
  }, [phase, nextQuestion]);

  const finishGame = useCallback(() => {
    clearTimers();
    const avgMs = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    const total = gameMode === "precision" ? precisionCount
      : gameMode === "daily" ? (dailyProblems?.length ?? 20)
      : questionNum;
    addRound({
      level,
      mode: answerMode,
      gameMode,
      correct: correctCount,
      total,
      avgMs,
      bestStreak,
      score,
      playedAt: Date.now(),
    });
    navigate({
      to: "/calculo/resultado",
      search: { level, correct: correctCount, total, avgMs, bestStreak, score },
    });
  }, [clearTimers, times, gameMode, precisionCount, dailyProblems, questionNum, level, answerMode, correctCount, bestStreak, score, addRound, navigate]);

  const submitChoice = (val: number) => {
    if (phase !== "answer") return;
    finalize(val === problem.answer);
  };

  const submitInput = () => {
    if (phase !== "answer" || inputVal === "" || inputVal === "-") return;
    finalize(parseInt(inputVal, 10) === problem.answer);
  };

  const restart = () => {
    clearTimers();
    setProblem(generateProblem(level));
    setPhase("countdown");
    setCountdown(3);
    setInputVal("");
    setLastCorrect(null);
    setCorrectCount(0);
    setStreak(0);
    setBestStreak(0);
    setScore(0);
    setTimes([]);
    setQuestionNum(1);
    setErrorOps({});
    setShowAnswer(false);
    setFlashHidden(false);
    if (gameMode === "timed") setGameTimeLeft(totalGameMs);
  };

  // Display
  const displayValue = useMemo(() => {
    if (phase === "countdown") return countdown > 0 ? String(countdown) : "GO";
    if (phase === "flash") return flashHidden ? "?" : problem.display;
    if (phase === "answer") return flashHidden ? "?" : problem.display;
    if (phase === "feedback") return problem.display;
    return "";
  }, [phase, countdown, flashHidden, problem.display]);

  const progress = useMemo(() => {
    if (gameMode === "precision") return (questionNum / precisionCount) * 100;
    if (gameMode === "timed" && totalGameMs > 0)
      return Math.max(0, ((totalGameMs - gameTimeLeft) / totalGameMs) * 100);
    if (gameMode === "daily" && dailyProblems)
      return (questionNum / dailyProblems.length) * 100;
    return 0;
  }, [gameMode, questionNum, precisionCount, totalGameMs, gameTimeLeft, dailyProblems]);

  const timeLeftPct = timePerQuestion > 0
    ? (timeLeft / (timePerQuestion * 1000)) * 100
    : 100;

  return (
    <AppShell title={cfg.label} back="/calculo">
      {/* Top bar: question count, score, streak */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card/60 px-3 py-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold text-foreground">
            {gameMode === "practice" || gameMode === "survival" || gameMode === "timed"
              ? `#${questionNum}`
              : `${questionNum}/${gameMode === "precision" ? precisionCount : dailyProblems?.length ?? 20}`}
          </span>
          <span className="font-mono text-sm text-accent">{score} pts</span>
        </div>
        <div className="flex items-center gap-2">
          {streak > 1 && (
            <span className="flex items-center gap-0.5 font-mono text-xs text-accent">
              <Zap className="h-3 w-3" /> {streak}
            </span>
          )}
          {gameMode === "timed" && phase !== "done" && (
            <span className={cn(
              "font-mono text-xs",
              gameTimeLeft < 5000 ? "text-destructive" : "text-muted-foreground",
            )}>
              {Math.ceil(gameTimeLeft / 1000)}s
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary/60">
        <div
          className="h-full bg-gradient-neural transition-all duration-200 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Per-question timer bar */}
      {timePerQuestion > 0 && phase === "answer" && (
        <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-secondary/40">
          <div
            className={cn(
              "h-full transition-all duration-75 ease-linear",
              timeLeftPct < 30 ? "bg-destructive" : "bg-accent",
            )}
            style={{ width: `${timeLeftPct}%` }}
          />
        </div>
      )}

      {/* Problem display */}
      <div className="mt-6 flex min-h-[180px] items-center justify-center rounded-3xl border border-border bg-card/60 p-6 shadow-card">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${phase}-${questionNum}-${flashHidden}`}
            initial={{ opacity: 0, scale: 0.7, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.3, filter: "blur(12px)" }}
            transition={{ duration: 0.2 }}
            className={cn(
              "font-mono font-bold tabular-nums text-center break-all",
              phase === "answer" && flashHidden
                ? "text-6xl text-accent"
                : displayValue.length > 20
                  ? "text-2xl text-gradient-neural"
                  : displayValue.length > 14
                    ? "text-3xl text-gradient-neural"
                    : displayValue.length > 8
                      ? "text-4xl text-gradient-neural"
                      : "text-5xl text-gradient-neural",
            )}
          >
            {displayValue}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Answer input */}
      {phase === "answer" && (
        <div className="mt-6">
          {answerMode === "choices" ? (
            <div className="grid grid-cols-2 gap-3">
              {problem.choices.map((c) => (
                <button
                  key={c}
                  onClick={() => submitChoice(c)}
                  className="flex min-h-[3.5rem] items-center justify-center rounded-xl border border-border bg-card p-3 font-mono text-xl font-bold tabular-nums text-foreground transition-all active:scale-95 hover:border-primary/50 hover:shadow-glow-primary break-all"
                >
                  {c}
                </button>
              ))}
            </div>
          ) : (
            <NumberPad
              value={inputVal}
              onChange={setInputVal}
              onSubmit={submitInput}
            />
          )}
        </div>
      )}

      {/* Feedback */}
      {phase === "feedback" && lastCorrect !== null && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mt-4 rounded-2xl border p-4 text-center",
            lastCorrect
              ? "border-[color:var(--color-success)]/50 bg-[color:var(--color-success)]/10"
              : "border-destructive/50 bg-destructive/10",
          )}
        >
          <div className={cn(
            "flex items-center justify-center gap-2 font-display text-lg font-bold",
            lastCorrect ? "text-[color:var(--color-success)]" : "text-destructive",
          )}>
            {lastCorrect ? <Check className="h-5 w-5" /> : null}
            {lastCorrect ? "Correto!" : "Errado"}
          </div>
          {!lastCorrect && showAnswer && (
            <div className="mt-1 text-sm text-muted-foreground">
              Resposta: <span className="font-mono font-bold text-foreground">{problem.answer}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Done (survival) */}
      {phase === "done" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-2xl border border-border bg-card/60 p-5 text-center"
        >
          <div className="font-display text-2xl font-bold text-foreground">Game Over</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Sequência: <span className="font-mono font-bold text-accent">{bestStreak}</span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Pontuação: <span className="font-mono font-bold text-foreground">{score}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={restart}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-neural font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-95"
            >
              <Delete className="h-4 w-4 rotate-180" /> Refazer
            </button>
            <button
              onClick={() => navigate({ to: "/calculo" })}
              className="flex h-12 items-center justify-center rounded-xl bg-secondary/70 font-medium text-foreground transition-transform active:scale-95"
            >
              Menu
            </button>
          </div>
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
    if (value.length >= 8) return;
    onChange(value + key);
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "±", "0", "back"];

  return (
    <div>
      <div className="mb-3 flex h-14 items-center justify-center rounded-xl border border-border bg-card font-mono text-2xl font-bold tabular-nums break-all px-2">
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
