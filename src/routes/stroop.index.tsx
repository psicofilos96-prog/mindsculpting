import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Play } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStroopStorage } from "@/features/stroop/useStroopStorage";
import {
  COLOR_COUNT_OPTIONS,
  RATIO_OPTIONS,
  ROUNDS_OPTIONS,
  TIME_LIMIT_OPTIONS,
  type StroopConfig,
} from "@/features/stroop/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stroop/")({
  component: StroopIndex,
});

function StroopIndex() {
  const navigate = useNavigate();
  const { hydrated, config, stats, setConfig } = useStroopStorage();

  const accuracy =
    stats.totalAnswers > 0 ? Math.round((stats.totalCorrect / stats.totalAnswers) * 100) : 0;

  return (
    <AppShell title="Teste Stroop" back="/">
      <p className="text-sm text-muted-foreground">
        Uma palavra colorida aparece — ignore o que ela diz e responda a{" "}
        <span className="text-foreground">cor da fonte</span>. Treina controle inibitório e
        atenção seletiva.
      </p>

      <section className="mt-6 space-y-4">
        <Field label="Cores em jogo">
          <div className="grid grid-cols-3 gap-2">
            {COLOR_COUNT_OPTIONS.map((n) => (
              <Chip
                key={n}
                selected={config.colorCount === n}
                onClick={() => setConfig({ colorCount: n as StroopConfig["colorCount"] })}
              >
                {n} cores
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Rodadas por sessão">
          <div className="grid grid-cols-3 gap-2">
            {ROUNDS_OPTIONS.map((n) => (
              <Chip
                key={n}
                selected={config.rounds === n}
                onClick={() => setConfig({ rounds: n as StroopConfig["rounds"] })}
              >
                {n}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Tempo por rodada">
          <div className="grid grid-cols-3 gap-2">
            {TIME_LIMIT_OPTIONS.map((ms) => (
              <Chip
                key={ms}
                selected={config.timeLimitMs === ms}
                onClick={() => setConfig({ timeLimitMs: ms as StroopConfig["timeLimitMs"] })}
              >
                {(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Proporção incongruente">
          <div className="grid grid-cols-3 gap-2">
            {RATIO_OPTIONS.map((r) => (
              <Chip
                key={r}
                selected={config.incongruentRatio === r}
                onClick={() =>
                  setConfig({ incongruentRatio: r as StroopConfig["incongruentRatio"] })
                }
              >
                {Math.round(r * 100)}%
              </Chip>
            ))}
          </div>
        </Field>
      </section>

      <section className="mt-6 grid grid-cols-3 gap-2">
        <Stat label="Sessões" value={hydrated ? String(stats.sessions) : "—"} />
        <Stat label="Acurácia" value={hydrated ? `${accuracy}%` : "—"} />
        <Stat
          label="Melhor TR"
          value={hydrated && stats.bestAvgMs > 0 ? `${stats.bestAvgMs}ms` : "—"}
        />
      </section>

      <button
        onClick={() => navigate({ to: "/stroop/jogar" })}
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
