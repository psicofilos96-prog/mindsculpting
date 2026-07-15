import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Play } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useRegraStorage } from "@/features/regra/useRegraStorage";
import {
  COUNT_OPTIONS,
  TIMEOUT_OPTIONS,
  type RuleDifficulty,
} from "@/features/regra/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/regra/")({
  component: RegraIndex,
});

function RegraIndex() {
  const navigate = useNavigate();
  const { hydrated, config, stats, setConfig } = useRegraStorage();

  const accuracy =
    stats.totalAnswers > 0
      ? Math.round((stats.totalCorrect / stats.totalAnswers) * 100)
      : 0;

  return (
    <AppShell title="Regra Ativa" back="/">
      <p className="text-sm text-muted-foreground">
        Uma regra é sorteada e fica visível o tempo todo. Para cada número que aparecer, aplique
        a regra de cabeça e escolha o resultado correto.
      </p>

      <section className="mt-6 space-y-4">
        <Field label="Dificuldade da regra">
          <div className="grid grid-cols-2 gap-2">
            <Chip
              selected={config.difficulty === "easy"}
              onClick={() => setConfig({ difficulty: "easy" as RuleDifficulty })}
            >
              Fácil
            </Chip>
            <Chip
              selected={config.difficulty === "hard"}
              onClick={() => setConfig({ difficulty: "hard" as RuleDifficulty })}
            >
              Difícil
            </Chip>
          </div>
        </Field>

        <Field label="Números por rodada">
          <div className="grid grid-cols-3 gap-2">
            {COUNT_OPTIONS.map((c) => (
              <Chip
                key={c}
                selected={config.count === c}
                onClick={() => setConfig({ count: c })}
              >
                {c}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Tempo para responder cada número">
          <div className="grid grid-cols-4 gap-2">
            {TIMEOUT_OPTIONS.map((ms) => (
              <Chip
                key={ms}
                selected={config.timeoutMs === ms}
                onClick={() => setConfig({ timeoutMs: ms })}
              >
                {ms / 1000}s
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
        onClick={() => navigate({ to: "/regra/jogar" })}
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
