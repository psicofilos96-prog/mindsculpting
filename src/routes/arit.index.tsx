import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Play, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAritStorage } from "@/features/arit/useAritStorage";
import {
  INTERVAL_OPTIONS,
  LAST_N_OPTIONS,
  ROUNDS_OPTIONS,
  TIME_OPTIONS,
  type SessionMode,
} from "@/features/arit/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/arit/")({
  component: BufferIndex,
});

function BufferIndex() {
  const navigate = useNavigate();
  const { hydrated, config, stats, setConfig } = useAritStorage();

  const accuracy =
    stats.totalRounds > 0 ? Math.round((stats.totalCorrect / stats.totalRounds) * 100) : 0;

  return (
    <AppShell title="Buffer Contínuo" back="/">
      <p className="text-sm text-muted-foreground">
        Números aparecem um após o outro, sem parar. A qualquer momento a exibição é interrompida
        e você deve digitar os <span className="text-foreground">últimos N</span> na ordem pedida.
      </p>

      <section className="mt-6 space-y-4">
        <Field label="Velocidade (tempo entre números)">
          <div className="grid grid-cols-3 gap-2">
            {INTERVAL_OPTIONS.map((ms) => (
              <Chip
                key={ms}
                selected={config.intervalMs === ms}
                onClick={() => setConfig({ intervalMs: ms })}
              >
                {(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 2)}s
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Quantos últimos lembrar">
          <div className="grid grid-cols-3 gap-2">
            {LAST_N_OPTIONS.map((n) => (
              <Chip key={n} selected={config.lastN === n} onClick={() => setConfig({ lastN: n })}>
                {n}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Ordem de resposta">
          <div className="grid grid-cols-2 gap-2">
            <Chip
              selected={config.order === "chronological"}
              onClick={() => setConfig({ order: "chronological" })}
            >
              Do mais antigo
            </Chip>
            <Chip
              selected={config.order === "reverse"}
              onClick={() => setConfig({ order: "reverse" })}
            >
              Do mais recente
            </Chip>
          </div>
        </Field>

        <Field label="Duração da sessão">
          <div className="mb-2 grid grid-cols-2 gap-2">
            <Chip
              selected={config.sessionMode === "rounds"}
              onClick={() =>
                setConfig({ sessionMode: "rounds" as SessionMode, sessionValue: 10 })
              }
            >
              Rodadas
            </Chip>
            <Chip
              selected={config.sessionMode === "time"}
              onClick={() =>
                setConfig({ sessionMode: "time" as SessionMode, sessionValue: 2 })
              }
            >
              Tempo
            </Chip>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(config.sessionMode === "rounds" ? ROUNDS_OPTIONS : TIME_OPTIONS).map((v) => (
              <Chip
                key={v}
                selected={config.sessionValue === v}
                onClick={() => setConfig({ sessionValue: v })}
              >
                {config.sessionMode === "rounds" ? `${v} rod.` : `${v} min`}
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
        onClick={() => navigate({ to: "/arit/jogar" })}
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
