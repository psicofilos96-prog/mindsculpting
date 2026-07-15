import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Play } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PUZZLES, gerarTabuleiro } from "@/features/cruzada/puzzles";
import type { Level } from "@/features/cruzada/types";
import { useCruzadaStorage } from "@/features/cruzada/useCruzadaStorage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cruzada/")({
  component: CruzadaIndex,
});

const LEVEL_LABEL: Record<Level, string> = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
};

const LEVEL_DESC: Record<Level, string> = {
  easy: "Grids menores, soma e subtração.",
  medium: "Grids médios, com multiplicação.",
  hard: "Grids maiores, as 4 operações.",
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

  const levels: Level[] = ["easy", "medium", "hard"];

  return (
    <AppShell title="Cruzadinha Matemática" back="/">
      <p className="text-sm text-muted-foreground">
        Palavras-cruzadas de equações. Preencha as células em branco para que cada equação
        (horizontal e vertical) fique matematicamente correta.
      </p>

      <section className="mt-6 grid grid-cols-3 gap-2">
        <Stat label="Resolvidos" value={hydrated ? String(stats.solved) : "—"} />
        <Stat label="Puzzles" value={String(PUZZLES.length)} />
        <Stat label="Dicas" value={hydrated ? String(stats.hintsUsed) : "—"} />
      </section>

      <section className="mt-6 space-y-6">
        {levels.map((lv) => {
          const list = PUZZLES.filter((p) => p.level === lv);
          if (list.length === 0) return null;
          return (
            <div key={lv}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {LEVEL_LABEL[lv]}
                </h2>
                <span className="text-[10px] text-muted-foreground">{LEVEL_DESC[lv]}</span>
              </div>
              <div className="space-y-2">
                {list.map((p) => {
                  const best = stats.bestTimes[p.id] ?? 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() =>
                        navigate({ to: "/cruzada/jogar", search: { id: p.id } })
                      }
                      className={cn(
                        "flex w-full items-center justify-between rounded-2xl border border-border bg-card/60 p-4 text-left transition-all",
                        "hover:border-primary/50 hover:shadow-glow-primary active:scale-[0.99]",
                      )}
                    >
                      <div>
                        <div className="font-display text-base font-semibold text-foreground">
                          {p.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.rows}×{p.cols} · melhor tempo:{" "}
                          <span className="font-mono text-foreground">
                            {hydrated ? formatTime(best) : "—"}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <button
        onClick={() =>
          navigate({ to: "/cruzada/jogar", search: { id: gerarTabuleiro().id } })
        }
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-neural py-4 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-[0.98]"
      >
        <Play className="h-5 w-5" />
        Puzzle aleatório
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
