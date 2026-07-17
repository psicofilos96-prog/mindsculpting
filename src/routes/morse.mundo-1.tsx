import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { RotateCw, Volume2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useMorseStorage } from "@/features/morse/useMorseStorage";
import { generateSequence, playSymbol, type MorseSymbol } from "@/features/morse/engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/morse/mundo-1")({
  component: MundoIFundamentos,
});

type Phase = "idle" | "playing" | "answer" | "feedback";

const ROUNDS_PER_SESSION = 12;

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* noop */
    }
  }
}

function MundoIFundamentos() {
  const navigate = useNavigate();
  const { hydrated, config, stats, recordSession } = useMorseStorage();

  const [phase, setPhase] = useState<Phase>("idle");
  const [alvo, setAlvo] = useState<MorseSymbol[]>([]);
  const [resposta, setResposta] = useState<MorseSymbol[]>([]);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const seqLenRef = useRef(1);
  const [seqLen, setSeqLen] = useState(1);

  const tocarDesafio = useCallback(async () => {
    setPhase("playing");
    setLastCorrect(null);
    setResposta([]);
    const seq = generateSequence(seqLenRef.current);
    setAlvo(seq);
    for (const s of seq) {
      await playSymbol(s, { wpm: config.wpm });
      await new Promise((r) => setTimeout(r, 180));
    }
    setPhase("answer");
  }, [config.wpm]);

  const finalize = useCallback(
    (ok: boolean) => {
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

      if (ok && newStreak % 5 === 0 && seqLenRef.current < 4) {
        seqLenRef.current += 1;
        setSeqLen(seqLenRef.current);
      }

      setTimeout(() => {
        if (newRound >= ROUNDS_PER_SESSION) {
          recordSession(newRound, newCorrect, newBest, seqLenRef.current);
          setPhase("idle");
        } else {
          tocarDesafio();
        }
      }, 1400);
    },
    [round, correct, streak, bestStreak, recordSession, tocarDesafio],
  );

  const responder = (simbolo: MorseSymbol) => {
    if (phase !== "answer") return;
    const novaResposta = [...resposta, simbolo];
    setResposta(novaResposta);

    const idx = novaResposta.length - 1;
    if (novaResposta[idx] !== alvo[idx]) {
      finalize(false);
      return;
    }
    if (novaResposta.length === alvo.length) {
      finalize(true);
    }
  };

  const restart = () => {
    seqLenRef.current = 1;
    setSeqLen(1);
    setRound(0);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
    setAlvo([]);
    setResposta([]);
    setLastCorrect(null);
    setPhase("idle");
  };

  const isDone = phase === "idle" && round >= ROUNDS_PER_SESSION;
  const accuracy = round > 0 ? Math.round((correct / round) * 100) : 0;

  return (
    <AppShell title="Mundo I — Fundamentos" back="/morse">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">
          Rodada <span className="text-foreground">{Math.min(round, ROUNDS_PER_SESSION)}/{ROUNDS_PER_SESSION}</span>
        </span>
        <span className="font-mono">
          Acertos <span className="text-foreground">{correct}</span> · streak{" "}
          <span className="text-accent">{streak}</span>
        </span>
      </div>

      <div className="mt-6 flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-border bg-card/60 p-6 shadow-card">
        <AnimatePresence mode="wait">
          {phase === "idle" && !isDone && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <Volume2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/70" />
              <div className="font-display text-lg font-bold text-foreground">Pronto para ouvir?</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Sequência atual: {seqLen} símbolo(s)
              </div>
            </motion.div>
          )}

          {phase === "playing" && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
                Ouvindo
              </div>
              <div className="font-mono text-6xl font-bold text-gradient-neural">• —</div>
            </motion.div>
          )}

          {phase === "answer" && (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
                Sua vez
              </div>
              <div className="font-display text-xl font-bold text-foreground">
                O que você ouviu?
              </div>
              <div className="mt-3 flex justify-center gap-1.5">
                {alvo.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md border font-mono text-lg",
                      resposta[i]
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-dashed border-border text-muted-foreground",
                    )}
                  >
                    {resposta[i] ?? "·"}
                  </span>
                ))}
              </div>
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
                {lastCorrect ? "Certo!" : "Errado"}
              </div>
              <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
                {alvo.join(" ")}
              </div>
            </motion.div>
          )}

          {isDone && (
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

      {phase === "idle" && !isDone && (
        <button
          onClick={tocarDesafio}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-neural font-display font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-95"
        >
          <Volume2 className="h-5 w-5" />
          Tocar sinal
        </button>
      )}

      {phase === "answer" && (
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            onClick={() => responder(".")}
            className="flex h-14 items-center justify-center rounded-xl bg-secondary/70 font-mono text-xl font-semibold text-foreground transition-transform active:scale-95 hover:bg-secondary"
          >
            Ponto ·
          </button>
          <button
            onClick={() => responder("-")}
            className="flex h-14 items-center justify-center rounded-xl bg-secondary/70 font-mono text-xl font-semibold text-foreground transition-transform active:scale-95 hover:bg-secondary"
          >
            Traço —
          </button>
        </div>
      )}

      {isDone && (
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            onClick={restart}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary/70 font-medium text-foreground transition-transform active:scale-95"
          >
            <RotateCw className="h-4 w-4" /> Jogar de novo
          </button>
          <button
            onClick={() => navigate({ to: "/morse" })}
            className="flex h-12 items-center justify-center rounded-xl bg-gradient-neural font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-95"
          >
            Ajustar config
          </button>
        </div>
      )}

      {hydrated && !isDone && (
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Melhor streak histórico:{" "}
          <span className="font-mono font-bold text-foreground">{stats.bestStreak}</span>
        </p>
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
