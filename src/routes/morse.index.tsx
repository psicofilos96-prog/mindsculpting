import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Play, ChevronRight, Radio } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useMorseStorage } from "@/features/morse/useMorseStorage";
import { WPM_OPTIONS } from "@/features/morse/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/morse/")({
  component: MorseIndex,
});

function MorseIndex() {
  const navigate = useNavigate();
  const { hydrated, config, stats, setConfig } = useMorseStorage();

  const accuracy =
    stats.totalRounds > 0 ? Math.round((stats.totalCorrect / stats.totalRounds) * 100) : 0;

  return (
    <AppShell title="Código Morse" back="/">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
        <Radio className="h-4 w-4" />
        Mundo I · Fundamentos
      </div>
      <p className="text-sm text-muted-foreground">
        Ouça o sinal sonoro e diga se é <span className="text-foreground">ponto</span> ou{" "}
        <span className="text-foreground">traço</span>. A cada 5 acertos, a sequência cresce.
      </p>

      <section className="mt-6 space-y-4">
        <Field label="Velocidade (WPM)">
          <div className="grid grid-cols-4 gap-2">
            {WPM_OPTIONS.map((wpm) => (
              <Chip key={wpm} selected={config.wpm === wpm} onClick={() => setConfig({ wpm })}>
                {wpm}
              </Chip>
            ))}
          </div>
        </Field>
      </section>

      <section className="mt-6 grid grid-cols-3 gap-2">
        <Stat label="Sessões" value={hydrated ? String(stats.sessions) : "—"} />
        <Stat label="Acurácia" value={hydrated ? `${accuracy}%` : "—"} />
        <Stat label="Melhor streak" value={hydrated ? String(stats.bestStreak) : "—"} />
      </section>

      <button
        onClick={() => navigate({ to: "/morse/mundo-1" })}
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
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
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
