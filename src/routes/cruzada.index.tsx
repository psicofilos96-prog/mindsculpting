import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Play } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LEVEL_LABEL, type Level } from "@/features/cruzada/types";
import { templateCountByLevel } from "@/features/cruzada/puzzles";
import { useCruzadaStorage } from "@/features/cruzada/useCruzadaStorage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cruzada/")({
  component: CruzadaIndex,
});

const LEVEL_DESC: Record<Level, string> = {
  easy: "Grids 5×5, soma e subtração. Avaliação da esquerda para a direita.",
  medium: "Grids 7×7–9×9, com multiplicação. Avaliação da esquerda para a direita.",
  hard: "Grids 9×9–11×9, as 4 operações. Prioridade matemática (* / antes de + −).",
  expert: "Grids 11×13–13×13, as 4 operações. Prioridade matemática. Muito denso.",
};

const LEVEL_STYLES: Record<Level, string> = {
  easy: "from-emerald-400/25 to-teal-400/10 border-emerald-400/40",
  medium: "from-sky-400/25 to-cyan-400/10 border-sky-400/40",
  hard: "from-amber-400/25 to-orange-400/10 border-amber-400/40",
  expert: "from-rose-400/25 to-fuchsia-400/10 border-rose-400/40",
};

function formatTime(ms: number): string {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${r.toString().padStart(2, "0")}` : `${r}s`;
}

function CruzadaIndex() {
  const navigate = useNavigate();
  const { hydrated, stats } = useCruzadaStorage();

  const levels: Level[] = ["easy", "medium", "hard", "expert"];

  return (
    <AppShell title="Cruzadinha Matemática" back="/">
      <p className="text-sm text-muted-foreground">
        Palavras-cruzadas de equações. Preencha as células em branco para que cada equação
        (horizontal e vertical) fique matematicamente correta.
      </p>

      <section className="mt-6 grid grid-cols-3 gap-2">
        <Stat label="Resolvidos" value={hydrated ? String(stats.solved) : "—"} />
        <Stat label="Templates" value={String(15)} />
        <Stat label="Dicas" value={hydrated ? String(stats.hintsUsed) : "—"} />
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Dificuldade
        </h2>
        {levels.map((lv) => {
          const count = templateCountByLevel(lv);
          return (
            <button
              key={lv}
              onClick={() =>
                navigate({ to: "/cruzada/jogar", search: { level: lv } })
              }
              className={cn(
                "group relative w-full overflow-hidden rounded-2xl border bg-gradient-to-br p-4 text-left transition-all active:scale-[0.98]",
                LEVEL_STYLES[lv],
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="font-display text-base font-bold">{LEVEL_LABEL[lv]}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{LEVEL_DESC[lv]}</div>
                  <div className="mt-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
                    {count} templates · equações dinâmicas
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-foreground/70 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </section>

      <button
        onClick={() =>
          navigate({ to: "/cruzada/jogar", search: { level: "easy" } })
        }
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-neural py-4 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-[0.98]"
      >
        <Play className="h-5 w-5" />
        Jogar Fácil
      </button>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 text-center">
      <div className="font-mono text-xl font-bold text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
