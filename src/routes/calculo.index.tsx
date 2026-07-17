import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  Keyboard,
  ListChecks,
  Infinity as InfinityIcon,
  Timer,
  Heart,
  Target,
  CalendarDays,
  Zap,
  Clock,
  Eye,
  Vibrate,
} from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  FLASH_LABELS,
  FLASH_OPTIONS,
  GAME_MODES,
  GAME_MODE_LABEL,
  LEVELS,
  LEVEL_CONFIG,
  PRECISION_COUNTS,
  TIME_LABELS,
  TIME_OPTIONS,
  TIMED_DURATIONS,
  TIMED_DURATION_LABELS,
  type GameMode,
  type Level,
} from "@/features/calculo/types";
import { useLocalProgress } from "@/features/progress/useLocalProgress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calculo/")({
  component: CalculoIndex,
});

const LEVEL_STYLES: Record<Level, string> = {
  iniciante: "from-emerald-400/30 to-teal-400/10 border-emerald-400/40",
  intermediario: "from-sky-400/30 to-cyan-400/10 border-sky-400/40",
  "mult-basica": "from-amber-400/30 to-orange-400/10 border-amber-400/40",
  "mult-avancada": "from-orange-400/30 to-red-400/10 border-orange-400/40",
  "div-basica": "from-violet-400/30 to-purple-400/10 border-violet-400/40",
  "div-avancada": "from-fuchsia-400/30 to-pink-400/10 border-fuchsia-400/40",
  "misto-basico": "from-teal-400/30 to-cyan-400/10 border-teal-400/40",
  "misto-avancado": "from-indigo-400/30 to-blue-400/10 border-indigo-400/40",
  einstein: "from-primary/40 to-accent/20 border-primary/50",
};

const MODE_ICONS: Record<GameMode, React.ComponentType<{ className?: string }>> = {
  practice: InfinityIcon,
  timed: Timer,
  survival: Heart,
  precision: Target,
  daily: CalendarDays,
};

