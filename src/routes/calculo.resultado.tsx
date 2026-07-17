import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { RotateCw, Hop as Home, ChartBar as BarChart3 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LevelSchema, LEVEL_CONFIG, type Level } from "@/features/calculo/types";
import { useLocalProgress } from "@/features/progress/useLocalProgress";

export const Route = createFileRoute("/calculo/resultado")({
  validateSearch: z.object({
    level: LevelSchema,
    correct: z.number(),
    total: z.number(),
    avgMs: z.number(),
    bestStreak: z.number(),
    score: z.number().optional(),
  }),
  component: ResultadoPage,
});

function ResultadoPage() {
  const search = Route.useSearch() as {
    level: Level; correct: number; total: number; avgMs: number; bestStreak: number; score?: number;
  };
  const navigate = useNavigate();
  const { state, hydrated } = useLocalProgress();
  const { level, correct, total, avgMs, bestStreak, score } = search;
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;
  const rating =
    acc === 100 ? "Perfeito" : acc >= 80 ? "Excelente" : acc >= 60 ? "Bom" : acc >= 40 ? "Continue" : "Treine mais";

  const levelStat = hydrated ? state.stats[level] : undefined;
  const prevBestStreak = levelStat?.bestStreak ?? 0;
  const prevBestScore = levelStat?.bestScore ?? 0;
  const isNewStreakRecord = bestStreak > 0 && bestStreak >= prevBestStreak;
  const isNewScoreRecord = (score ?? 0) > 0 && (score ?? 0) >= prevBestScore;

  // Find worst operator
  const errorByOp = levelStat?.errorByOp ?? {};
  const worstOp = Object.entries(errorByOp).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return (
    <AppShell title="Resultado" back="/calculo">
      <div className="mt-6 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {LEVEL_CONFIG[level].label}
        </p>
        <div className="mt-2 font-display text-6xl font-bold text-gradient-neural">{acc}%</div>
        <p className="mt-2 font-display text-lg text-foreground">{rating}</p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-2">
        <Stat label="Acertos" value={`${correct}/${total}`} />
        <Stat label="Pontuação" value={String(score ?? 0)} highlight={isNewScoreRecord} />
        <Stat label="Tempo médio" value={`${(avgMs / 1000).toFixed(1)}s`} />
        <Stat label="Melhor streak" value={String(bestStreak)} highlight={isNewStreakRecord} />
      </div>

      {isNewScoreRecord && (score ?? 0) > 0 && (
        <div className="mt-3 text-center text-xs font-semibold uppercase tracking-wider text-accent">
          Novo recorde de pontuação!
        </div>
      )}

      {worstOp && (
        <div className="mt-4 rounded-xl border border-border bg-card/60 p-3 text-center text-xs text-muted-foreground">
          Operação com mais erros: <span className="font-mono font-bold text-foreground">{worstOp}</span>
        </div>
      )}

      <div className="mt-8 space-y-2">
        <Link
          to="/calculo/jogar"
          search={{ level }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-neural py-3.5 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-95"
        >
          <RotateCw className="h-4 w-4" />
          Jogar de novo
        </Link>
        <Link
          to="/calculo"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3.5 font-display text-base font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          Trocar nível
        </Link>
        <button
          onClick={() => navigate({ to: "/" })}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <Home className="h-4 w-4" />
          Início
        </button>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 text-center ${highlight ? "border-accent/40 bg-accent/10" : "border-border bg-card/60"}`}>
      <div className="font-mono text-lg font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
