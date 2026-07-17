import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Play, Trophy, Clock, Flame, Target } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  CATEGORY_DESC,
  CATEGORY_LABEL,
  DIFFICULTY_DESC,
  DIFFICULTY_LABEL,
  FEEDBACK_LEVEL_DESC,
  FEEDBACK_LEVEL_LABEL,
  GAME_MODE_DESC,
  GAME_MODE_LABEL,
  type Category,
  type Difficulty,
  type FeedbackLevel,
  type GameMode,
} from "@/features/cofres/types";
import { useCofresStorage } from "@/features/cofres/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cofres/")({
  component: CofresIndex,
});

const CATEGORY_STYLES: Record<Category, string> = {
  numeric: "from-sky-400/25 to-cyan-400/10 border-sky-400/40",
  letters: "from-violet-400/25 to-fuchsia-400/10 border-violet-400/40",
};

const MODE_ICONS: Record<GameMode, React.ComponentType<{ className?: string }>> = {
  classic: Play,
  timed: Clock,
  survival: Flame,
  hacker: Target,
  bank: Trophy,
  spy: Target,
};

function formatTime(ms: number): string {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${r.toString().padStart(2, "0")}` : `${r}s`;
}

function CofresIndex() {
  const navigate = useNavigate();
  const { hydrated, prefs, stats, setPrefs } = useCofresStorage();

  const startGame = () => {
    navigate({
      to: "/cofres/jogar",
      search: {
        category: prefs.category,
        difficulty: prefs.difficulty,
        feedbackLevel: prefs.feedbackLevel,
        gameMode: prefs.gameMode,
      },
    });
  };

  const categories: Category[] = ["numeric", "letters"];
  const difficulties: Difficulty[] = ["I", "II", "III", "mestre", "einstein"];
  const feedbackLevels: FeedbackLevel[] = ["easy", "medium", "hard"];
  const gameModes: GameMode[] = ["classic", "timed", "survival", "hacker", "bank", "spy"];

  return (
    <AppShell title="Cofres Lógicos" back="/">
      <p className="text-sm text-muted-foreground">
        Descubra a senha secreta através de tentativas sucessivas e feedback lógico.
        Cada tentativa revela informações — use dedução, não sorte.
      </p>

      {/* Stats */}
      {hydrated && stats.solved > 0 && (
        <section className="mt-4 grid grid-cols-4 gap-2">
          <Stat icon={<Trophy className="h-3.5 w-3.5" />} label="Resolvidos" value={String(stats.solved)} />
          <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Melhor" value={formatTime(stats.bestTimeMs)} />
          <Stat icon={<Flame className="h-3.5 w-3.5" />} label="Sequência" value={String(stats.bestStreak)} />
          <Stat icon={<Target className="h-3.5 w-3.5" />} label="Tentativas" value={String(stats.totalGuesses)} />
        </section>
      )}

      {/* Category */}
      <section className="mt-5">
        <h2 className="mb-2 px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Categoria
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setPrefs({ category: c })}
              className={cn(
                "rounded-xl border p-3 text-left transition-all active:scale-[0.98]",
                prefs.category === c
                  ? "border-primary/50 bg-primary/10 shadow-glow-primary"
                  : "border-border bg-card/60 hover:border-primary/30",
              )}
            >
              <div className="text-sm font-semibold text-foreground">{CATEGORY_LABEL[c]}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{CATEGORY_DESC[c]}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Difficulty */}
      <section className="mt-5">
        <h2 className="mb-2 px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Dificuldade
        </h2>
        <div className="space-y-1.5">
          {difficulties.map((d) => (
            <button
              key={d}
              onClick={() => setPrefs({ difficulty: d })}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all active:scale-[0.98]",
                prefs.difficulty === d
                  ? "border-primary/50 bg-primary/10 shadow-glow-primary"
                  : "border-border bg-card/60 hover:border-primary/30",
              )}
            >
              <div>
                <div className="text-sm font-semibold text-foreground">{DIFFICULTY_LABEL[d]}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{DIFFICULTY_DESC[d]}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Feedback Level */}
      <section className="mt-5">
        <h2 className="mb-2 px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Nível de Feedback
        </h2>
        <div className="space-y-1.5">
          {feedbackLevels.map((f) => (
            <button
              key={f}
              onClick={() => setPrefs({ feedbackLevel: f })}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all active:scale-[0.98]",
                prefs.feedbackLevel === f
                  ? "border-primary/50 bg-primary/10 shadow-glow-primary"
                  : "border-border bg-card/60 hover:border-primary/30",
              )}
            >
              <div>
                <div className="text-sm font-semibold text-foreground">{FEEDBACK_LEVEL_LABEL[f]}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{FEEDBACK_LEVEL_DESC[f]}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Game Mode */}
      <section className="mt-5">
        <h2 className="mb-2 px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Modo de Jogo
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

      {/* Start button */}
      <button
        onClick={startGame}
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
