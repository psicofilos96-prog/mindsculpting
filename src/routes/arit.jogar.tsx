import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Delete, RotateCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAritStorage } from "@/features/arit/useAritStorage";
import {
  arraysEqual,
  expectedAnswer,
  nextStopAt,
  randomDigit,
} from "@/features/arit/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/arit/jogar")({
  component: JogarBuffer,
});

type Phase = "countdown" | "streaming" | "answer" | "feedback" | "done";

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch { /* noop */ }
  }
}

function JogarBuffer() {
  const navigate = useNavigate();
  const { hydrated, config, stats, recordSession } = useAritStorage();

  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [shown, setShown] = useState<string[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [visible, setVisible] = useState(false);
  const stopAtRef = useRef<number>(nextStopAt());
  const [answer, setAnswer] = useState<string[]>([]);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [expected, setExpected] = useState<string[]>([]);

  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const startRef = useRef<number>(0);
  const [now, setNow] = useState<number>(0);

  const sessionEndMs =
    config.sessionMode === "time" ? config.sessionValue * 60_000 : Infinity;
  const totalRounds = config.sessionMode === "rounds" ? config.sessionValue : Infinity;

  // Countdown → streaming
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      startRef.current = performance.now();
      setPhase("streaming");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Timer da sessão (modo tempo)
  useEffect(() => {
    if (phase !== "streaming" && phase !== "answer" && phase !== "feedback") return;
    if (config.sessionMode !== "time") return;
    const id = setInterval(() => setNow(performance.now() - startRef.current), 250);
    return () => clearInterval(id);
  }, [phase, config.sessionMode]);

  // Streaming: mostra dígito -> pausa curta -> próximo. Interrompe em stopAtRef.
  useEffect(() => {
    if (phase !== "streaming") return;
    // exibe novo dígito
    const d = randomDigit(shown[shown.length - 1]);
    setCurrent(d);
    setVisible(true);
    const shownNext = [...shown, d];
    setShown(shownNext);

    const showMs = Math.max(400, Math.round(config.intervalMs * 0.7));
    const gapMs = config.intervalMs - showMs;

    const hideTimer = setTimeout(() => setVisible(false), showMs);
    const nextTimer = setTimeout(() => {
      if (shownNext.length >= stopAtRef.current) {
        const exp = expectedAnswer(shownNext, config.lastN, config.order);
        setExpected(exp);
        setAnswer([]);
        setPhase("answer");
      } else {
        // força re-execução do efeito com novo shown
        setPhase("streaming-next" as Phase);
      }
    }, showMs + gapMs);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Truque simples pra encadear o próximo tick de streaming
  useEffect(() => {
    if ((phase as string) === "streaming-next") {
      const t = setTimeout(() => setPhase("streaming"), 0);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const finalize = useCallback(
    (submitted: string[]) => {
      const ok = arraysEqual(submitted, expected);
      setLastCorrect(ok);
      vibrate(ok ? 25 : [50, 40, 50]);
      const newRound = round + 1;
      const newCorrect = correct + (ok ? 1 : 0);
      const newStreak = ok ? streak + 1 : 0;
      const newBest = Math.max(bestStreak, newStreak);
      setRound(newRound);
      setCorrect(newCorrect);
      setStreak(newStreak);
      setBestStreak(newBest);
      setPhase("feedback");

      const elapsed = performance.now() - startRef.current;
      const finished =
        (config.sessionMode === "rounds" && newRound >= totalRounds) ||
        (config.sessionMode === "time" && elapsed >= sessionEndMs);

      setTimeout(() => {
        if (finished) {
          recordSession(newRound, newCorrect, newBest);
          setPhase("done");
        } else {
          stopAtRef.current = nextStopAt();
          setShown([]);
          setAnswer([]);
          setLastCorrect(null);
          setExpected([]);
          setPhase("streaming");
        }
      }, 1600);
    },
    [expected, round, correct, streak, bestStreak, config.sessionMode, totalRounds, sessionEndMs, recordSession],
  );

  const handleAdd = (d: string) => {
    setAnswer((prev) => {
      if (prev.length >= config.lastN) return prev;
      const next = [...prev, d];
      if (next.length >= config.lastN) setTimeout(() => finalize(next), 0);
      return next;
    });
  };
  const handleBackspace = () => setAnswer((prev) => prev.slice(0, -1));

  const restart = () => {
    stopAtRef.current = nextStopAt();
    setShown([]);
    setCurrent("");
    setAnswer([]);
    setLastCorrect(null);
    setExpected([]);
    setRound(0);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
    setCountdown(3);
    setNow(0);
    setPhase("countdown");
  };

  const accuracy = round > 0 ? Math.round((correct / round) * 100) : 0;
  const timeLeftMs =
    config.sessionMode === "time" ? Math.max(0, sessionEndMs - now) : 0;
  const progressText = useMemo(() => {
    if (config.sessionMode === "rounds") return `${round}/${totalRounds}`;
    const s = Math.ceil(timeLeftMs / 1000);
    const mm = Math.floor(s / 60).toString().padStart(1, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  }, [config.sessionMode, round, totalRounds, timeLeftMs]);

  const orderHint =
    config.order === "chronological"
      ? "do mais antigo pro mais recente"
      : "do mais recente pro mais antigo";

  return (
    <AppShell title="Buffer Contínuo" back="/arit">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">
          {config.sessionMode === "rounds" ? "Rodada" : "Tempo"}{" "}
          <span className="text-foreground">{progressText}</span>
        </span>
        <span className="font-mono">
          Acertos <span className="text-foreground">{correct}</span> · streak{" "}
          <span className="text-accent">{streak}</span>
        </span>
      </div>

      <div className="mt-6 flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-border bg-card/60 p-6 shadow-card">
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

          {(phase === "streaming" || (phase as string) === "streaming-next") && (
            <motion.div
              key={`d-${shown.length}`}
              initial={{ opacity: 0, scale: 0.6, filter: "blur(10px)" }}
              animate={{
                opacity: visible ? 1 : 0,
                scale: visible ? 1 : 0.9,
                filter: visible ? "blur(0px)" : "blur(6px)",
              }}
              exit={{ opacity: 0, scale: 1.2, filter: "blur(12px)" }}
              transition={{ duration: 0.18 }}
              className="font-mono text-8xl font-bold tabular-nums text-gradient-neural"
            >
              {current || "•"}
            </motion.div>
          )}

          {phase === "answer" && (
            <motion.div
              key="answer-prompt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
                Interrompeu!
              </div>
              <div className="font-display text-2xl font-bold text-foreground">
                Últimos {config.lastN} números
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{orderHint}</div>
            </motion.div>
          )}

          {phase === "feedback" && lastCorrect !== null && (
            <motion.div
              key="fb"
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
                {expected.join(" ")}
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
                <MiniStat label="Rodadas" value={String(round)} />
                <MiniStat label="Acurácia" value={`${accuracy}%`} />
                <MiniStat label="Streak" value={String(bestStreak)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase === "answer" && (
        <div className="mt-6">
          <AnswerRow answer={answer} expectedLength={config.lastN} onBackspace={handleBackspace} />
          <Keypad onPress={handleAdd} onBackspace={handleBackspace} />
        </div>
      )}

      {phase === "done" && (
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            onClick={restart}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary/70 font-medium text-foreground transition-transform active:scale-95"
          >
            <RotateCw className="h-4 w-4" /> Jogar de novo
          </button>
          <button
            onClick={() => navigate({ to: "/arit" })}
            className="flex h-12 items-center justify-center rounded-xl bg-gradient-neural font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-95"
          >
            Ajustar config
          </button>
        </div>
      )}

      {hydrated && phase !== "done" && (
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Melhor streak histórico:{" "}
          <span className="font-mono font-bold text-foreground">{stats.bestStreak}</span>
        </p>
      )}
    </AppShell>
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
  onPress,
  onBackspace,
}: {
  onPress: (d: string) => void;
  onBackspace: () => void;
}) {
  const layout = ["1","2","3","4","5","6","7","8","9","back","0","ok"];
  return (
    <div className="grid grid-cols-3 gap-2">
      {layout.map((k, i) => {
        if (k === "back") {
          return (
            <button
              key={`k-${i}`}
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
            <div
              key={`k-${i}`}
              className="flex h-14 items-center justify-center rounded-xl border border-dashed border-border text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              <Check className="h-4 w-4 opacity-60" />
            </div>
          );
        }
        return (
          <button
            key={`k-${i}`}
            onClick={() => onPress(k)}
            className="flex h-14 items-center justify-center rounded-xl bg-secondary/70 font-mono text-xl font-semibold text-foreground transition-transform active:scale-95 hover:bg-secondary"
          >
            {k}
          </button>
        );
      })}
    </div>
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
