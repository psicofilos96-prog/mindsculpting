import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Play } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useGridStorage } from "@/features/grid/useGridStorage";
import {
  EXPOSURE_OPTIONS,
  POINTS_OPTIONS,
  SIZE_OPTIONS,
  type GridMode,
  type GridSize,
} from "@/features/grid/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/grid/")({
  component: GridIndex,
});

function GridIndex() {
  const navigate = useNavigate();
  const { hydrated, config, stats, setConfig } = useGridStorage();

  const perfectRate =
    stats.totalRounds > 0 ? Math.round((stats.totalPerfect / stats.totalRounds) * 100) : 0;

  const maxPoints = config.size * config.size;
  const pointOptions = POINTS_OPTIONS.filter((p) => p <= maxPoints);

  return (
    <AppShell title="Grid de Pontos" back="/">
      <p className="text-sm text-muted-foreground">
        Alguns pontos acendem por segundos. Depois apagam — toque nas mesmas células.
        No modo <span className="text-foreground">sequencial</span>, respeite a ordem;
        no modo <span className="text-foreground">reconhecimento</span>, tudo acende junto e a ordem é livre.
      </p>

      <section className="mt-6 space-y-4">
        <Field label="Tamanho do grid">
          <div className="grid grid-cols-2 gap-2">
            {SIZE_OPTIONS.map((s) => (
              <Chip
                key={s}
                selected={config.size === s}
                onClick={() => {
                  const nextMax = s * s;
                  setConfig({
                    size: s as GridSize,
                    points: Math.min(config.points, nextMax),
                  });
                }}
              >
                {s}×{s}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Quantidade de pontos">
          <div className="grid grid-cols-5 gap-2">
            {pointOptions.map((p) => (
              <Chip
                key={p}
                selected={config.points === p}
                onClick={() => setConfig({ points: p })}
              >
                {p}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Modo">
          <div className="grid grid-cols-2 gap-2">
            {(["sequential", "recognition"] as GridMode[]).map((m) => (
              <Chip
                key={m}
                selected={config.mode === m}
                onClick={() => setConfig({ mode: m })}
              >
                {m === "sequential" ? "Sequencial" : "Reconhecimento"}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Tempo de exposição">
          <div className="grid grid-cols-3 gap-2">
            {EXPOSURE_OPTIONS.map((ms) => (
              <Chip
                key={ms}
                selected={config.exposureMs === ms}
                onClick={() => setConfig({ exposureMs: ms })}
              >
                {(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s
              </Chip>
            ))}
          </div>
        </Field>
      </section>

      <section className="mt-6 grid grid-cols-3 gap-2">
        <Stat label="Sessões" value={hydrated ? String(stats.sessions) : "—"} />
        <Stat label="Perfeitas" value={hydrated ? `${perfectRate}%` : "—"} />
        <Stat label="Melhor streak" value={hydrated ? String(stats.bestStreak) : "—"} />
      </section>

      <button
        onClick={() => navigate({ to: "/grid/jogar" })}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-neural py-4 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-[0.98]"
      >
        <Play className="h-5 w-5" />
        Começar
        <ChevronRight className="h-5 w-5" />
      </button>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function Chip({
  children, selected, onClick,
}: { children: React.ReactNode; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-95",
        selected
          ? "border-primary bg-primary/15 text-foreground shadow-glow-primary"
          : "border-border bg-card/60 text-muted-foreground hover:border-primary/50",
      )}
    >
      {children}
    </button>
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
