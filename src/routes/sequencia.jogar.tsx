import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCw, Trophy, Zap } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { useSequenceStorage } from "@/features/sequencia/useSequenceStorage";
import {
  calcRecordBonus,
  calcRoundScore,
  getDemoSpeed,
  getGapMs,
  getPalette,
  getTimedStepMs,
  MODE_LABEL,
  MODES,
  type GameMode,
  type SeqColor,
} from "@/features/sequencia/types";
import {
  generateDailySequence,
  generateInitialSequence,
  generateNextColor,
  playColorNote,
  playFailSound,
  playSuccessSound,
  unlockAudio,
} from "@/features/sequencia/engine";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  mode: z.string().optional(),
  daily: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const Route = createFileRoute("/sequencia/jogar")({
  validateSearch: (s) => searchSchema.parse(s),
  component: JogarSequencia,
});

type Phase = "idle" | "demo" | "input" | "round-success" | "game-over";

function vibrate(pattern: number | number[], enabled: boolean) {
  if (enabled && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* noop */
    }
  }
}

function JogarSequencia() {
  const search = Route.useSearch() as { mode?: string; daily?: 0 | 1 };
  const navigate = useNavigate();
  const { config, stats, recordGame, recordDaily } = useSequenceStorage();

  const mode = (MODES as readonly string[]).includes(search.mode ?? "")
    ? (search.mode as GameMode)
    : config.mode;
  const isDaily = search.daily === 1;

  const colorCount = mode === "random" ? config.colorCount : 4;
  const palette = getPalette(colorCount);
  const soundOn = config.soundEnabled;
  const vibrateOn = config.vibrateEnabled;

  const [sequence, setSequence] = useState<SeqColor[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [inputIdx, setInputIdx] = useState(0);
  const [litColor, setLitColor] = useState<string | null>(null);
  const [demoIdx, setDemoIdx] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [roundStartTime, setRoundStartTime] = useState(0);
  const [timedRemaining, setTimedRemaining] = useState(0);
  const [roundMistakes, setRoundMistakes] = useState(0);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRef = useRef<number | null>(null);
  const inputStartRef = useRef<number>(0);
  const dailyDateRef = useRef<Date | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // --- Start game ---
  const startGame = useCallback(() => {
    unlockAudio();
    clearTimers();

    let initSeq: SeqColor[];
    if (isDaily) {
      dailyDateRef.current = new Date();
      initSeq = generateDailySequence(palette, 3, dailyDateRef.current);
    } else if (mode === "kids") {
      initSeq = generateInitialSequence(palette, 2);
    } else {
      initSeq = generateInitialSequence(palette, 3);
    }

    setSequence(initSeq);
    setRound(1);
    setScore(0);
    setMistakes(0);
    setReactionTimes([]);
    setNewAchievements([]);
    setIsNewRecord(false);
    setPhase("demo");
    setDemoIdx(0);
    setInputIdx(0);
    setRoundMistakes(0);
  }, [clearTimers, isDaily, mode, palette]);

  // --- Demo playback ---
  useEffect(() => {
    if (phase !== "demo") return;
    if (demoIdx >= sequence.length) {
      // Demo finished → start input phase
      const t = setTimeout(() => {
        setPhase("input");
        setInputIdx(0);
        setRoundMistakes(0);
        inputStartRef.current = performance.now();
        setRoundStartTime(performance.now());
        if (mode === "timed") setTimedRemaining(getTimedStepMs(round));
      }, 400);
      timersRef.current.push(t);
      return;
    }

    const color = sequence[demoIdx]!;
    const speed = getDemoSpeed(round, mode);
    const gap = getGapMs(round, mode);

    // Light up the color
    const t1 = setTimeout(() => {
      setLitColor(color.id);
      if (soundOn) playColorNote(color, speed * 0.7, mode === "kids");
    }, gap);

    // Turn off after display duration
    const t2 = setTimeout(() => {
      setLitColor(null);
      setDemoIdx((i) => i + 1);
    }, gap + speed);

    timersRef.current.push(t1, t2);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase, demoIdx, sequence, round, mode, soundOn]);

  // --- Timed mode countdown ---
  useEffect(() => {
    if (phase !== "input" || mode !== "timed") return;
    const stepMs = getTimedStepMs(round);
    const start = performance.now();

    const tick = () => {
      const left = stepMs - (performance.now() - start);
      if (left <= 0) {
        setTimedRemaining(0);
        handleGameOver();
        return;
      }
      setTimedRemaining(left);
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
  }, [phase, mode, round]);

  // --- Handle button press during input ---
  const handleButtonPress = useCallback(
    (color: SeqColor) => {
      if (phase !== "input") return;

      // Light up briefly
      setLitColor(color.id);
      if (soundOn) playColorNote(color, 400, mode === "kids");
      const t = setTimeout(() => setLitColor(null), 250);
      timersRef.current.push(t);

      // Determine expected color
      const expectedIdx = mode === "reverse" ? sequence.length - 1 - inputIdx : inputIdx;
      const expected = sequence[expectedIdx]!;

      if (color.id !== expected.id) {
        // Wrong!
        setMistakes((m) => m + 1);
        setRoundMistakes((rm) => rm + 1);
        vibrate([60, 40, 60], vibrateOn);
        handleGameOver();
        return;
      }

      // Correct press
      vibrate(20, vibrateOn);
      const reactionMs = performance.now() - inputStartRef.current;
      setReactionTimes((prev) => [...prev, reactionMs]);

      const nextIdx = inputIdx + 1;
      if (nextIdx >= sequence.length) {
        // Round complete!
        const noMistakes = roundMistakes === 0;
        const roundScore = calcRoundScore(round, reactionMs, noMistakes);
        setScore((s) => s + roundScore);

        if (soundOn) playSuccessSound();
        vibrate(30, vibrateOn);
        setPhase("round-success");

        const t2 = setTimeout(() => {
          // Add next color and start new round
          const nextColor = generateNextColor(palette, sequence[sequence.length - 1]?.id);
          const newSeq = [...sequence, nextColor];
          setSequence(newSeq);
          setRound((r) => r + 1);
          setDemoIdx(0);
          setInputIdx(0);
          setRoundMistakes(0);
          setPhase("demo");
        }, 1200);
        timersRef.current.push(t2);
      } else {
        setInputIdx(nextIdx);
        inputStartRef.current = performance.now();
        if (mode === "timed") {
          // Reset timer for next step
          setTimedRemaining(getTimedStepMs(round));
        }
      }
    },
    [phase, mode, sequence, inputIdx, round, roundMistakes, palette, soundOn, vibrateOn],
  );

  // --- Game over ---
  const handleGameOver = useCallback(() => {
    clearTimers();
    setLitColor(null);
    if (soundOn) playFailSound();
    vibrate([100, 50, 100, 50, 200], vibrateOn);
    setPhase("game-over");

    // Record stats
    const sequenceLength = sequence.length;
    const avgReaction =
      reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : 0;
    const prevBest = stats.bestByMode[mode] ?? 0;
    const recordBonus = calcRecordBonus(sequenceLength, prevBest);
    const finalScore = score + recordBonus;
    const wasNewRecord = sequenceLength > prevBest && prevBest > 0;
    setIsNewRecord(wasNewRecord);

    recordGame({
      mode,
      sequenceLength,
      score: finalScore,
      avgReactionMs: avgReaction,
      mistakes,
      playedAt: Date.now(),
    });

    if (isDaily && dailyDateRef.current) {
      const dateStr = dailyDateRef.current.toISOString().slice(0, 10);
      recordDaily(sequenceLength, dateStr);
    }
  }, [clearTimers, soundOn, vibrateOn, sequence.length, reactionTimes, stats.bestByMode, mode, score, mistakes, recordGame, isDaily, recordDaily]);

  // --- Layout: compute grid columns based on color count ---
  const gridCols = colorCount <= 4 ? 2 : colorCount <= 6 ? 3 : colorCount <= 8 ? 4 : 5;

  const avgReaction =
    reactionTimes.length > 0
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
      : 0;

  return (
    <AppShell title={isDaily ? "Desafio Diário" : MODE_LABEL[mode].label} back="/sequencia">
      {/* Header: round + score + mistakes */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card/60 px-3 py-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold text-foreground">
            Rodada <span className="text-primary">{round || "—"}</span>
          </span>
          <span className="font-mono text-sm text-accent">{score} pts</span>
        </div>
        <div className="flex items-center gap-2">
          {mistakes > 0 && (
            <span className="font-mono text-xs text-destructive">
              erros {mistakes}
            </span>
          )}
          {mode === "timed" && phase === "input" && (
            <span className={cn("font-mono text-xs", timedRemaining < 1000 ? "text-destructive" : "text-muted-foreground")}>
              {Math.ceil(timedRemaining / 1000)}s
            </span>
          )}
        </div>
      </div>

      {/* Center info */}
      <div className="mt-4 flex flex-col items-center">
        <div className="mb-3 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            {phase === "idle" && "Pronto?"}
            {phase === "demo" && "Observe"}
            {phase === "input" && (mode === "reverse" ? "Repita (inverso)" : "Repita")}
            {phase === "round-success" && "Correto!"}
            {phase === "game-over" && "Game Over"}
          </div>
          {phase === "input" && (
            <div className="mt-1 font-mono text-xs text-muted-foreground">
              {inputIdx} / {sequence.length}
            </div>
          )}
        </div>

        {/* Color button grid */}
        <div
          className={cn("grid gap-3")}
          style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
        >
          {palette.map((color) => {
            const isLit = litColor === color.id;
            const isGameOver = phase === "game-over";
            return (
              <motion.button
                key={color.id}
                onClick={() => handleButtonPress(color)}
                disabled={phase !== "input"}
                animate={
                  isLit
                    ? { scale: 1.08, boxShadow: `0 0 30px ${color.lit}` }
                    : isGameOver
                      ? { backgroundColor: "oklch(0.55 0.22 25)" }
                      : { scale: 1, boxShadow: "0 0 0 transparent" }
                }
                transition={{ duration: isLit ? 0.1 : 0.3 }}
                className="aspect-square rounded-2xl border-2 transition-colors disabled:cursor-default"
                style={{
                  width: Math.min(80, Math.floor(300 / gridCols)),
                  backgroundColor: isLit ? color.lit : color.base,
                  borderColor: isLit ? color.lit : "oklch(1 0 0 / 15%)",
                }}
              >
                {/* Empty — visual only */}
              </motion.button>
            );
          })}
        </div>

        {/* Center start/restart button */}
        <div className="mt-4">
          {phase === "idle" && (
            <motion.button
              onClick={startGame}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 rounded-2xl bg-gradient-neural px-8 py-3.5 font-display text-base font-bold text-primary-foreground shadow-glow-primary"
            >
              <Play className="h-5 w-5" /> Jogar
            </motion.button>
          )}
          {phase === "game-over" && (
            <motion.button
              onClick={startGame}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 rounded-2xl bg-gradient-neural px-8 py-3.5 font-display text-base font-bold text-primary-foreground shadow-glow-primary"
            >
              <RotateCw className="h-5 w-5" /> Jogar de novo
            </motion.button>
          )}
          {(phase === "demo" || phase === "input" || phase === "round-success") && (
            <div className="h-[3.5rem]" />
          )}
        </div>
      </div>

      {/* Game over panel */}
      <AnimatePresence>
        {phase === "game-over" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-2xl border border-border bg-card/60 p-5"
          >
            <div className="text-center">
              {isNewRecord && (
                <div className="mb-2 flex items-center justify-center gap-1.5 text-accent">
                  <Trophy className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Novo recorde!</span>
                </div>
              )}
              <div className="font-display text-3xl font-bold text-foreground">
                {sequence.length}
              </div>
              <div className="text-xs text-muted-foreground">sequência máxima</div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label="Pontuação" value={String(score)} />
              <Stat label="Reação média" value={avgReaction > 0 ? `${avgReaction}ms` : "—"} />
              <Stat label="Erros" value={String(mistakes)} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={startGame}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary/70 font-medium text-foreground transition-transform active:scale-95"
              >
                <RotateCw className="h-4 w-4" /> Refazer
              </button>
              <button
                onClick={() => navigate({ to: "/sequencia" })}
                className="flex h-12 items-center justify-center rounded-xl bg-gradient-neural font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-95"
              >
                Menu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Round success flash */}
      <AnimatePresence>
        {phase === "round-success" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center justify-center gap-2 text-[color:var(--color-success)]"
          >
            <Zap className="h-4 w-4" />
            <span className="font-display text-sm font-bold">+{calcRoundScore(round, reactionTimes[reactionTimes.length - 1] ?? 0, roundMistakes === 0)} pts</span>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 text-center">
      <div className="font-mono text-lg font-bold text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
