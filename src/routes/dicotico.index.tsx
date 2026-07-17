import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Headphones, Play, Volume2 } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useDicoticoStorage } from "@/features/dicotico/useDicoticoStorage";
import {
  DURATION_OPTIONS,
  QUESTION_LABEL,
  QUESTION_TYPES,
  ROUNDS_OPTIONS,
  VARIATION_LABEL,
  VARIATION_TYPES,
  type ConfigQuestionType,
  type DicoticoConfig,
  type VariationType,
} from "@/features/dicotico/types";
import { playHeadphoneTest, unlockAudio } from "@/features/dicotico/engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dicotico/")({
  component: DicoticoIndex,
});

function DicoticoIndex() {
  const navigate = useNavigate();
  const { hydrated, config, stats, setConfig } = useDicoticoStorage();
  const [showWarning, setShowWarning] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  const accuracy =
    stats.totalAnswers > 0 ? Math.round((stats.totalCorrect / stats.totalAnswers) * 100) : 0;
  const leftAcc = stats.leftTotal > 0 ? Math.round((stats.leftCorrect / stats.leftTotal) * 100) : 0;
  const rightAcc = stats.rightTotal > 0 ? Math.round((stats.rightCorrect / stats.rightTotal) * 100) : 0;

  const handleTest = () => {
    unlockAudio();
    playHeadphoneTest();
  };

  const handleConfirm = () => {
    unlockAudio();
    setConfirmed(true);
    setShowWarning(false);
  };

  if (showWarning && !confirmed) {
    return (
      <AppShell title="Escuta Dicótica" back="/">
        <div className="mt-8 flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-neural shadow-glow-primary">
            <Headphones className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Fones de ouvido obrigatórios
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Este módulo exige o uso de fones de ouvido estéreo para funcionar corretamente.
            Cada ouvido recebe um som diferente simultaneamente — sem fones, o exercício perde
            totalmente o sentido.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Conecte seus fones agora. Você pode fazer um teste rápido para confirmar que o
            estéreo está funcionando.
          </p>

          <button
            onClick={handleTest}
            className="mt-6 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/50"
          >
            <Volume2 className="h-4 w-4" />
            Testar estéreo (esquerdo → direito)
          </button>

          <button
            onClick={handleConfirm}
            className="mt-3 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-gradient-neural py-3.5 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-[0.98]"
          >
            <Headphones className="h-5 w-5" />
            Estou com fones, continuar
          </button>

          <p className="mt-4 text-xs text-muted-foreground">
            Dica: ajuste o volume para um nível confortável antes de começar.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Escuta Dicótica" back="/">
      <p className="text-sm text-muted-foreground">
        Dois sons tocam simultaneamente, um em cada ouvido. Responda o que ouviu — treina
        integração hemisférica via corpo caloso.
      </p>

      <section className="mt-6 space-y-4">
        <Field label="Tipo de variação">
          <div className="grid grid-cols-2 gap-2">
            {VARIATION_TYPES.map((v) => (
              <Chip
                key={v}
                selected={config.variationType === v}
                onClick={() => setConfig({ variationType: v as VariationType })}
              >
                {VARIATION_LABEL[v].label}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {VARIATION_LABEL[config.variationType].desc}
          </p>
        </Field>

        <Field label="Tipo de pergunta">
          <div className="grid grid-cols-2 gap-2">
            {QUESTION_TYPES.map((q) => (
              <Chip
                key={q}
                selected={config.questionType === q}
                onClick={() => setConfig({ questionType: q as ConfigQuestionType })}
              >
                {QUESTION_LABEL[q].label}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {QUESTION_LABEL[config.questionType].desc}
          </p>
        </Field>

        <Field label="Duração do som">
          <div className="grid grid-cols-3 gap-2">
            {DURATION_OPTIONS.map((ms) => (
              <Chip
                key={ms}
                selected={config.durationMs === ms}
                onClick={() => setConfig({ durationMs: ms as DicoticoConfig["durationMs"] })}
              >
                {(ms / 1000).toFixed(1)}s
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
                onClick={() => setConfig({ rounds: n as DicoticoConfig["rounds"] })}
              >
                {n}
              </Chip>
            ))}
          </div>
        </Field>
      </section>

      {hydrated && stats.sessions > 0 && (
        <section className="mt-6 grid grid-cols-3 gap-2">
          <Stat label="Sessões" value={String(stats.sessions)} />
          <Stat label="Acurácia" value={`${accuracy}%`} />
          <Stat label="Esq./Dir." value={`${leftAcc}%/${rightAcc}%`} />
        </section>
      )}

      <button
        onClick={() => navigate({ to: "/dicotico/jogar" })}
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
