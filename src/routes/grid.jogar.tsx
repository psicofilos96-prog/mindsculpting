import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useGridStorage } from "@/features/grid/useGridStorage";
import { pickCells } from "@/features/grid/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/grid/jogar")({
  component: JogarGrid,
});

type Phase = "reveal" | "answer" | "roundDone" | "sessionDone";

const ROUNDS_PER_SESSION = 5;
const SEQ_STEP_MS = 600; // per-cell reveal in sequential mode

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch { /* noop */ }
  }
}

function JogarGrid() {
  const navigate = useNavigate();
  const { config, recordSession } = useGridStorage();

  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("reveal");
  const [target, setTarget] = useState<number[]>(() =>
    pickCells(config.size, config.points),
  );
  const [seqIndex, setSeqIndex] = useState(0); // reveal step in sequential
  const [taps, setTaps] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const [correctSet, setCorrectSet] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const targetSet = useMemo(() => new Set(target), [target]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  }, []);

  // Reveal phase
  useEffect(() => {
    if (phase !== "reveal") return;
    clearTimers();

    if (config.mode === "recognition") {
      // all lit at once
      setSeqIndex(target.length);
      const t = setTimeout(() => setPhase("answer"), config.exposureMs);
      timers.current.push(t);
    } else {
      // sequential: light one by one
      setSeqIndex(0);
      target.forEach((_, i) => {
        const t = setTimeout(() => setSeqIndex(i + 1), (i + 1) * SEQ_STEP_MS);
        timers.current.push(t);
      });
      const total = target.length * SEQ_STEP_MS + Math.max(400, config.exposureMs - 500);
      const done = setTimeout(() => setPhase("answer"), total);
      timers.current.push(done);
    }

    return clearTimers;
  }, [phase, target, config.mode, config.exposureMs, clearTimers]);

  const finishRound = useCallback((perfect: boolean) => {
    setPhase("roundDone");
    const newPerfect = perfectCount + (perfect ? 1 : 0);
    const newStreak = perfect ? streak + 1 : 0;
    const newBest = Math.max(bestStreak, newStreak);
    setPerfectCount(newPerfect);
    setStreak(newStreak);
    setBestStreak(newBest);

    const t = setTimeout(() => {
      if (round >= ROUNDS_PER_SESSION) {
        recordSession(ROUNDS_PER_SESSION, newPerfect, newBest);
        setPhase("sessionDone");
      } else {
        setRound((r) => r + 1);
        setTarget(pickCells(config.size, config.points));
        setTaps([]);
        setWrong(null);
        setCorrectSet(new Set());
        setErrors(0);
        setPhase("reveal");
      }
    }, 900);
    timers.current.push(t);
  }, [perfectCount, streak, bestStreak, round, recordSession, config.size, config.points]);

  const handleTap = (idx: number) => {
    if (phase !== "answer") return;

    if (config.mode === "sequential") {
      const expected = target[taps.length];
      if (idx === expected) {
        vibrate(15);
        const nextTaps = [...taps, idx];
        setTaps(nextTaps);
        setCorrectSet((prev) => new Set(prev).add(idx));
        if (nextTaps.length === target.length) {
          finishRound(errors === 0);
        }
      } else {
        vibrate([40, 30, 40]);
        setWrong(idx);
        setErrors((e) => e + 1);
        const t = setTimeout(() => setWrong(null), 400);
        timers.current.push(t);
      }
    } else {
      // recognition: any order
      if (correctSet.has(idx) || taps.includes(idx)) return;
      if (targetSet.has(idx)) {
        vibrate(15);
        const nextCorrect = new Set(correctSet).add(idx);
        setCorrectSet(nextCorrect);
        setTaps((prev) => [...prev, idx]);
        if (nextCorrect.size === targetSet.size) {
          finishRound(errors === 0);
        }
      } else {
        vibrate([40, 30, 40]);
        setWrong(idx);
        setErrors((e) => e + 1);
        setTaps((prev) => [...prev, idx]);
        const t = setTimeout(() => setWrong(null), 400);
        timers.current.push(t);
      }
    }
  };

  const restartFull = () => {
    clearTimers();
    setRound(1);
    setTarget(pickCells(config.size, config.points));
    setTaps([]);
    setWrong(null);
    setCorrectSet(new Set());
    setErrors(0);
    setPerfectCount(0);
    setStreak(0);
    setBestStreak(0);
    setPhase("reveal");
  };

  const litDuringReveal = useMemo(() => {
    if (phase !== "reveal") return new Set<number>();
    if (config.mode === "recognition") return targetSet;
    return new Set(target.slice(0, seqIndex));
  }, [phase, config.mode, targetSet, target, seqIndex]);

  return (
    <AppShell title="Grid de Pontos" back="/grid">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">
          Rodada <span className="text-foreground">{round}/{ROUNDS_PER_SESSION}</span>
        </span>
        <span className="font-mono">
          Perfeitas <span className="text-foreground">{perfectCount}</span> · streak{" "}
          <span className="text-accent">{streak}</span>
        </span>
      </div>

      <div className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.25em]">
        {phase === "reveal" && (
          <span className="text-primary">
            {config.mode === "sequential" ? "Memorize a ordem" : "Memorize os pontos"}
          </span>
        )}
        {phase === "answer" && (
          <span className="text-accent">
            {config.mode === "sequential"
              ? `Toque na ordem (${taps.length}/${target.length})`
              : `Toque nos pontos (${correctSet.size}/${target.length})`}
          </span>
        )}
        {phase === "roundDone" && (
          <span className={errors === 0 ? "text-primary" : "text-destructive"}>
            {errors === 0 ? "Perfeito!" : `${errors} erro${errors === 1 ? "" : "s"}`}
          </span>
        )}
        {phase === "sessionDone" && <span className="text-primary">Sessão concluída</span>}
      </div>

      {phase !== "sessionDone" && (
        <div className="mt-4 flex justify-center">
          <div
            className="grid gap-2 rounded-2xl border border-border bg-card/60 p-3 shadow-card"
            style={{
              gridTemplateColumns: `repeat(${config.size}, minmax(0, 1fr))`,
              width: "min(100%, 22rem)",
            }}
          >
            {Array.from({ length: config.size * config.size }).map((_, i) => {
              const isLit = litDuringReveal.has(i);
              const isCorrect = correctSet.has(i);
              const isWrong = wrong === i;
              const showOrderNum =
                phase === "reveal" &&
                config.mode === "sequential" &&
                isLit &&
                target.indexOf(i) < seqIndex;
              const orderNum = showOrderNum ? target.indexOf(i) + 1 : null;

              return (
                <button
                  key={i}
                  onClick={() => handleTap(i)}
                  disabled={phase !== "answer"}
                  aria-label={`Célula ${i}`}
                  className={cn(
                    "relative aspect-square rounded-lg border transition-colors flex items-center justify-center font-mono text-sm font-bold",
                    "bg-background/60 border-border/60 text-transparent",
                    isLit && "bg-primary/70 border-primary text-primary-foreground shadow-glow-primary",
                    isCorrect && "bg-[color:var(--color-success,theme(colors.emerald.500))]/70 border-emerald-400 text-white",
                    isWrong && "!bg-destructive/80 !border-destructive text-white animate-pulse",
                  )}
                >
                  {orderNum ?? ""}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {phase === "answer" && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => finishRound(false)}
            className="flex-1 rounded-xl bg-secondary/70 py-2 text-sm font-medium text-foreground transition-transform active:scale-95"
          >
            Desistir
          </button>
          {errors > 0 && (
            <span className="flex items-center px-2 text-xs text-destructive">
              {errors} erro{errors === 1 ? "" : "s"}
            </span>
          )}
        </div>
      )}

      {phase === "sessionDone" && (
        <>
          <div className="mt-6 grid grid-cols-3 gap-2">
            <MiniStat label="Rodadas" value={String(ROUNDS_PER_SESSION)} />
            <MiniStat label="Perfeitas" value={String(perfectCount)} />
            <MiniStat label="Streak" value={String(bestStreak)} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={restartFull}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary/70 font-medium text-foreground transition-transform active:scale-95"
            >
              <RotateCw className="h-4 w-4" /> Jogar de novo
            </button>
            <button
              onClick={() => navigate({ to: "/grid" })}
              className="flex h-12 items-center justify-center rounded-xl bg-gradient-neural font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-95"
            >
              Ajustar config
            </button>
          </div>
        </>
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