function CalculoIndex() {
  const navigate = useNavigate();
  const { state, setPrefs, hydrated } = useLocalProgress();
  const prefs = state.prefs;
  const [showSettings, setShowSettings] = useState(false);

  const startGame = (level: Level, gameMode: GameMode = prefs.gameMode) => {
    setPrefs({ level, gameMode });
    navigate({ to: "/calculo/jogar", search: { level, gameMode } });
  };

  return (
    <AppShell title="Cálculo Mental" back="/">
      <p className="text-sm text-muted-foreground">
        Resolva operações matemáticas o mais rápido possível. Níveis progressivos,
        modo flash, e estatísticas detalhadas.
      </p>

      {/* Game mode selection */}
      <section className="mt-5">
        <h2 className="mb-2 px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Modo de jogo
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {GAME_MODES.map((gm) => {
            const info = GAME_MODE_LABEL[gm];
            const Icon = MODE_ICONS[gm];
            const active = prefs.gameMode === gm;
            return (
              <button
                key={gm}
                onClick={() => setPrefs({ gameMode: gm })}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-all active:scale-[0.99]",
                  active
                    ? "border-primary/50 bg-primary/10 shadow-glow-primary"
                    : "border-border bg-card/60 hover:border-primary/30",
                )}
              >
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  active ? "bg-gradient-neural" : "bg-secondary/60",
                )}>
                  <Icon className={cn("h-4 w-4", active ? "text-primary-foreground" : "text-muted-foreground")} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">{info.label}</div>
                  <div className="text-[11px] text-muted-foreground">{info.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Answer mode toggle */}
      <section className="mt-4 rounded-xl border border-border bg-card/60 p-1">
        <div className="grid grid-cols-2 gap-1">
          <ModeToggle
            active={prefs.answerMode === "choices"}
            onClick={() => setPrefs({ answerMode: "choices" })}
            icon={<ListChecks className="h-4 w-4" />}
            label="Alternativas"
          />
          <ModeToggle
            active={prefs.answerMode === "input"}
            onClick={() => setPrefs({ answerMode: "input" })}
            icon={<Keyboard className="h-4 w-4" />}
            label="Digitação"
          />
        </div>
      </section>

      {/* Level selection */}
      <section className="mt-6 space-y-3">
        <h2 className="px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Níveis
        </h2>
        {LEVELS.map((lv) => {
          const cfg = LEVEL_CONFIG[lv];
          const stat = hydrated ? state.stats[lv] : undefined;
          const acc = stat && stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : null;
          const bestStreak = stat?.bestStreak ?? 0;
          return (
            <button
              key={lv}
              onClick={() => startGame(lv)}
              className={cn(
                "group relative w-full overflow-hidden rounded-2xl border bg-gradient-to-br p-4 text-left transition-all active:scale-[0.98]",
                LEVEL_STYLES[lv],
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="font-display text-base font-bold">{cfg.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{cfg.desc}</div>
                  {stat && stat.games > 0 && (
                    <div className="mt-2 flex gap-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {acc !== null && <span className="text-foreground">{acc}% acerto</span>}
                      <span>streak {bestStreak}</span>
                      <span>{stat.games} jogos</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-foreground/70 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </section>

      {/* Settings */}
      <button
        onClick={() => setShowSettings((v) => !v)}
        className="mt-6 w-full rounded-xl border border-border bg-card/60 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {showSettings ? "Ocultar configurações" : "Configurações"}
      </button>

      {showSettings && (
        <section className="mt-3 space-y-4 rounded-2xl border border-border bg-card/60 p-4">
          {/* Time per question */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Tempo por questão
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {TIME_OPTIONS.map((t) => (
                <OptionChip
                  key={t}
                  active={prefs.timePerQuestion === t}
                  onClick={() => setPrefs({ timePerQuestion: t })}
                  label={TIME_LABELS[t]}
                />
              ))}
            </div>
          </div>

          {/* Flash mode */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Eye className="h-3.5 w-3.5" /> Modo flash (exibição temporária)
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {FLASH_OPTIONS.map((f) => (
                <OptionChip
                  key={f}
                  active={prefs.flashDuration === f}
                  onClick={() => setPrefs({ flashDuration: f })}
                  label={FLASH_LABELS[f]}
                />
              ))}
            </div>
          </div>

          {/* Timed mode duration */}
          {prefs.gameMode === "timed" && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Timer className="h-3.5 w-3.5" /> Duração (modo contra o tempo)
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {TIMED_DURATIONS.map((d) => (
                  <OptionChip
                    key={d}
                    active={prefs.timedDuration === d}
                    onClick={() => setPrefs({ timedDuration: d })}
                    label={TIMED_DURATION_LABELS[d]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Precision count */}
          {prefs.gameMode === "precision" && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Target className="h-3.5 w-3.5" /> Nº de questões (modo precisão)
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {PRECISION_COUNTS.map((n) => (
                  <OptionChip
                    key={n}
                    active={prefs.precisionCount === n}
                    onClick={() => setPrefs({ precisionCount: n })}
                    label={String(n)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Vibration */}
          <button
            onClick={() => setPrefs({ vibrate: !prefs.vibrate })}
            className="flex w-full items-center justify-between"
          >
            <span className="flex items-center gap-2 text-sm text-foreground">
              <Vibrate className="h-4 w-4" /> Vibração
            </span>
            <span className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              prefs.vibrate ? "bg-primary" : "bg-secondary/60",
            )}>
              <span className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform",
                prefs.vibrate ? "translate-x-5" : "translate-x-0.5",
              )} />
            </span>
          </button>
        </section>
      )}
    </AppShell>
  );
}

function ModeToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-gradient-neural text-primary-foreground shadow-glow-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function OptionChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2 py-2 text-xs font-medium transition-all active:scale-95",
        active
          ? "border-primary bg-primary/15 text-foreground shadow-glow-primary"
          : "border-border bg-card/60 text-muted-foreground hover:border-primary/30",
      )}
    >
      {label}
    </button>
  );
}
