import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Play, Trophy, Clock, Flame, Target } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  CIPHER_MODE_DESC,
  CIPHER_MODE_ICON,
  CIPHER_MODE_LABEL,
  DIFFICULTY_DESC,
  DIFFICULTY_LABEL,
  GAME_MODE_DESC,
  GAME_MODE_LABEL,
  type CipherMode,
  type Difficulty,
  type GameMode,
} from "@/features/cripto/types";
import { useCriptoStorage } from "@/features/cripto/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cripto/")({
  component: CriptoIndex,
});

const CIPHER_STYLES: Record<CipherMode, string> = {
  substitution: "from-sky-400/25 to-cyan-400/10 border-sky-400/40",
  symbol: "from-violet-400/25 to-fuchsia-400/10 border-violet-400/40",
  caesar: "from-amber-400/25 to-orange-400/10 border-amber-400/40",
  numeric: "from-emerald-400/25 to-teal-400/10 border-emerald-400/40",
};

const MODE_ICONS: Record<GameMode, React.ComponentType<{ className?: string }>> = {
  training: Play,
  classic: Trophy,
  timed: Clock,
  daily: Target,
};

function formatTime(ms: number): string {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${r.toString().padStart(2, "0")}` : `${r}s`;
}

function CriptoIndex() {
  const navigate = useNavigate();
  const { hydrated, prefs, stats, setPrefs } = useCriptoStorage();

  const startGame = (mode: CipherMode, difficulty: Difficulty = prefs.difficulty) => {
    setPrefs({ mode, difficulty });
    navigate({ to: "/cripto/jogar", search: { mode, difficulty, gameMode: prefs.gameMode } });
  };

  const cipherModes: CipherMode[] = ["substitution", "symbol", "caesar", "numeric"];
  const difficulties: Difficulty[] = ["easy", "medium", "hard", "expert"];
  const gameModes: GameMode[] = ["training", "classic", "timed", "daily"];

  return (
    <AppShell title="Criptograma" back="/">
      <p className="text-sm text-muted-foreground">
        Descubra mensagens ocultas usando dedução lógica. Cada modo usa uma cifra diferente —
        o aprendizado acontece jogando, sem precisar conhecer criptografia.
      </p>

      {/* Stats */}
      {hydrated && stats.solved > 0 && (
        <section className="mt-4 grid grid-cols-4 gap-2">
          <Stat icon={<Trophy className="h-3.5 w-3.5" />} label="Resolvidos" value={String(stats.solved)} />
          <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Melhor" value={formatTime(stats.bestTimeMs)} />
          <Stat icon={<Flame className="h-3.5 w-3.5" />} label="Sequência" value={String(stats.bestStreak)} />
          <Stat icon={<Target className="h-3.5 w-3.5" />} label="Dicas" value={String(stats.hintsUsed)} />
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

      {/* Cipher modes */}
      <section className="mt-6 space-y-3">
        <h2 className="px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Tipo de Cifra
        </h2>
        {cipherModes.map((cm) => (
          <button
            key={cm}
            onClick={() => startGame(cm)}
            className={cn(
              "group relative w-full overflow-hidden rounded-2xl border bg-gradient-to-br p-4 text-left transition-all active:scale-[0.98]",
              CIPHER_STYLES[cm],
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/60 font-display text-lg font-bold text-foreground">
                  {CIPHER_MODE_ICON[cm]}
                </div>
                <div className="flex-1">
                  <div className="font-display text-base font-bold">{CIPHER_MODE_LABEL[cm]}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{CIPHER_MODE_DESC[cm]}</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-foreground/70 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        ))}
      </section>

      {/* Start button */}
      <button
        onClick={() => startGame(prefs.mode)}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-neural py-4 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-[0.98]"
      >
        <Play className="h-5 w-5" />
        Jogar {CIPHER_MODE_LABEL[prefs.mode]}
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
