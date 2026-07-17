import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Play, Trophy, Clock, Flame, Target, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  DIFFICULTY_DESC,
  DIFFICULTY_LABEL,
  GAME_MODE_DESC,
  GAME_MODE_LABEL,
  type Difficulty,
  type GameMode,
} from "@/features/einstein/types";
import { THEMES } from "@/features/einstein/themes";
import { useEinsteinStorage } from "@/features/einstein/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/einstein/")({
  component: EinsteinIndex,
});

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy: "from-emerald-400/25 to-teal-400/10 border-emerald-400/40",
  medium: "from-sky-400/25 to-cyan-400/10 border-sky-400/40",
  hard: "from-rose-400/25 to-orange-400/10 border-rose-400/40",
  expert: "from-violet-400/25 to-fuchsia-400/10 border-violet-400/40",
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

function EinsteinIndex() {
  const navigate = useNavigate();
  const { hydrated, prefs, stats, setPrefs } = useEinsteinStorage();

  const startGame = (themeId: string, difficulty: Difficulty = prefs.difficulty) => {
    setPrefs({ themeId, difficulty });
    navigate({
      to: "/einstein/jogar",
      search: { themeId, difficulty, gameMode: prefs.gameMode },
    });
  };

  const difficulties: Difficulty[] = ["easy", "medium", "hard", "expert"];
  const gameModes: GameMode[] = ["campaign", "daily", "endless", "timed"];

  return (
    <AppShell title="Teste de Einstein" back="/">
      {/* Einstein intro quote */}
      <div className="mt-2 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/5 p-4">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm italic text-foreground">
            "Albert Einstein criou este teste de raciocínio lógico no século passado e afirmou
            que 98% da população mundial não seria capaz de resolvê-lo. Você faz parte desse
            grupo seleto?"
          </p>
        </div>
      </div>

      {/* Stats */}
      {hydrated && stats.solved > 0 && (
        <section className="mt-4 grid grid-cols-4 gap-2">
          <Stat icon={<Trophy className="h-3.5 w-3.5" />} label="Resolvidos" value={String(stats.solved)} />
          <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Melhor" value={formatTime(stats.bestTimeMs)} />
          <Stat icon={<Flame className="h-3.5 w-3.5" />} label="Sequência" value={String(stats.bestStreak)} />
          <Stat icon={<Target className="h-3.5 w-3.5" />} label="Nível" value={String(stats.campaignLevel)} />
        </section>
      )}

      {/* Game mode */}
      <section className="mt-5">
        <h2 className="mb-2 px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Modo de jogo
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {gameModes.map((m) => {
            const Icon = MODE_ICONS[m];
            const active = prefs.gameMode === m;
            return (
              <button
                key={m}
                onClick={() => setPrefs({ gameMode: m })}
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
                <div>
                  <div className="text-sm font-semibold text-foreground">{GAME_MODE_LABEL[m]}</div>
                  <div className="text-[10px] text-muted-foreground">{GAME_MODE_DESC[m]}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Difficulty */}
      <section className="mt-5">
        <h2 className="mb-2 px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Dificuldade
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {difficulties.map((d) => (
            <button
              key={d}
              onClick={() => setPrefs({ difficulty: d })}
              className={cn(
                "rounded-xl border p-3 text-left transition-all active:scale-[0.98]",
                prefs.difficulty === d
                  ? "border-primary/50 bg-primary/10 shadow-glow-primary"
                  : "border-border bg-card/60 hover:border-primary/30",
              )}
            >
              <div className="text-sm font-semibold text-foreground">{DIFFICULTY_LABEL[d]}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{DIFFICULTY_DESC[d]}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Themes */}
      <section className="mt-6 space-y-3">
        <h2 className="px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Temas ({THEMES.length} disponíveis)
        </h2>
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => startGame(theme.id)}
            className={cn(
              "group relative w-full overflow-hidden rounded-2xl border bg-gradient-to-br p-4 text-left transition-all active:scale-[0.98]",
              DIFFICULTY_STYLES[prefs.difficulty],
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="font-display text-base font-bold">{theme.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{theme.description}</div>
                <div className="mt-1 text-[10px] text-muted-foreground/70">
                  {theme.numHouses} casas · {theme.categories.length} categorias · {theme.clues.length} pistas
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-foreground/70 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        ))}
      </section>

      {/* Start button */}
      <button
        onClick={() => startGame(prefs.themeId)}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-neural py-4 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-[0.98]"
      >
        <Play className="h-5 w-5" />
        Jogar
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
