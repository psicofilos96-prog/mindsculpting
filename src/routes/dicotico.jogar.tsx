import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, AudioWaveform, Bell, Check, ChevronLeft, ChevronRight, Circle, CircleDot, Drum, Headphones, MoveHorizontal as MoreHorizontal, Radio, RotateCw, Square, Volume2, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useDicoticoStorage } from "@/features/dicotico/useDicoticoStorage";
import {
  type AnswerRecord,
  type SoundDef,
  type Trial,
} from "@/features/dicotico/types";
import {
  generateTrial,
  playSingleSound,
  playTrial,
  unlockAudio,
} from "@/features/dicotico/engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dicotico/jogar")({
  component: JogarDicotico,
});

type Phase = "playing" | "answer" | "feedback" | "done";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Radio,
  AudioWaveform,
  Activity,
  Zap,
  Bell,
  Drum,
  Volume2,
  Square,
  Circle,
  CircleDot,
  MoreHorizontal,
};

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* noop */
    }
  }
}

function JogarDicotico() {
  const navigate = useNavigate();
  const { config, recordSession } = useDicoticoStorage();

  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("playing");
  const [trial, setTrial] = useState<Trial>(() => generateTrial(config));
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [dividedPicks, setDividedPicks] = useState<string[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  }, []);

  // Play sound when entering "playing" phase
  useEffect(() => {
    if (phase !== "playing") return;
    unlockAudio();
    setPlaying(true);
    playTrial(trial, config.durationMs);

    const t = setTimeout(() => {
      setPlaying(false);
      setPhase("answer");
    }, config.durationMs + 200);
    timers.current.push(t);

    return clearTimers;
  }, [phase, trial, config.durationMs, clearTimers]);

  const finalize = useCallback(
    (isCorrect: boolean, record: AnswerRecord) => {
      setLastCorrect(isCorrect);
      vibrate(isCorrect ? 20 : [40, 30, 40]);
      setAnswers((prev) => [...prev, record]);
      setPhase("feedback");

      const t = setTimeout(() => {
        if (round >= config.rounds) {
          recordSession([...answers, record]);
          setPhase("done");
        } else {
          setRound((r) => r + 1);
          setTrial(generateTrial(config));
          setLastCorrect(null);
          setDividedPicks([]);
          setPhase("playing");
        }
      }, 1000);
      timers.current.push(t);
    },
    [round, config.rounds, config, recordSession, answers],
  );

  // --- Answer handlers ---

  const handleSelective = (soundId: string) => {
    if (phase !== "answer") return;
    const isCorrect = soundId === trial.correct;
    const ear = trial.questionType === "selective-left" ? "left" : "right";
    finalize(isCorrect, { correct: isCorrect, questionType: trial.questionType, ear });
  };

  const handleLocate = (ear: "left" | "right") => {
    if (phase !== "answer") return;
    const isCorrect = ear === trial.correct;
    finalize(isCorrect, { correct: isCorrect, questionType: trial.questionType, ear });
  };

  const handleDividedPick = (soundId: string) => {
    if (phase !== "answer") return;
    const next = [...dividedPicks];
    if (next.includes(soundId)) {
      // remove
      const idx = next.indexOf(soundId);
      next.splice(idx, 1);
    } else if (next.length < 2) {
      next.push(soundId);
    } else {
      // replace first
      next[1] = soundId;
    }
    setDividedPicks(next);
  };

  const submitDivided = () => {
    if (phase !== "answer" || dividedPicks.length !== 2) return;
    const correct = trial.correct as string[];
    const isCorrect =
      (dividedPicks[0] === correct[0] && dividedPicks[1] === correct[1]) ||
      (dividedPicks[0] === correct[1] && dividedPicks[1] === correct[0]);
    finalize(isCorrect, { correct: isCorrect, questionType: "divided" });
  };

  const replayTarget = () => {
    if (trial.targetSound) {
      unlockAudio();
      playSingleSound(trial.targetSound, 0, config.durationMs);
    }
  };

  const replayTrial = () => {
    unlockAudio();
    setPlaying(true);
    playTrial(trial, config.durationMs);
    const t = setTimeout(() => setPlaying(false), config.durationMs + 200);
    timers.current.push(t);
  };

  const restart = () => {
    clearTimers();
    setRound(1);
    setAnswers([]);
    setLastCorrect(null);
    setDividedPicks([]);
    setTrial(generateTrial(config));
    setPhase("playing");
  };

  // --- Summary stats ---
  const summary = useMemo(() => {
    const total = answers.length;
    const correct = answers.filter((a) => a.correct).length;
    const leftAns = answers.filter((a) => a.questionType === "selective-left");
    const rightAns = answers.filter((a) => a.questionType === "selective-right");
    const selAns = [...leftAns, ...rightAns];
    const divAns = answers.filter((a) => a.questionType === "divided");
    const locAns = answers.filter((a) => a.questionType === "locate");

    return {
      total,
      correct,
      acc: total > 0 ? Math.round((correct / total) * 100) : 0,
      leftAcc: leftAns.length > 0 ? Math.round((leftAns.filter((a) => a.correct).length / leftAns.length) * 100) : 0,
      rightAcc: rightAns.length > 0 ? Math.round((rightAns.filter((a) => a.correct).length / rightAns.length) * 100) : 0,
      selAcc: selAns.length > 0 ? Math.round((selAns.filter((a) => a.correct).length / selAns.length) * 100) : 0,
      divAcc: divAns.length > 0 ? Math.round((divAns.filter((a) => a.correct).length / divAns.length) * 100) : 0,
      locAcc: locAns.length > 0 ? Math.round((locAns.filter((a) => a.correct).length / locAns.length) * 100) : 0,
      leftCount: leftAns.length,
      rightCount: rightAns.length,
      selCount: selAns.length,
      divCount: divAns.length,
      locCount: locAns.length,
    };
  }, [answers]);

  const questionText = useMemo(() => {
    if (trial.questionType === "selective-left") return "Qual som no ouvido ESQUERDO?";
    if (trial.questionType === "selective-right") return "Qual som no ouvido DIREITO?";
    if (trial.questionType === "divided") return "Quais os DOIS sons que você ouviu?";
    return "Em qual ouvido você ouviu este som?";
  }, [trial.questionType]);

  return (
    <AppShell title="Escuta Dicótica" back="/dicotico">
      {/* Progress bar */}
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">
          Rodada <span className="text-foreground">{Math.min(round, config.rounds)}/{config.rounds}</span>
        </span>
        <span className="font-mono">
          Acertos <span className="text-foreground">{answers.filter((a) => a.correct).length}</span>
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-secondary/60">
        <div
          className="h-full bg-gradient-neural transition-all duration-300"
          style={{ width: `${(Math.min(round, config.rounds) / config.rounds) * 100}%` }}
        />
      </div>

      {/* Playing / Answer / Feedback area */}
      <div className="mt-6 flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-border bg-card/60 p-6 shadow-card">
        <AnimatePresence mode="wait">
          {phase === "playing" && (
            <motion.div
              key={`play-${round}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={playing ? { scale: [1, 1.15, 1] } : {}}
                transition={playing ? { repeat: Infinity, duration: 0.5 } : {}}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-neural shadow-glow-primary"
              >
                <Headphones className="h-12 w-12 text-primary-foreground" />
              </motion.div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                {playing ? "Ouvindo..." : "Preparando"}
              </p>
            </motion.div>
          )}

          {phase === "answer" && (
            <motion.div
              key={`ans-${round}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full text-center"
            >
              <p className="font-display text-lg font-bold text-foreground">{questionText}</p>
              {trial.questionType === "locate" && trial.targetSound && (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <p className="text-xs text-muted-foreground">Som-alvo:</p>
                  <button
                    onClick={replayTarget}
                    className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-medium text-foreground transition-transform active:scale-95"
                  >
                    <Volume2 className="h-4 w-4 text-primary" />
                    Tocar novamente
                  </button>
                </div>
              )}
              {phase === "answer" && trial.questionType !== "locate" && (
                <button
                  onClick={replayTrial}
                  className="mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RotateCw className="h-3 w-3" /> Repetir
                </button>
              )}
            </motion.div>
          )}

          {phase === "feedback" && (
            <motion.div
              key={`fb-${round}`}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Answer options */}
      {phase === "answer" && (
        <div className="mt-6">
          {/* Locate: left/right buttons */}
          {trial.questionType === "locate" && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleLocate("left")}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card py-6 transition-all active:scale-95 hover:border-primary/50 hover:shadow-glow-primary"
              >
                <ChevronLeft className="h-8 w-8 text-primary" />
                <span className="font-display text-sm font-bold text-foreground">Esquerdo</span>
              </button>
              <button
                onClick={() => handleLocate("right")}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card py-6 transition-all active:scale-95 hover:border-primary/50 hover:shadow-glow-primary"
              >
                <ChevronRight className="h-8 w-8 text-primary" />
                <span className="font-display text-sm font-bold text-foreground">Direito</span>
              </button>
            </div>
          )}

          {/* Selective: sound options */}
          {trial.questionType !== "divided" && trial.questionType !== "locate" && (
            <div className="grid grid-cols-2 gap-3">
              {trial.options.map((s) => {
                const Icon = ICON_MAP[s.icon] ?? Volume2;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelective(s.id)}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card py-5 transition-all active:scale-95 hover:border-primary/50 hover:shadow-glow-primary"
                  >
                    <Icon className="h-8 w-8 text-primary" />
                    <span className="font-display text-sm font-bold text-foreground">{s.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Divided: pick two sounds */}
          {trial.questionType === "divided" && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                {trial.options.map((s) => {
                  const Icon = ICON_MAP[s.icon] ?? Volume2;
                  const selected = dividedPicks.includes(s.id);
                  const order = dividedPicks.indexOf(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleDividedPick(s.id)}
                      className={cn(
                        "relative flex flex-col items-center gap-2 rounded-2xl border py-5 transition-all active:scale-95",
                        selected
                          ? "border-primary bg-primary/15 shadow-glow-primary"
                          : "border-border bg-card hover:border-primary/50",
                      )}
                    >
                      {selected && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {order + 1}
                        </span>
                      )}
                      <Icon className="h-8 w-8 text-primary" />
                      <span className="font-display text-sm font-bold text-foreground">{s.label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={submitDivided}
                disabled={dividedPicks.length !== 2}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-neural py-3.5 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-95 disabled:opacity-40 disabled:shadow-none"
              >
                <Check className="h-5 w-5" />
                Confirmar ({dividedPicks.length}/2)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Done / summary */}
      {phase === "done" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <div className="text-center">
            <div className="font-display text-2xl font-bold text-gradient-neural">
              Sessão concluída
            </div>
            <div className="mt-4 font-display text-5xl font-bold text-foreground">
              {summary.acc}%
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.correct} de {summary.total} acertos
            </p>
          </div>

          {/* Ear comparison */}
          {summary.leftCount > 0 && summary.rightCount > 0 && (
            <div className="mt-6 rounded-2xl border border-border bg-card/60 p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Acurácia por ouvido
              </div>
              <div className="space-y-3">
                <BarRow label="Esquerdo" value={summary.leftAcc} />
                <BarRow label="Direito" value={summary.rightAcc} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                É comum haver uma vantagem natural de um ouvido sobre o outro (lateralização).
                Isso não é diagnóstico — apenas um dado do seu desempenho.
              </p>
            </div>
          )}

          {/* Question type comparison */}
          {(summary.selCount > 0 || summary.divCount > 0 || summary.locCount > 0) && (
            <div className="mt-4 rounded-2xl border border-border bg-card/60 p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Acurácia por tipo de pergunta
              </div>
              <div className="space-y-3">
                {summary.selCount > 0 && (
                  <BarRow label="Seletiva" value={summary.selAcc} />
                )}
                {summary.divCount > 0 && (
                  <BarRow label="Dividida" value={summary.divAcc} />
                )}
                {summary.locCount > 0 && (
                  <BarRow label="Localização" value={summary.locAcc} />
                )}
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              onClick={restart}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary/70 font-medium text-foreground transition-transform active:scale-95"
            >
              <RotateCw className="h-4 w-4" /> Jogar de novo
            </button>
            <button
              onClick={() => navigate({ to: "/dicotico" })}
              className="flex h-12 items-center justify-center rounded-xl bg-gradient-neural font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-95"
            >
              Ajustar config
            </button>
          </div>
        </motion.div>
      )}
    </AppShell>
  );
}

function BarRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary/60">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            value >= 70 ? "bg-[color:var(--color-success)]" : value >= 40 ? "bg-primary" : "bg-destructive",
          )}
        />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-sm font-bold text-foreground">
        {value}%
      </span>
    </div>
  );
}
