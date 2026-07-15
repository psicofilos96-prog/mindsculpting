import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Grid2x2, Keyboard, Play } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLocalProgress } from "@/features/progress/useLocalProgress";
import { getMemoriaStats } from "@/features/progress/storage";
import {
  MEMORIA_ALPHABETS,
  MEMORIA_ALPHABET_LABEL,
  MEMORIA_DISPLAYS,
  MEMORIA_DISPLAY_LABEL,
  MEMORIA_MAX_LENGTH,
  MEMORIA_MIN_LENGTH,
  MEMORIA_MODES,
  MEMORIA_MODE_LABEL,
  MEMORIA_TIME_MAX_MS,
  MEMORIA_TIME_MIN_MS,
} from "@/features/memoria/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/memoria/")({
  component: MemoriaIndex,
});

function MemoriaIndex() {
  const navigate = useNavigate();
  const { state, setMemoriaPrefs, hydrated } = useLocalProgress();
  const {
    mode,
    alphabet,
    input,
    chunking,
    display,
    lengthMode,
    fixedLength,
    totalTimeMs,
  } = state.memoriaPrefs;

  const stat = hydrated ? getMemoriaStats(state, mode, alphabet) : null;
  const acc = stat && stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : null;
  const isPosition = mode === "position";
  const effectiveDisplay = isPosition ? "sequential" : display;

  return (
    <AppShell title="Memorização" back="/">
      <p className="text-sm text-muted-foreground">
        Uma sequência aparece rapidamente. Depois, você
        <span className="text-foreground"> reproduz</span> — na ordem, ao contrário, ou por posição.
      </p>

      <Section title="Modo">
        <div className="grid grid-cols-3 gap-2">
          {MEMORIA_MODES.map((m) => (
            <ChipButton
              key={m}
              active={mode === m}
              onClick={() => setMemoriaPrefs({ mode: m })}
              label={MEMORIA_MODE_LABEL[m].label}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{MEMORIA_MODE_LABEL[mode].desc}</p>
      </Section>

      <Section title="Símbolos">
        <div className="grid grid-cols-3 gap-2">
          {MEMORIA_ALPHABETS.map((a) => (
            <ChipButton
              key={a}
              active={alphabet === a}
              onClick={() => setMemoriaPrefs({ alphabet: a })}
              label={MEMORIA_ALPHABET_LABEL[a]}
            />
          ))}
        </div>
      </Section>

      {!isPosition && (
        <Section title="Como aparece">
          <div className="grid grid-cols-2 gap-2">
            {MEMORIA_DISPLAYS.map((d) => (
              <ChipButton
                key={d}
                active={effectiveDisplay === d}
                onClick={() => setMemoriaPrefs({ display: d })}
                label={MEMORIA_DISPLAY_LABEL[d].label}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {MEMORIA_DISPLAY_LABEL[effectiveDisplay].desc}
          </p>
        </Section>
      )}

      <Section title="Comprimento">
        <div className="mb-2 grid grid-cols-2 gap-2">
          <ChipButton
            active={lengthMode === "adaptive"}
            onClick={() => setMemoriaPrefs({ lengthMode: "adaptive" })}
            label="Adaptativo"
          />
          <ChipButton
            active={lengthMode === "fixed"}
            onClick={() => setMemoriaPrefs({ lengthMode: "fixed" })}
            label={`Fixo · ${fixedLength}`}
          />
        </div>
        {lengthMode === "fixed" && (
          <SliderRow
            value={fixedLength}
            min={MEMORIA_MIN_LENGTH}
            max={MEMORIA_MAX_LENGTH}
            step={1}
            onChange={(v) => setMemoriaPrefs({ fixedLength: v })}
            format={(v) => `${v} símbolos`}
          />
        )}
        {lengthMode === "adaptive" && (
          <p className="text-xs text-muted-foreground">
            Começa em 4 e ajusta ±1 conforme seus acertos (limites {MEMORIA_MIN_LENGTH}–{MEMORIA_MAX_LENGTH}).
          </p>
        )}
      </Section>

      <Section
        title={
          effectiveDisplay === "whole"
            ? "Tempo total para memorizar"
            : "Tempo total da sequência"
        }
      >
        <SliderRow
          value={totalTimeMs}
          min={MEMORIA_TIME_MIN_MS}
          max={MEMORIA_TIME_MAX_MS}
          step={500}
          onChange={(v) => setMemoriaPrefs({ totalTimeMs: v })}
          format={(v) => `${(v / 1000).toFixed(1)} s`}
        />
        {effectiveDisplay === "sequential" && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            ≈ {Math.max(300, Math.round(totalTimeMs / Math.max(1, lengthMode === "fixed" ? fixedLength : 4)))} ms por símbolo
          </p>
        )}
      </Section>

      {!isPosition && (
        <Section title="Entrada">
          <div className="grid grid-cols-2 gap-2">
            <ChipButton
              active={input === "keypad"}
              onClick={() => setMemoriaPrefs({ input: "keypad" })}
              icon={<Keyboard className="h-4 w-4" />}
              label="Teclado"
            />
            <ChipButton
              active={input === "tap"}
              onClick={() => setMemoriaPrefs({ input: "tap" })}
              icon={<Grid2x2 className="h-4 w-4" />}
              label="Toque na grade"
            />
          </div>
        </Section>
      )}

      {effectiveDisplay === "sequential" && (
        <Section title="Ajustes">
          <label className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-3">
            <div>
              <div className="text-sm font-medium">Chunking</div>
              <div className="text-xs text-muted-foreground">
                Pausa a cada 3 itens para você agrupar mentalmente.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMemoriaPrefs({ chunking: !chunking })}
              aria-pressed={chunking}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                chunking ? "bg-primary" : "bg-secondary",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-md transition-transform",
                  chunking ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </button>
          </label>
        </Section>
      )}

      {hydrated && stat && stat.games > 0 && (
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Stat label="Partidas" value={String(stat.games)} />
          <Stat label="Acurácia" value={acc !== null ? `${acc}%` : "—"} />
          <Stat label="Melhor" value={`${stat.bestLength}`} />
        </div>
      )}

      <button
        onClick={() =>
          navigate({
            to: "/memoria/jogar",
            search: {
              mode,
              alphabet,
              input: isPosition ? undefined : input,
              display: isPosition ? undefined : effectiveDisplay,
              lengthMode,
              fixedLength,
              totalTimeMs,
              chunking: chunking ? 1 : 0,
            },
          })
        }
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-neural py-4 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-[0.98]"
      >
        <Play className="h-5 w-5" />
        Começar treino
        <ChevronRight className="h-5 w-5" />
      </button>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/sobre" className="underline underline-offset-4">
          Por que memorizar treina o cérebro
        </Link>
      </p>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 px-1 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ChipButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.98]",
        active
          ? "border-primary/60 bg-gradient-neural text-primary-foreground shadow-glow-primary"
          : "border-border bg-card/60 text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function SliderRow({
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Valor</span>
        <span className="font-mono text-sm font-bold text-foreground">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[color:var(--color-primary)]"
      />
    </div>
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
