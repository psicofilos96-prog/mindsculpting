import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Play, Trophy, Clock, Target, Flame } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  DIFFICULTY_DESC,
  DIFFICULTY_LABEL,
  GAME_MODE_LABEL,
  type Difficulty,
  type GameMode,
} from "@/features/matriz/types";
import { useMatrizStorage } from "@/features/matriz/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/matriz/")({
  component: MatrizIndex,
});

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy: "from-emerald-400/25 to-teal-400/10 border-emerald-400/40",
  medium: "from-sky-400/25 to-cyan-400/10 border-sky-400/40",
  hard: "from-rose-400/25 to-orange-400/10 border-rose-400/40",
};

const MODE_ICONS: Record<GameMode, React.ComponentType<{ className?: string }>> = {
  campaign: Play,
  daily: Target,
  endless: Flame,
  timed: Clock,
};

function formatTime(ms: number): string {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${r.toString().padStart(2, "0")}` : `${r}s`;
}

function MatrizIndex() {
  const navigate = useNavigate();
  const { hydrated, prefs, stats, setPrefs } = useMatrizStorage();

  const startGame = (difficulty: Difficulty, mode: GameMode = prefs.mode) => {
    setPrefs({ difficulty, mode });
    navigate({ to: "/matriz/jogar", search: { difficulty, mode } });
  };

  const difficulties: Difficulty[] = ["easy", "medium", "hard"];
  const modes: GameMode[] = ["campaign", "daily", "endless", "timed"];

  return (
    <AppShell title="Matriz de Restrições" back="/">
      <p className="text-sm text-muted-foreground">
        Preencha a grade Latin Square (cada linha e coluna contém 1 a N sem repetição) e
        satisfaça todas as restrições simultaneamente. Cada letra (A, B, C...) representa o
        valor da diagonal daquela linha.
      </p>

      {/* Stats */}
      {hydrated && stats.solved > 0 && (
        <section className="mt-4 grid grid-cols-4 gap-2">
          <Stat icon={<Trophy className="h-3.5 w-3.5" />} label="Resolvidos" value={String(stats.solved)} />
          <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Melhor" value={formatTime(stats.bestTimeMs)} />
          <Stat icon={<Flame className="h-3.5 w-3.5" />} label="Sequência" value={String(stats.bestStreak)} />
          <Stat icon={<Target className="h-3.5 w-3.5" />} label="Nível máx." value={String(stats.maxLevelCampaign)} />
        </section>
      )}

      {/* Game mode */}
      <section className="mt-5">
        <h2 className="mb-2 px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Modo de jogo
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {modes.map((m) => {
            const Icon = MODE_ICONS[m];
            const active = prefs.mode === m;
            return (
              <button
                key={m}
                onClick={() => setPrefs({ mode: m })}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all active:scale-[0.98]",
                  active
                    ? "border-primary/50 bg-primary/10 shadow-glow-primary"
                    : "border-border bg-card/60 hover:border-primary/30",
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  active ? "bg-gradient-neural" : "bg-secondary/60",
                )}>
                  <Icon className={cn("h-4 w-4", active ? "text-primary-foreground" : "text-muted-foreground")} />
                </div>
                <span className="text-sm font-semibold text-foreground">{GAME_MODE_LABEL[m]}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Difficulty */}
      <section className="mt-6 space-y-3">
        <h2 className="px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Dificuldade
        </h2>
        {difficulties.map((d) => (
          <button
            key={d}
            onClick={() => startGame(d)}
            className={cn(
              "group relative w-full overflow-hidden rounded-2xl border bg-gradient-to-br p-4 text-left transition-all active:scale-[0.98]",
              DIFFICULTY_STYLES[d],
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="font-display text-base font-bold">{DIFFICULTY_LABEL[d]}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{DIFFICULTY_DESC[d]}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-foreground/70 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        ))}
      </section>

      {/* Start button */}
      <button
        onClick={() => startGame(prefs.difficulty)}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-neural py-4 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-[0.98]"
      >
        <Play className="h-5 w-5" />
        Jogar {DIFFICULTY_LABEL[prefs.difficulty]}
      </button>
    </AppShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-2.5 text-center">
      <div className="flex items-center justify-center text-primary">{icon}</div>
      <div className="mt-1 font-mono text-sm font-bold text-foreground">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
