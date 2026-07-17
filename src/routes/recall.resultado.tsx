import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { RotateCw, Hop as Home, TrendingUp, TriangleAlert as AlertTriangle, Repeat, Brain } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  DIFFICULTY_LABEL,
  GAME_MODE_LABEL,
  LIST_TYPE_LABEL,
  type Difficulty,
  type GameMode,
  type ListType,
} from "@/features/recall/types";

const searchSchema = z.object({
  difficulty: z.enum(["facil", "medio", "dificil", "especialista"]),
  gameMode: z.enum(["classico", "rodadas", "tardia", "ordem", "reconhecimento", "distrator"]),
  listType: z.enum(["aleatoria", "categorias-ocultas"]),
  correct: z.number(),
  total: z.number(),
  intrusions: z.number(),
  perseverations: z.number(),
  orderCorrect: z.number().default(0),
  orderTotal: z.number().default(0),
  recognitionHits: z.number().default(0),
  recognitionTotal: z.number().default(0),
  hiddenCategoryRecall: z.number().default(0),
  scatteredRecall: z.number().default(0),
  hiddenCategory: z.string().default(""),
  score: z.number(),
  learningCurve: z.string().default(""),
});

export const Route = createFileRoute("/recall/resultado")({
  validateSearch: (s) => searchSchema.parse(s),
  component: ResultadoRecall,
});

function ResultadoRecall() {
  const search = Route.useSearch() as {
    difficulty: Difficulty;
    gameMode: GameMode;
    listType: ListType;
    correct: number;
    total: number;
    intrusions: number;
    perseverations: number;
    orderCorrect: number;
    orderTotal: number;
    recognitionHits: number;
    recognitionTotal: number;
    hiddenCategoryRecall: number;
    scatteredRecall: number;
    hiddenCategory: string;
    score: number;
    learningCurve: string;
  };
  const navigate = useNavigate();

  const { correct, total, intrusions, perseverations, score } = search;
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;
  const rating =
    acc === 100 ? "Perfeito" : acc >= 80 ? "Excelente" : acc >= 60 ? "Bom" : acc >= 40 ? "Continue" : "Treine mais";

  const learningCurve = search.learningCurve
    ? search.learningCurve.split(",").map(Number).filter((n) => !isNaN(n))
    : [];

  const recognitionAcc = search.recognitionTotal > 0
    ? Math.round((search.recognitionHits / search.recognitionTotal) * 100)
    : null;

  const orderAcc = search.orderTotal > 0
    ? Math.round((search.orderCorrect / search.orderTotal) * 100)
    : null;

  return (
    <AppShell title="Resultado" back="/recall">
      <div className="mt-6 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {DIFFICULTY_LABEL[search.difficulty].label} · {GAME_MODE_LABEL[search.gameMode].label}
        </p>
        <div className="mt-2 font-display text-6xl font-bold text-gradient-neural">{acc}%</div>
        <p className="mt-2 font-display text-lg text-foreground">{rating}</p>
        <div className="mt-1 font-mono text-sm text-accent">{score} pontos</div>
      </div>

      {/* Main stats */}
      <div className="mt-8 grid grid-cols-2 gap-2">
        <Stat label="Palavras corretas" value={`${correct}/${total}`} />
        <Stat label="Esquecidas" value={String(total - correct)} />
        <Stat label="Intrusões" value={String(intrusions)} highlight={intrusions > 0} />
        <Stat label="Perseverações" value={String(perseverations)} highlight={perseverations > 0} />
      </div>

      {/* Order mode stats */}
      {orderAcc !== null && (
        <div className="mt-3 rounded-xl border border-border bg-card/60 p-3 text-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Ordem exata</div>
          <div className="mt-1 font-mono text-lg font-bold text-foreground">
            {search.orderCorrect}/{search.orderTotal} ({orderAcc}%)
          </div>
        </div>
      )}

      {/* Recognition stats */}
      {recognitionAcc !== null && (
        <div className="mt-3 rounded-xl border border-accent/30 bg-accent/10 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Brain className="h-4 w-4 text-accent" />
            Reconhecimento vs. Recordação
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-card/40 p-2">
              <div className="font-mono text-lg font-bold text-foreground">{acc}%</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Recordação livre</div>
            </div>
            <div className="rounded-lg bg-card/40 p-2">
              <div className="font-mono text-lg font-bold text-accent">{recognitionAcc}%</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reconhecimento</div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {recognitionAcc > acc
              ? "Reconhecimento foi mais fácil que recordação espontânea — esperado clinicamente."
              : "Recordação e reconhecimento equivalentes — boa retenção."}
          </p>
        </div>
      )}

      {/* Hidden category analysis */}
      {search.hiddenCategory && (
        <div className="mt-3 rounded-xl border border-border bg-card/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Brain className="h-4 w-4 text-accent" />
            Análise semântica (categorias ocultas)
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Categoria concentrada: <span className="font-medium text-foreground">{search.hiddenCategory}</span>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-card/40 p-2">
              <div className="font-mono text-lg font-bold text-accent">{search.hiddenCategoryRecall}%</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Categoria concentrada</div>
            </div>
            <div className="rounded-lg bg-card/40 p-2">
              <div className="font-mono text-lg font-bold text-foreground">{search.scatteredRecall}%</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Palavras espalhadas</div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {search.hiddenCategoryRecall > search.scatteredRecall
              ? "Você lembrou mais palavras da categoria concentrada — efeito de organização semântica positivo."
              : "Não houve vantagem clara da categoria concentrada."}
          </p>
        </div>
      )}

      {/* Learning curve */}
      {learningCurve.length > 0 && (
        <div className="mt-3 rounded-xl border border-border bg-card/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <TrendingUp className="h-4 w-4 text-accent" />
            Curva de aprendizagem
          </div>
          <div className="mt-3 flex items-end justify-between gap-2" style={{ height: 80 }}>
            {learningCurve.map((val, i) => {
              const max = Math.max(...learningCurve, 1);
              const h = (val / max) * 100;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="font-mono text-[10px] text-muted-foreground">{val}</span>
                  <div
                    className="w-full rounded-t bg-gradient-neural transition-all"
                    style={{ height: `${h}%`, minHeight: 4 }}
                  />
                  <span className="text-[10px] text-muted-foreground">R{i + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Intrusion/Perseveration warnings */}
      {intrusions > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Intrusões</span> são palavras que você digitou mas não estavam na lista. {intrusions} registrada(s).
          </p>
        </div>
      )}
      {perseverations > 0 && (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <Repeat className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Perseverações</span> são palavras repetidas. {perseverations} registrada(s).
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 space-y-2">
        <Link
          to="/recall/jogar"
          search={{ difficulty: search.difficulty, gameMode: search.gameMode, listType: search.listType }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-neural py-3.5 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-95"
        >
          <RotateCw className="h-4 w-4" />
          Jogar de novo
        </Link>
        <Link
          to="/recall"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3.5 font-display text-base font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          Configurações
        </Link>
        <button
          onClick={() => navigate({ to: "/" })}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <Home className="h-4 w-4" />
          Início
        </button>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 text-center ${highlight ? "border-amber-500/40 bg-amber-500/10" : "border-border bg-card/60"}`}>
      <div className="font-mono text-lg font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
