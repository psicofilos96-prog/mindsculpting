import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { RotateCw, Home } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LevelSchema, LEVEL_CONFIG, type Level } from "@/features/calculo/types";

export const Route = createFileRoute("/calculo/resultado")({
  validateSearch: z.object({
    level: LevelSchema,
    correct: z.number(),
    total: z.number(),
    avgMs: z.number(),
    bestStreak: z.number(),
  }),
  component: ResultadoPage,
});

function ResultadoPage() {
  const search = Route.useSearch();
  const { level, correct, total, avgMs, bestStreak } = search as {
    level: Level; correct: number; total: number; avgMs: number; bestStreak: number;
  };
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;
  const rating =
    acc === 100 ? "Perfeito" : acc >= 80 ? "Excelente" : acc >= 60 ? "Bom" : acc >= 40 ? "Continue" : "Treine mais";

  return (
    <AppShell title="Resultado" back="/calculo">
      <div className="mt-6 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {LEVEL_CONFIG[level].label}
        </p>
        <div className="mt-2 font-display text-6xl font-bold text-gradient-neural">{acc}%</div>
        <p className="mt-2 font-display text-lg text-foreground">{rating}</p>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-2">
        <Stat label="Acertos" value={`${correct}/${total}`} />
        <Stat label="Tempo médio" value={`${(avgMs / 1000).toFixed(1)}s`} />
        <Stat label="Melhor streak" value={`${bestStreak}`} />
      </div>

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
        <Link
          to="/"
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <Home className="h-4 w-4" />
          Início
        </Link>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 text-center">
      <div className="font-mono text-lg font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
