import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Keyboard, ListChecks } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LEVELS, LEVEL_CONFIG, type Level } from "@/features/calculo/types";
import { useLocalProgress } from "@/features/progress/useLocalProgress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calculo/")({
  component: CalculoIndex,
});

const LEVEL_STYLES: Record<Level, string> = {
  facil: "from-emerald-400/30 to-teal-400/10 border-emerald-400/40",
  medio: "from-sky-400/30 to-cyan-400/10 border-sky-400/40",
  dificil: "from-fuchsia-400/30 to-purple-400/10 border-fuchsia-400/40",
  einstein: "from-primary/40 to-accent/20 border-primary/50",
};

function CalculoIndex() {
  const navigate = useNavigate();
  const { state, setPrefs, hydrated } = useLocalProgress();

  const startLevel = (level: Level) => {
    setPrefs({ level });
    navigate({ to: "/calculo/jogar", search: { level } });
  };

  return (
    <AppShell title="Cálculo Mental" back="/">
      <p className="text-sm text-muted-foreground">
        Números aparecem um após o outro. Some, subtraia, multiplique e divida
        <span className="text-foreground"> mentalmente</span>. No fim, escolha (ou digite) a resposta.
      </p>

      <div className="mt-5 rounded-xl border border-border bg-card/60 p-1">
        <div className="grid grid-cols-2 gap-1">
          <ModeToggle
            active={!state.prefs.inputMode}
            onClick={() => setPrefs({ inputMode: false })}
            icon={<ListChecks className="h-4 w-4" />}
            label="Alternativas"
          />
          <ModeToggle
            active={state.prefs.inputMode}
            onClick={() => setPrefs({ inputMode: true })}
            icon={<Keyboard className="h-4 w-4" />}
            label="Digitação"
          />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {LEVELS.map((lv) => {
          const cfg = LEVEL_CONFIG[lv];
          const stat = hydrated ? state.stats[lv] : undefined;
          const acc = stat && stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : null;
          return (
            <button
              key={lv}
              onClick={() => startLevel(lv)}
              className={cn(
                "group relative w-full overflow-hidden rounded-2xl border bg-gradient-to-br p-5 text-left transition-all active:scale-[0.98]",
                LEVEL_STYLES[lv],
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-display text-xl font-bold">{cfg.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{cfg.desc}</div>
                  <div className="mt-2 flex gap-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    <span>{cfg.steps[0]}–{cfg.steps[1]} passos</span>
                    <span>{(cfg.stepMs / 1000).toFixed(1)}s / nº</span>
                    {acc !== null && <span className="text-foreground">{acc}% acerto</span>}
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 text-foreground/70 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/sobre" className="underline underline-offset-4">
          Como isso treina seu cérebro
        </Link>
      </p>
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
