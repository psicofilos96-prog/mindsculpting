import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Grid3x2 as Grid3X3, Image, Hash, LayoutGrid, ChevronRight, Trophy, Clock, Move } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  GRID_SIZES,
  GRID_SIZE_LABEL,
  GRID_SIZE_DIFFICULTY,
  PRESET_IMAGES,
  type GridSize,
  type ContentMode,
} from "@/features/slide/types";
import { useLocalProgress } from "@/features/progress/useLocalProgress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/slide/")({
  component: SlideIndex,
});

const SIZE_COLORS: Record<GridSize, string> = {
  3: "from-emerald-400/25 to-teal-400/10 border-emerald-400/40",
  4: "from-sky-400/25 to-cyan-400/10 border-sky-400/40",
  5: "from-amber-400/25 to-orange-400/10 border-amber-400/40",
  6: "from-rose-400/25 to-red-400/10 border-rose-400/40",
};

function SlideIndex() {
  const navigate = useNavigate();
  const { state, setSlidePrefs, hydrated } = useLocalProgress();
  const prefs = state.slidePrefs;
  const stats = state.slideStats;

  const startGame = () => {
    navigate({
      to: "/slide/jogar",
      search: {
        gridSize: prefs.gridSize,
        contentMode: prefs.contentMode,
        selectedImage: prefs.selectedImage,
        showReference: prefs.showReference,
        showNumbers: prefs.showNumbers,
      },
    });
  };

  return (
    <AppShell title="Slide Puzzle" back="/">
      <p className="text-sm text-muted-foreground">
        Deslize as peças para reconstituir a ordem correta. Quanto menos movimentos e mais rápido,
        maior a pontuação.
      </p>

      {/* Stats strip */}
      {hydrated && stats.games > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <StatBadge icon={<Trophy className="h-3.5 w-3.5" />} label="Resolvidos" value={String(stats.totalSolved)} />
          <StatBadge icon={<Move className="h-3.5 w-3.5" />} label="Total movs" value={String(stats.totalMoves)} />
          <StatBadge
            icon={<Clock className="h-3.5 w-3.5" />}
            label={`Recorde ${GRID_SIZE_LABEL[prefs.gridSize]}`}
            value={
              stats.bestTimes[prefs.gridSize]
                ? formatTime(stats.bestTimes[prefs.gridSize]!)
                : "—"
            }
          />
        </div>
      )}

      {/* Grid size */}
      <section className="mt-5">
        <h2 className="mb-2 px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Tamanho da grade
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {GRID_SIZES.map((size) => {
            const active = prefs.gridSize === size;
            const bestTime = hydrated ? stats.bestTimes[size] : undefined;
            const bestMoves = hydrated ? stats.bestMoves[size] : undefined;
            return (
              <button
                key={size}
                onClick={() => setSlidePrefs({ gridSize: size })}
                className={cn(
                  "relative rounded-2xl border bg-gradient-to-br p-3.5 text-left transition-all active:scale-[0.97]",
                  SIZE_COLORS[size],
                  active && "ring-2 ring-primary/60 shadow-glow-primary",
                )}
              >
                <div className="flex items-center gap-2">
                  <LayoutGrid className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                  <span className="font-display text-base font-bold">{GRID_SIZE_LABEL[size]}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{GRID_SIZE_DIFFICULTY[size]}</div>
                <div className="mt-1.5 text-[10px] font-mono text-muted-foreground/70">
                  {size * size - 1} peças
                  {bestTime !== undefined && ` · ${formatTime(bestTime)}`}
                  {bestMoves !== undefined && ` · ${bestMoves} mov`}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Content mode */}
      <section className="mt-4">
        <h2 className="mb-2 px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Modo
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <ModeButton
            active={prefs.contentMode === "numbers"}
            onClick={() => setSlidePrefs({ contentMode: "numbers" })}
            icon={<Hash className="h-5 w-5" />}
            label="Números"
            desc="1 a N²−1"
          />
          <ModeButton
            active={prefs.contentMode === "image"}
            onClick={() => setSlidePrefs({ contentMode: "image" })}
            icon={<Image className="h-5 w-5" />}
            label="Imagem"
            desc="Foto em peças"
          />
        </div>
      </section>

      {/* Image picker */}
      {prefs.contentMode === "image" && (
        <section className="mt-4">
          <h2 className="mb-2 px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Imagem
          </h2>

          {/* Preset images */}
          <div className="grid grid-cols-3 gap-2">
            {PRESET_IMAGES.map((img) => (
              <button
                key={img.key}
                onClick={() => setSlidePrefs({ selectedImage: img.key })}
                className={cn(
                  "relative overflow-hidden rounded-xl border-2 transition-all active:scale-95",
                  prefs.selectedImage === img.key
                    ? "border-primary shadow-glow-primary"
                    : "border-transparent",
                )}
              >
                <img
                  src={img.url}
                  alt={img.label}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-black/50 py-0.5 text-center text-[10px] font-medium text-white">
                  {img.label}
                </div>
              </button>
            ))}

            {/* Upload option */}
            <label
              className={cn(
                "relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition-all active:scale-95",
                prefs.selectedImage === "custom"
                  ? "border-primary bg-primary/10 shadow-glow-primary"
                  : "border-border bg-card/60 hover:border-primary/40",
              )}
            >
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = URL.createObjectURL(file);
                  // Store the object URL temporarily in selectedImage as "custom:<url>"
                  setSlidePrefs({ selectedImage: `custom:${url}` });
                }}
              />
              <Image className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight px-1">
                Sua foto
              </span>
            </label>
          </div>

          {/* Image options */}
          <div className="mt-3 space-y-2 rounded-xl border border-border bg-card/60 p-3">
            <Toggle
              label="Mostrar imagem de referência"
              desc="Miniatura no topo como guia"
              checked={prefs.showReference}
              onToggle={() => setSlidePrefs({ showReference: !prefs.showReference })}
            />
            <Toggle
              label="Numeração nas peças"
              desc="Ajuda iniciantes a se orientar"
              checked={prefs.showNumbers}
              onToggle={() => setSlidePrefs({ showNumbers: !prefs.showNumbers })}
            />
          </div>
        </section>
      )}

      {/* Start button */}
      <button
        onClick={startGame}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-4 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-[0.98]"
      >
        <Grid3X3 className="h-5 w-5" />
        Começar {GRID_SIZE_LABEL[prefs.gridSize]}
        <ChevronRight className="h-4 w-4" />
      </button>
    </AppShell>
  );
}

function ModeButton({
  active, onClick, icon, label, desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border p-3.5 transition-all active:scale-[0.97]",
        active
          ? "border-primary/50 bg-primary/10 shadow-glow-primary"
          : "border-border bg-card/60 hover:border-primary/30",
      )}
    >
      <div className={cn("rounded-lg p-2", active ? "bg-gradient-neural" : "bg-secondary/60")}>
        <span className={active ? "text-primary-foreground" : "text-muted-foreground"}>{icon}</span>
      </div>
      <div className="text-sm font-semibold text-foreground">{label}</div>
      <div className="text-[11px] text-muted-foreground">{desc}</div>
    </button>
  );
}

function StatBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2.5 py-1.5">
      <span className="text-primary">{icon}</span>
      <div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="font-mono text-xs font-bold text-foreground">{value}</div>
      </div>
    </div>
  );
}

function Toggle({
  label, desc, checked, onToggle,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button onClick={onToggle} className="flex w-full items-center justify-between gap-3">
      <div className="text-left">
        <div className="text-sm text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
      <span className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-secondary/60",
      )}>
        <span className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )} />
      </span>
    </button>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}m${s.toString().padStart(2, "0")}s` : `${s}s`;
}
