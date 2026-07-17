import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Baby,
  Infinity as InfinityIcon,
  Repeat2,
  Shuffle,
  Timer,
  Zap,
  Trophy,
  Volume2,
  VolumeX,
  Vibrate,
  VibrateOff,
  Play,
  CalendarDays,
} from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSequenceStorage } from "@/features/sequencia/useSequenceStorage";
import {
  ACHIEVEMENTS,
  MODE_LABEL,
  MODES,
  type GameMode,
} from "@/features/sequencia/types";
import { isToday } from "@/features/sequencia/engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sequencia/")({
  component: SequenciaIndex,
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Infinite: InfinityIcon,
  Timer,
  Repeat2,
  Shuffle,
  Zap,
  Baby,
};

function SequenciaIndex() {
  const navigate = useNavigate();
  const { hydrated, config, stats, setConfig } = useSequenceStorage();
  const [showSettings, setShowSettings] = useState(false);

  const dailyPlayed = hydrated && stats.lastDailyDate
    ? isToday(new Date(stats.lastDailyDate))
    : false;

  return (
    <AppShell title="Memory Sequence" back="/">
      <p className="text-sm text-muted-foreground">
        Repita a sequência de cores que se expande a cada rodada. Treina memória de trabalho,
        atenção sustentada e tempo de reação.
      </p>

      {/* Stats summary */}
      {hydrated && stats.games > 0 && (
        <section className="mt-5 grid grid-cols-3 gap-2">
          <Stat label="Partidas" value={String(stats.games)} />
          <Stat label="Recorde" value={String(stats.bestSequence)} />
          <Stat label="Maior pont." value={String(stats.bestScore)} />
        </section>
      )}

      {/* Mode selection */}
      <section className="mt-6 space-y-2">
        <h2 className="px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Modos de jogo
        </h2>
        {MODES.map((mode) => {
          const info = MODE_LABEL[mode];
          const Icon = ICONS[info.icon] ?? Infinite;
          const best = hydrated ? (stats.bestByMode[mode] ?? 0) : 0;
          return (
            <button
              key={mode}
              onClick={() => navigate({ to: "/sequencia/jogar", search: { mode } })}
              className={cn(
                "flex w-full items-center gap-4 rounded-2xl border border-border bg-card/60 p-4 text-left transition-all",
                "hover:border-primary/50 hover:shadow-glow-primary active:scale-[0.99]",
              )}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-neural">
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-display text-base font-semibold text-foreground">
                  {info.label}
                </div>
                <div className="text-xs text-muted-foreground">{info.desc}</div>
              </div>
              {best > 0 && (
                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-accent">{best}</div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">recorde</div>
                </div>
              )}
            </button>
          );
        })}
      </section>

      {/* Daily challenge */}
      <section className="mt-4">
        <button
          onClick={() => navigate({ to: "/sequencia/jogar", search: { mode: "classic", daily: 1 } })}
          disabled={dailyPlayed}
          className={cn(
            "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all active:scale-[0.99]",
            dailyPlayed
              ? "border-border bg-card/30 opacity-60"
              : "border-accent/40 bg-accent/10 hover:border-accent/60 hover:shadow-glow-accent",
          )}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/20">
            <CalendarDays className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <div className="font-display text-base font-semibold text-foreground">
              Desafio Diário
            </div>
            <div className="text-xs text-muted-foreground">
              {dailyPlayed ? "Já jogou hoje — volte amanhã!" : "Sequência fixa do dia — mesma para todos."}
            </div>
          </div>
          {!dailyPlayed && <Play className="h-5 w-5 text-accent" />}
        </button>
      </section>

      {/* Achievements */}
      {hydrated && stats.achievements.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Conquistas
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {ACHIEVEMENTS.map((ach) => {
              const unlocked = stats.achievements.includes(ach.id);
              return (
                <div
                  key={ach.id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-3",
                    unlocked
                      ? "border-accent/40 bg-accent/10"
                      : "border-border bg-card/30 opacity-50",
                  )}
                >
                  <Trophy className={cn("h-4 w-4 shrink-0", unlocked ? "text-accent" : "text-muted-foreground")} />
                  <div>
                    <div className="text-xs font-semibold text-foreground">{ach.label}</div>
                    <div className="text-[10px] text-muted-foreground">{ach.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Settings toggle */}
      <button
        onClick={() => setShowSettings((v) => !v)}
        className="mt-6 w-full rounded-xl border border-border bg-card/60 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {showSettings ? "Ocultar configurações" : "Configurações"}
      </button>

      {showSettings && (
        <section className="mt-3 space-y-3 rounded-2xl border border-border bg-card/60 p-4">
          <ToggleRow
            icon={config.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            label="Som"
            value={config.soundEnabled}
            onChange={(v) => setConfig({ soundEnabled: v })}
          />
          <ToggleRow
            icon={config.vibrateEnabled ? <Vibrate className="h-4 w-4" /> : <VibrateOff className="h-4 w-4" />}
            label="Vibração"
            value={config.vibrateEnabled}
            onChange={(v) => setConfig({ vibrateEnabled: v })}
          />
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cores (modo aleatório)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[6, 8, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setConfig({ colorCount: n })}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-medium transition-all active:scale-95",
                    config.colorCount === n
                      ? "border-primary bg-primary/15 text-foreground shadow-glow-primary"
                      : "border-border bg-card/60 text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 text-center">
      <div className="font-mono text-xl font-bold text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between"
    >
      <span className="flex items-center gap-2 text-sm text-foreground">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          value ? "bg-primary" : "bg-secondary/60",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform",
            value ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
