import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, BookOpen, Layers, Brain, Repeat, Clock, ListOrdered, Eye, Zap, Vibrate } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  GAME_MODES,
  GAME_MODE_LABEL,
  LIST_TYPES,
  LIST_TYPE_LABEL,
  WORDS_BY_DIFFICULTY,
  type Difficulty,
  type GameMode,
  type ListType,
} from "@/features/recall/types";
import { useLocalProgress } from "@/features/progress/useLocalProgress";
import { getRecallStats } from "@/features/progress/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/recall/")({
  component: RecallIndex,
});

const MODE_ICONS: Record<GameMode, React.ComponentType<{ className?: string }>> = {
  classico: BookOpen,
  rodadas: Repeat,
  tardia: Clock,
  ordem: ListOrdered,
  reconhecimento: Eye,
  distrator: Zap,
};

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  facil: "from-emerald-400/30 to-teal-400/10 border-emerald-400/40",
  medio: "from-sky-400/30 to-cyan-400/10 border-sky-400/40",
  dificil: "from-amber-400/30 to-orange-400/10 border-amber-400/40",
  especialista: "from-primary/40 to-accent/20 border-primary/50",
};

function RecallIndex() {
  const navigate = useNavigate();
  const { state, setRecallPrefs, hydrated } = useLocalProgress();
  const prefs = state.recallPrefs;

  const startGame = () => {
    navigate({
      to: "/recall/jogar",
      search: {
        difficulty: prefs.difficulty,
        gameMode: prefs.gameMode,
        listType: prefs.listType,
      },
    });
  };

  return (
    <AppShell title="Recordação Livre de Palavras" back="/">
      <p className="text-sm text-muted-foreground">
        Memorize uma lista de palavras e recorde-as depois. 6 modos de jogo,
        níveis progressivos, e estatísticas cognitivas detalhadas.
      </p>

      {/* Difficulty */}
      <section className="mt-5">
        <h2 className="mb-2 px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Dificuldade
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {DIFFICULTIES.map((d) => {
            const info = DIFFICULTY_LABEL[d];
            const active = prefs.difficulty === d;
            const wordCount = WORDS_BY_DIFFICULTY[d];
            return (
              <button
                key={d}
                onClick={() => setRecallPrefs({ difficulty: d })}
                className={cn(
                  "rounded-xl border bg-gradient-to-br p-3 text-left transition-all active:scale-[0.98]",
                  active ? DIFFICULTY_STYLES[d] : "border-border bg-card/60",
                )}
              >
                <div className="font-display text-sm font-bold">{info.label}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{info.desc}</div>
                <div className="mt-1 text-[10px] font-mono text-muted-foreground">{wordCount} palavras</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Game mode */}
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
                onClick={() => setRecallPrefs({ gameMode: gm })}
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

      {/* List type */}
      <section className="mt-5">
        <h2 className="mb-2 px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Tipo de lista
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {LIST_TYPES.map((lt) => {
            const info = LIST_TYPE_LABEL[lt];
            const active = prefs.listType === lt;
            const Icon = lt === "aleatoria" ? Layers : Brain;
            return (
              <button
                key={lt}
                onClick={() => setRecallPrefs({ listType: lt })}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-all active:scale-[0.99]",
                  active
                    ? "border-accent/50 bg-accent/10 shadow-glow-accent"
                    : "border-border bg-card/60 hover:border-accent/30",
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

      {/* Stats */}
      {hydrated && (() => {
        const stats = getRecallStats(state, prefs.difficulty);
        if (stats.games === 0) return null;
        return (
          <section className="mt-5 rounded-2xl border border-border bg-card/60 p-4">
            <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Estatísticas — {DIFFICULTY_LABEL[prefs.difficulty].label}
            </h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Jogos" value={String(stats.games)} />
              <Stat label="Melhor %" value={`${Math.round(stats.bestRecall)}%`} />
              <Stat label="Melhor pontuação" value={String(stats.bestScore)} />
              <Stat label="Intrusões" value={String(stats.totalIntrusions)} />
              <Stat label="Perseverações" value={String(stats.totalPerseverations)} />
              <Stat label="Palavras" value={String(stats.totalWords)} />
            </div>
          </section>
        );
      })()}

      {/* Vibration toggle */}
      <button
        onClick={() => setRecallPrefs({ vibrate: !prefs.vibrate })}
        className="mt-4 flex w-full items-center justify-between rounded-xl border border-border bg-card/60 px-3 py-2.5"
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

      {/* Start button */}
      <button
        onClick={startGame}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-neural py-4 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-[0.98]"
      >
        Começar <ChevronRight className="h-5 w-5" />
      </button>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-2">
      <div className="font-mono text-base font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
