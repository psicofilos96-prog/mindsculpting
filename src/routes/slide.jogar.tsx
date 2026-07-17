import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCw, Lightbulb, Clock, Move, X } from "lucide-react";
import {
  PRESET_IMAGES,
  scoreGame,
  type GameState,
  type GridSize,
} from "@/features/slide/types";
import { createGame, moveTile, canMove, tileBgPosition, isSolved } from "@/features/slide/engine";
import { useLocalProgress } from "@/features/progress/useLocalProgress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/slide/jogar")({
  validateSearch: z.object({
    gridSize: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).default(4),
    contentMode: z.enum(["numbers", "image"]).default("numbers"),
    selectedImage: z.string().default("mountain"),
    showReference: z.boolean().default(true),
    showNumbers: z.boolean().default(false),
  }),
  component: SlideGame,
});

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function resolveImageUrl(selectedImage: string): string {
  if (selectedImage.startsWith("custom:")) return selectedImage.slice(7);
  return PRESET_IMAGES.find((p) => p.key === selectedImage)?.url ?? PRESET_IMAGES[0]!.url;
}

function SlideGame() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { addSlideRound } = useLocalProgress();
  const { gridSize, contentMode, selectedImage, showReference, showNumbers } = search;

  const [game, setGame] = useState<GameState>(() => createGame(gridSize as GridSize));
  const [elapsed, setElapsed] = useState(0);
  const [hintIndex, setHintIndex] = useState<number | null>(null);
  const [showWin, setShowWin] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const winRef = useRef(false);

  const imageUrl = contentMode === "image" ? resolveImageUrl(selectedImage) : null;

  // Timer
  useEffect(() => {
    if (game.solved || showWin) return;
    timerRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game.solved, showWin]);

  // Detect win
  useEffect(() => {
    if (game.solved && !winRef.current) {
      winRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      const score = scoreGame(game.moves, elapsed, gridSize as GridSize);
      addSlideRound({ gridSize: gridSize as GridSize, moves: game.moves, elapsedSec: elapsed, score });
      // Short delay for last-tile animation before showing win overlay
      setTimeout(() => setShowWin(true), 500);
    }
  }, [game.solved]);

  const handleTileClick = useCallback(
    (idx: number) => {
      if (game.solved) return;
      setHintIndex(null);
      setGame((prev) => moveTile(prev, idx));
    },
    [game.solved],
  );

  const restart = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    winRef.current = false;
    setElapsed(0);
    setShowWin(false);
    setHintIndex(null);
    setGame(createGame(gridSize as GridSize));
  }, [gridSize]);

  // Hint: highlight the correct tile to move (simple heuristic — first unsolved tile's source)
  const showHint = useCallback(() => {
    const { tiles } = game;
    const n = gridSize;
    // Find first tile that's out of place and can move
    for (let i = 0; i < tiles.length; i++) {
      const val = tiles[i];
      if (val !== 0 && val !== i + 1 && canMove(game, i)) {
        setHintIndex(i);
        setTimeout(() => setHintIndex(null), 1500);
        return;
      }
    }
    // Fallback: any movable tile
    for (let i = 0; i < tiles.length; i++) {
      if (canMove(game, i)) {
        setHintIndex(i);
        setTimeout(() => setHintIndex(null), 1500);
        return;
      }
    }
  }, [game, gridSize]);

  // Compute grid layout
  const n = gridSize;
  const containerRef = useRef<HTMLDivElement>(null);
  const maxGridPx = Math.min(360, typeof window !== "undefined" ? window.innerWidth - 32 : 340);
  const tileSize = Math.floor(maxGridPx / n);
  const gridPx = tileSize * n;

  const score = scoreGame(game.moves, elapsed, gridSize as GridSize);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/slide" })}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono font-bold tabular-nums text-foreground">
              {formatTime(elapsed)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Move className="h-3.5 w-3.5 text-accent" />
            <span className="font-mono font-bold tabular-nums text-foreground">
              {game.moves}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={showHint}
            title="Dica"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground transition-colors hover:text-accent active:scale-95"
          >
            <Lightbulb className="h-4 w-4" />
          </button>
          <button
            onClick={restart}
            title="Embaralhar"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground transition-colors hover:text-primary active:scale-95"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-start gap-4 px-4 py-4">
        {/* Reference thumbnail */}
        {contentMode === "image" && showReference && imageUrl && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-2 pr-4">
            <img
              src={imageUrl}
              alt="Referência"
              className="h-14 w-14 rounded-lg object-cover"
              onLoad={() => setImgLoaded(true)}
            />
            <div className="text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">Referência</div>
              <div>Monte esta imagem</div>
            </div>
          </div>
        )}

        {/* Puzzle grid */}
        <div
          ref={containerRef}
          style={{ width: gridPx, height: gridPx }}
          className="relative select-none"
        >
          {game.tiles.map((tileVal, idx) => {
            if (tileVal === 0) return null; // empty cell — render nothing

            const row = Math.floor(idx / n);
            const col = idx % n;
            const movable = canMove(game, idx);
            const isHint = hintIndex === idx;

            // Is this tile in its correct position?
            const isCorrect = tileVal === idx + 1;

            const bgStyle =
              contentMode === "image" && imageUrl
                ? tileBgPosition(tileVal, n, tileSize)
                : {};

            return (
              <motion.button
                key={tileVal}
                layout
                layoutId={String(tileVal)}
                animate={{ opacity: 1, scale: 1 }}
                initial={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{
                  position: "absolute",
                  left: col * tileSize + 2,
                  top: row * tileSize + 2,
                  width: tileSize - 4,
                  height: tileSize - 4,
                  ...(contentMode === "image" && imageUrl
                    ? {
                        backgroundImage: `url(${imageUrl})`,
                        backgroundPosition: bgStyle.backgroundPosition,
                        backgroundSize: bgStyle.backgroundSize,
                        backgroundRepeat: "no-repeat",
                      }
                    : {}),
                }}
                onClick={() => handleTileClick(idx)}
                className={cn(
                  "flex items-center justify-center rounded-lg border-2 font-display font-bold transition-all",
                  // Movable vs locked
                  movable
                    ? "cursor-pointer active:scale-95"
                    : "cursor-default",
                  // Content mode colors
                  contentMode === "numbers"
                    ? cn(
                        "text-foreground",
                        isCorrect
                          ? "border-success/40 bg-success/10"
                          : movable
                          ? "border-primary/50 bg-card hover:border-primary hover:bg-primary/10"
                          : "border-border bg-card/80",
                      )
                    : cn(
                        "border-border/30",
                        isCorrect && "border-success/50",
                        isHint && "border-accent",
                      ),
                  // Hint highlight
                  isHint && "border-accent shadow-[0_0_16px_oklch(0.68_0.19_300/60%)]",
                )}
              >
                {contentMode === "numbers" ? (
                  <span
                    style={{ fontSize: Math.max(12, tileSize * 0.38) }}
                    className="tabular-nums leading-none"
                  >
                    {tileVal}
                  </span>
                ) : showNumbers ? (
                  <span
                    style={{ fontSize: Math.max(9, tileSize * 0.25) }}
                    className="rounded bg-black/40 px-0.5 tabular-nums text-white"
                  >
                    {tileVal}
                  </span>
                ) : null}
              </motion.button>
            );
          })}
        </div>

        {/* Score preview */}
        <div className="flex gap-4 text-center">
          <div>
            <div className="font-mono text-xs text-muted-foreground">Pontuação</div>
            <div className="font-display text-lg font-bold text-foreground">{score}</div>
          </div>
          <div className="w-px bg-border" />
          <div>
            <div className="font-mono text-xs text-muted-foreground">Grade</div>
            <div className="font-display text-lg font-bold text-foreground">{n}×{n}</div>
          </div>
        </div>
      </main>

      {/* Win overlay */}
      <AnimatePresence>
        {showWin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-[0_8px_48px_oklch(0_0_0/50%)]"
            >
              {/* Completed puzzle thumbnail */}
              {contentMode === "image" && imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Completo"
                  className="mx-auto mb-4 w-32 rounded-xl object-cover"
                />
              ) : (
                <div className="mb-4 text-center text-5xl">🎉</div>
              )}

              <h2 className="text-center font-display text-2xl font-bold text-gradient-neural">
                Parabéns!
              </h2>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                Puzzle {n}×{n} resolvido
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <ResultStat label="Tempo" value={formatTime(elapsed)} />
                <ResultStat label="Movimentos" value={String(game.moves)} />
                <ResultStat label="Pontuação" value={String(score)} highlight />
              </div>

              <div className="mt-5 space-y-2">
                <button
                  onClick={restart}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-3.5 font-display text-base font-bold text-primary-foreground shadow-glow-primary active:scale-[0.98]"
                >
                  <RotateCw className="h-4 w-4" />
                  Jogar novamente
                </button>
                <button
                  onClick={() => navigate({ to: "/slide" })}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3.5 font-display text-base font-semibold text-foreground active:scale-[0.98]"
                >
                  Mudar configurações
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultStat({
  label, value, highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-2.5 text-center",
        highlight ? "border-accent/40 bg-accent/10" : "border-border bg-secondary/30",
      )}
    >
      <div className="font-mono text-base font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
