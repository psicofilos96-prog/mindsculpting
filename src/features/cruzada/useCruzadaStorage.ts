import { useCallback, useEffect, useState } from "react";

const KEY = "neurotrainer:cruzada";

export interface CruzadaStats {
  solved: number;
  hintsUsed: number;
  bestTimes: Record<string, number>; // puzzleId -> ms
}

interface Storage {
  stats: CruzadaStats;
}

const DEFAULT: Storage = { stats: { solved: 0, hintsUsed: 0, bestTimes: {} } };

function load(): Storage {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw) as Partial<Storage>;
    return {
      stats: {
        ...DEFAULT.stats,
        ...(p.stats ?? {}),
        bestTimes: { ...DEFAULT.stats.bestTimes, ...(p.stats?.bestTimes ?? {}) },
      },
    };
  } catch {
    return DEFAULT;
  }
}

function save(s: Storage): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

export function useCruzadaStorage() {
  const [store, setStore] = useState<Storage>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(load());
    setHydrated(true);
  }, []);

  const recordSolve = useCallback((puzzleId: string, elapsedMs: number, hintsUsed: number) => {
    setStore((prev) => {
      const prevBest = prev.stats.bestTimes[puzzleId] ?? 0;
      const nextBest =
        prevBest === 0 ? elapsedMs : Math.min(prevBest, elapsedMs);
      const next: Storage = {
        stats: {
          solved: prev.stats.solved + 1,
          hintsUsed: prev.stats.hintsUsed + hintsUsed,
          bestTimes: { ...prev.stats.bestTimes, [puzzleId]: nextBest },
        },
      };
      save(next);
      return next;
    });
  }, []);

  return { hydrated, stats: store.stats, recordSolve };
}
