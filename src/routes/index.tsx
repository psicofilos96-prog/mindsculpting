import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Calculator, Grid3x3, Hash, Headphones, LayoutGrid, Palette, Sparkles, Target } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLocalProgress } from "@/features/progress/useLocalProgress";
import { LEVEL_CONFIG, LEVELS } from "@/features/calculo/types";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { state, hydrated } = useLocalProgress();

  const totalGames = hydrated
    ? Object.values(state.stats).reduce((sum, s) => sum + (s?.games ?? 0), 0)
    : 0;
  const totalCorrect = hydrated
    ? Object.values(state.stats).reduce((sum, s) => sum + (s?.correct ?? 0), 0)
    : 0;
  const totalAnswers = hydrated
    ? Object.values(state.stats).reduce((sum, s) => sum + (s?.total ?? 0), 0)
    : 0;
  const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

  return (
    <AppShell>
      <section className="pt-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-neural shadow-glow-primary">
          <Brain className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          <span className="text-gradient-neural">NeuroTrainer</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fortaleça sinapses, integração hemisférica e memória de trabalho.
        </p>
      </section>

      <section className="mt-6 grid grid-cols-3 gap-2">
        <StatBadge label="Partidas" value={hydrated ? totalGames.toString() : "—"} />
        <StatBadge label="Acurácia" value={hydrated ? `${accuracy}%` : "—"} />
        <StatBadge label="Respostas" value={hydrated ? totalAnswers.toString() : "—"} />
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Módulos
        </h2>

        <Link
          to="/calculo"
          className="group block rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/50 hover:shadow-glow-primary"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-neural">
              <Calculator className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold">Cálculo Mental</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Fácil · Médio · Difícil · Einstein — 4 níveis com sequência acelerada.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {LEVELS.map((lv) => {
                  const stat = state.stats[lv];
                  const games = stat?.games ?? 0;
                  return (
                    <span
                      key={lv}
                      className="rounded-full bg-secondary/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {LEVEL_CONFIG[lv].label}: {games}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </Link>

        <Link
          to="/memoria"
          className="group block rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/50 hover:shadow-glow-primary"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-neural">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold">Memorização</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Números e letras · direto, reverso e posição · progressão adaptativa e chunking.
              </p>
            </div>
          </div>
        </Link>
        <Link
          to="/arit"
          className="group block rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/50 hover:shadow-glow-primary"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-neural">
              <Grid3x3 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold">Buffer Contínuo</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Running memory — números aparecem sem parar; lembre os últimos N quando interromper.
              </p>
            </div>
          </div>
        </Link>
        <Link
          to="/regra"
          className="group block rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/50 hover:shadow-glow-primary"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-neural">
              <Target className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold">Regra Ativa</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Mantenha uma regra na cabeça e aplique-a a cada número que aparecer.
              </p>
            </div>
          </div>
        </Link>
        <Link
          to="/grid"
          className="group block rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/50 hover:shadow-glow-primary"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-neural">
              <LayoutGrid className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold">Grid de Pontos</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Pontos acendem em um grid — reproduza-os na ordem certa ou em qualquer ordem.
              </p>
            </div>
          </div>
        </Link>
        <Link
          to="/stroop"
          className="group block rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/50 hover:shadow-glow-primary"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-neural">
              <Palette className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold">Teste Stroop</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Responda a cor da fonte, ignorando a palavra — controle inibitório e atenção seletiva.
              </p>
            </div>
          </div>
        </Link>
        <Link
          to="/cruzada"
          className="group block rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/50 hover:shadow-glow-primary"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-neural">
              <Hash className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold">Cruzadinha Matemática</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Palavra-cruzada de equações — preencha as células em branco para fechar cada linha e coluna.
              </p>
            </div>
          </div>
        </Link>
        <ComingSoonCard
          icon={<Headphones className="h-6 w-6" />}
          title="Escuta Dicótica"
          desc="Áudio distinto em cada ouvido — integração hemisférica."
        />
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        <Link to="/sobre" className="underline underline-offset-4">
          Por que esses treinos funcionam?
        </Link>
      </p>
    </AppShell>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 text-center">
      <div className="font-mono text-xl font-bold text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function ComingSoonCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="block rounded-2xl border border-dashed border-border/70 bg-card/30 p-5 opacity-70">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/60 text-muted-foreground">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
              Em breve
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
    </div>
  );
}
