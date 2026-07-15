import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStroopStorage } from "@/features/stroop/useStroopStorage";
import {
  generateTrial,
  pickPalette,
  type StroopColor,
  type Trial,
} from "@/features/stroop/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stroop/jogar")({
  component: JogarStroop,
});

type Phase = "playing" | "feedback" | "done";

interface Answer {
  correct: boolean;
  congruent: boolean;
  reactionMs: number; // 0 if timeout
  timedOut: boolean;
}

const FEEDBACK_MS = 450;

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* noop */
    }
  }
}

function JogarStroop() {
  const navigate = useNavigate();
  const { config, recordSession } = useStroopStorage();

  const palette = useMemo(() => pickPalette(config.colorCount), [config.colorCount]);

  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("playing");
  const [trial, setTrial] = useState<Trial>(() =>
    generateTrial(palette, config.incongruentRatio),
  );
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(config.timeLimitMs);

  const startTsRef = useRef<number>(Date.now());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRef = useRef<number | null>(null);

  const clearAll = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const advance = useCallback(
    (answersSoFar: Answer[]) => {
      if (answersSoFar.length >= config.rounds) {
        const correct = answersSoFar.filter((a) => a.correct).length;
        const timed = answersSoFar.filter((a) => !a.timedOut && a.reactionMs > 0);
        const avg =
          timed.length > 0
            ? Math.round(timed.reduce((s, a) => s + a.reactionMs, 0) / timed.length)
            : 0;
        recordSession(answersSoFar.length, correct, avg);
        setPhase("done");
        return;
      }
      setRound((r) => r + 1);
      setTrial(generateTrial(palette, config.incongruentRatio));
      setLastCorrect(null);
      setPhase("playing");
    },
    [config.rounds, config.incongruentRatio, palette, recordSession],
  );

  const submit = useCallback(
    (chosen: StroopColor | null) => {
      if (phase !== "playing") return;
      clearAll();
      const elapsed = Date.now() - startTsRef.current;
      const timedOut = chosen === null;
      const correct = !timedOut && chosen.id === trial.fontColor.id;
      vibrate(correct ? 15 : [40, 30, 40]);
      const answer: Answer = {
        correct,
        congruent: trial.congruent,
        reactionMs: timedOut ? 0 : elapsed,
        timedOut,
      };
      const next = [...answers, answer];
      setAnswers(next);
      setLastCorrect(correct);
      setPhase("feedback");
      const t = setTimeout(() => advance(next), FEEDBACK_MS);
      timers.current.push(t);
    },
    [phase, trial, answers, advance, clearAll],
  );

  // Timer + countdown per trial
  useEffect(() => {
    if (phase !== "playing") return;
    startTsRef.current = Date.now();
    setRemainingMs(config.timeLimitMs);

    const tick = () => {
      const left = config.timeLimitMs - (Date.now() - startTsRef.current);
      if (left <= 0) {
        setRemainingMs(0);
        submit(null);
        return;
      }
      setRemainingMs(left);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return clearAll;
  }, [phase, trial, config.timeLimitMs, submit, clearAll]);

  // Keyboard 1..N
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10);
      if (!isNaN(n) && n >= 1 && n <= palette.length) {
        submit(palette[n - 1]!);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, palette, submit]);

  const restart = () => {
    clearAll();
    setRound(1);
    setAnswers([]);
    setLastCorrect(null);
    setTrial(generateTrial(palette, config.incongruentRatio));
    setPhase("playing");
  };

  const correctCount = answers.filter((a) => a.correct).length;
  const timed = answers.filter((a) => !a.timedOut && a.reactionMs > 0);
  const avgMs =
    timed.length > 0
      ? Math.round(timed.reduce((s, a) => s + a.reactionMs, 0) / timed.length)
      : 0;

  const congruentAns = answers.filter((a) => a.congruent && !a.timedOut && a.reactionMs > 0);
  const incongruentAns = answers.filter((a) => !a.congruent && !a.timedOut && a.reactionMs > 0);
  const avgCong =
    congruentAns.length > 0
      ? Math.round(congruentAns.reduce((s, a) => s + a.reactionMs, 0) / congruentAns.length)
      : 0;
  const avgIncong =
    incongruentAns.length > 0
      ? Math.round(incongruentAns.reduce((s, a) => s + a.reactionMs, 0) / incongruentAns.length)
      : 0;

  const timePct = Math.max(0, Math.min(100, (remainingMs / config.timeLimitMs) * 100));

  return (
    <AppShell title="Teste Stroop" back="/stroop">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">
          Rodada <span className="text-foreground">{Math.min(round, config.rounds)}/{config.rounds}</span>
        </span>
        <span className="font-mono">
          Acertos <span className="text-foreground">{correctCount}</span>
          {avgMs > 0 && <> · <span className="text-accent">{avgMs}ms</span></>}
        </span>
      </div>

      <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Toque na <span className="text-foreground">cor da fonte</span>
      </p>

      {phase !== "done" && (
        <>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
            <div
              className="h-full bg-gradient-neural transition-[width] duration-100"
              style={{ width: `${timePct}%` }}
            />
          </div>

          <div className="mt-8 flex min-h-[7rem] items-center justify-center">
            <div
              className="select-none font-display text-6xl font-black tracking-wider transition-transform"
              style={{
                color: trial.fontColor.hex,
                opacity: phase === "feedback" ? 0.5 : 1,
              }}
            >
              {trial.wordColor.label}
            </div>
          </div>

          <div className="mt-8 flex min-h-[2rem] items-center justify-center">
            {phase === "feedback" && lastCorrect !== null && (
              <span
                className={cn(
                  "rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider",
                  lastCorrect
                    ? "bg-primary/20 text-primary"
                    : "bg-destructive/20 text-destructive",
                )}
              >
                {lastCorrect ? "Certo" : "Errado"}
              </span>
            )}
          </div>

          <div
            className={cn(
              "mt-4 grid gap-3",
              palette.length <= 4 ? "grid-cols-2" : "grid-cols-3",
            )}
          >
            {palette.map((c) => (
              <button
                key={c.id}
                onClick={() => submit(c)}
                disabled={phase !== "playing"}
                aria-label={`Cor ${c.label.toLowerCase()}`}
                className="h-16 rounded-2xl border-2 border-border/60 shadow-card transition-transform active:scale-95 disabled:opacity-60"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </>
      )}

      {phase === "done" && (
        <>
          <div className="mt-6 grid grid-cols-3 gap-2">
            <MiniStat label="Acertos" value={`${correctCount}/${answers.length}`} />
            <MiniStat
              label="Acurácia"
              value={`${answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0}%`}
            />
            <MiniStat label="TR médio" value={avgMs > 0 ? `${avgMs}ms` : "—"} />
          </div>

          <div className="mt-4 rounded-xl border border-border bg-card/60 p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Efeito Stroop
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Congruente</div>
                <div className="font-mono text-lg font-bold text-foreground">
                  {avgCong > 0 ? `${avgCong}ms` : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Incongruente</div>
                <div className="font-mono text-lg font-bold text-foreground">
                  {avgIncong > 0 ? `${avgIncong}ms` : "—"}
                </div>
              </div>
            </div>
            {avgCong > 0 && avgIncong > 0 && (
              <div className="mt-3 text-xs text-muted-foreground">
                Interferência:{" "}
                <span
                  className={cn(
                    "font-mono font-bold",
                    avgIncong - avgCong > 0 ? "text-accent" : "text-primary",
                  )}
                >
                  {avgIncong - avgCong > 0 ? "+" : ""}
                  {avgIncong - avgCong}ms
                </span>{" "}
                — quanto menor, melhor o controle inibitório.
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={restart}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary/70 font-medium text-foreground transition-transform active:scale-95"
            >
              <RotateCw className="h-4 w-4" /> Jogar de novo
            </button>
            <button
              onClick={() => navigate({ to: "/stroop" })}
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
