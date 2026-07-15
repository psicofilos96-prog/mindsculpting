import { useCallback, useEffect, useState } from "react";
import { DEFAULT_CONFIG, type GridConfig, type GridStats } from "./types";

const KEY = "neurotrainer:grid";

interface Storage { config: GridConfig; stats: GridStats; }

const DEFAULT: Storage = {
  config: DEFAULT_CONFIG,
  stats: { sessions: 0, totalRounds: 0, totalPerfect: 0, bestStreak: 0 },
};

function load(): Storage {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw) as Partial<Storage>;
    return {
      config: { ...DEFAULT.config, ...(p.config ?? {}) },
      stats: { ...DEFAULT.stats, ...(p.stats ?? {}) },
    };
  } catch { return DEFAULT; }
}

function save(s: Storage): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
}

export function useGridStorage() {
  const [store, setStore] = useState<Storage>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setStore(load()); setHydrated(true); }, []);

  const setConfig = useCallback((patch: Partial<GridConfig>) => {
    setStore((prev) => {
      const next: Storage = { ...prev, config: { ...prev.config, ...patch } };
      save(next); return next;
    });
  }, []);

  const recordSession = useCallback((rounds: number, perfect: number, bestStreak: number) => {
    setStore((prev) => {
      const next: Storage = {
        ...prev,
        stats: {
          sessions: prev.stats.sessions + 1,
          totalRounds: prev.stats.totalRounds + rounds,
          totalPerfect: prev.stats.totalPerfect + perfect,
          bestStreak: Math.max(prev.stats.bestStreak, bestStreak),
        },
      };
      save(next); return next;
    });
  }, []);

  return { hydrated, config: store.config, stats: store.stats, setConfig, recordSession };
}
