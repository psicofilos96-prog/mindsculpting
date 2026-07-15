import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useRegraStorage } from "@/features/regra/useRegraStorage";
import {
  buildOptions,
  pickRule,
  randomInRange,
  type Rule,
} from "@/features/regra/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/regra/jogar")({
  component: JogarRegra,
});

type Phase = "briefing" | "question" | "feedback" | "done";

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch { /* noop */ }
  }
}

function JogarRegra() {
  const navigate = useNavigate();
  const { config, recordSession } = useRegraStorage();

  const [rule] = useState<Rule>(() => pickRule(config.difficulty));
  const [phase, setPhase] = useState<Phase>("briefing");

  const [index, setIndex] = useState(0); // 0..count
  const [current, setCurrent] = useState<number>(0);
  const [options, setOptions] = useState<number[]>([]);
  const [correctValue, setCorrectValue] = useState<number>(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const [remainingMs, setRemainingMs] = useState<number>(config.timeoutMs);
  const questionStartRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  const nextQuestion = useCallback(() => {
    const n = randomInRange(rule.range);
    const answer = rule.apply(n);
    setCurrent(n);
    setCorrectValue(answer);
    setOptions(buildOptions(answer));
    setSelected(null);
    setLastCorrect(null);
    setRemainingMs(config.timeoutMs);
    questionStartRef.current = performance.now();
    setPhase("question");
  }, [rule, config.timeoutMs]);

  const finalize = useCallback(
    (finalCorrect: number, finalBest: number, answers: number) => {
      recordSession(answers, finalCorrect, finalBest);
      setPhase("done");
    },
    [recordSession],
  );

  const advanceAfterAnswer = useCallback(
    (wasCorrect: boolean) => {
      const newCorrect = correct + (wasCorrect ? 1 : 0);
      const newStreak = wasCorrect ? streak + 1 : 0;
      const newBest = Math.max(bestStreak, newStreak);
      const nextIndex = index + 1;
      setCorrect(newCorrect);
      setStreak(newStreak);
      setBestStreak(newBest);
      setIndex(nextIndex);
      setPhase("feedback");
      vibrate(wasCorrect ? 20 : [40, 30, 40]);

      setTimeout(() => {
        if (nextIndex >= config.count) {
          finalize(newCorrect, newBest, config.count);
        } else {
          nextQuestion();
        }
      }, 800);
    },
    [correct, streak, bestStreak, index, config.count, nextQuestion, finalize],
  );

  const handlePick = useCallback(
    (value: number) => {
      if (phase !== "question" || selected !== null) return;
      clearTimers();
      const ok = value === correctValue;
      setSelected(value);
      setLastCorrect(ok);
      advanceAfterAnswer(ok);
    },
    [phase, selected, correctValue, advanceAfterAnswer, clearTimers],
  );

  // countdown / timeout during question
  useEffect(() => {
    if (phase !== "question") return;
    tickRef.current = setInterval(() => {
      const elapsed = performance.now() - questionStartRef.current;
      const left = Math.max(0, config.timeoutMs - elapsed);
      setRemainingMs(left);
    }, 100);
    timeoutRef.current = setTimeout(() => {
      // no answer → wrong
      setSelected(-1);
      setLastCorrect(false);
      advanceAfterAnswer(false);
    }, config.timeoutMs);
    return () => clearTimers();
  }, [phase, config.timeoutMs, advanceAfterAnswer, clearTimers]);

  const startRound = () => {
    setIndex(0);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
    nextQuestion();
  };

  const accuracy = index > 0 ? Math.round((correct / index) * 100) : 0;
  const progress = useMemo(
    () => `${Math.min(index + (phase === "question" ? 1 : 0), config.count)}/${config.count}`,
    [index, phase, config.count],
  );
  const timerPct = Math.round((remainingMs / config.timeoutMs) * 100);

  return (
    <AppShell title="Regra Ativa" back="/regra">
      {/* Regra fixa no topo */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs leading-relaxed text-foreground">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
          Regra da rodada
        </div>
        {rule.text}
      </div>

      {phase !== "briefing" && phase !== "done" && (
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono">
            Nº <span className="text-foreground">{progress}</span>
          </span>
          <span className="font-mono">
            Acertos <span className="text-foreground">{correct}</span> · streak{" "}
            <span className="text-accent">{streak}</span>
          </span>
        </div>
      )}

      <div className="mt-6 flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-border bg-card/60 p-6 shadow-card">
        <AnimatePresence mode="wait">
          {phase === "briefing" && (
            <motion.div
              key="briefing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full text-center"
            >
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Mentalize a regra
              </div>
              <div className="mb-6 font-display text-lg font-semibold text-foreground">
                Quando começar, aplique a regra a cada número.
              </div>
              <button
                onClick={startRound}
                className="w-full rounded-xl bg-gradient-neural py-3 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-[0.98]"
              >
                Entendi, começar
              </button>
            </motion.div>
          )}

          {phase === "question" && (
            <motion.div
              key={`q-${index}`}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.18 }}
              className="text-center"
            >
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Número
              </div>
              <div className="font-mono text-7xl font-bold tabular-nums text-gradient-neural">
                {current}
              </div>
            </motion.div>
          )}

          {phase === "feedback" && lastCorrect !== null && (
            <motion.div
              key={`fb-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div
                className={cn(
                  "font-display text-3xl font-bold",
                  lastCorrect ? "text-[color:var(--color-success)]" : "text-destructive",
                )}
              >
                {lastCorrect ? "Correto!" : "Errado"}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">esperado</div>
              <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-foreground">
                {correctValue}
              </div>
            </motion.div>
          )}

          {phase === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="font-display text-2xl font-bold text-gradient-neural">
                Sessão concluída
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <MiniStat label="Total" value={String(config.count)} />
                <MiniStat label="Acurácia" value={`${accuracy}%`} />
                <MiniStat label="Streak" value={String(bestStreak)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase === "question" && (
        <>
          {/* Barra de tempo */}
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
            <div
              className={cn(
                "h-full transition-all duration-100",
                timerPct > 40 ? "bg-primary" : timerPct > 20 ? "bg-accent" : "bg-destructive",
              )}
              style={{ width: `${timerPct}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {options.map((opt) => {
              const isSelected = selected === opt;
              return (
                <button
                  key={opt}
                  onClick={() => handlePick(opt)}
                  disabled={selected !== null}
                  className={cn(
                    "flex h-16 items-center justify-center rounded-xl border font-mono text-2xl font-bold tabular-nums transition-all active:scale-95",
                    isSelected
                      ? "border-primary bg-primary/15 text-foreground shadow-glow-primary"
                      : "border-border bg-card/60 text-foreground hover:border-primary/50",
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </>
      )}

      {phase === "done" && (
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate({ to: "/regra/jogar" })}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary/70 font-medium text-foreground transition-transform active:scale-95"
          >
            <RotateCw className="h-4 w-4" /> Jogar de novo
          </button>
          <button
            onClick={() => navigate({ to: "/regra" })}
            className="flex h-12 items-center justify-center rounded-xl bg-gradient-neural font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-95"
          >
            Ajustar config
          </button>
        </div>
      )}
    </AppShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-2 text-center">
      <div className="font-mono text-lg font-bold text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
