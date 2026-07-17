import { useCallback, useEffect, useState } from "react";
import {
  MatrizPrefsSchema,
  MatrizStatsSchema,
  DEFAULT_MATRIZ_PREFS,
  DEFAULT_MATRIZ_STATS,
  type MatrizPrefs,
  type MatrizStats,
} from "./types";

const KEY = "neurotrainer:matriz";

interface Storage {
  prefs: MatrizPrefs;
  stats: MatrizStats;
}

const DEFAULT: Storage = {
  prefs: { ...DEFAULT_MATRIZ_PREFS },
  stats: { ...DEFAULT_MATRIZ_STATS },
};

function load(): Storage {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw) as Partial<Storage>;
    const prefs = MatrizPrefsSchema.parse(p.prefs ?? {});
    const stats = MatrizStatsSchema.parse(p.stats ?? {});
    return { prefs, stats };
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

export interface SolveRecord {
  difficulty: string;
  timeMs: number;
  errors: number;
  hintsUsed: number;
  solved: boolean;
}

export function useMatrizStorage() {
  const [store, setStore] = useState<Storage>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(load());
    setHydrated(true);
  }, []);

  const setPrefs = useCallback((patch: Partial<MatrizPrefs>) => {
    setStore((prev) => {
      const next = { ...prev, prefs: { ...prev.prefs, ...patch } };
      save(next);
      return next;
    });
  }, []);

  const recordSolve = useCallback((rec: SolveRecord) => {
    setStore((prev) => {
      const s = prev.stats;
      const newStreak = rec.solved ? s.currentStreak + 1 : 0;
      const next: Storage = {
        prefs: prev.prefs,
        stats: {
          solved: s.solved + (rec.solved ? 1 : 0),
          bestTimeMs: rec.solved
            ? s.bestTimeMs === 0 ? rec.timeMs : Math.min(s.bestTimeMs, rec.timeMs)
            : s.bestTimeMs,
          totalTimeMs: s.totalTimeMs + rec.timeMs,
          attempts: s.attempts + 1,
          errors: s.errors + rec.errors,
          hintsUsed: s.hintsUsed + rec.hintsUsed,
          bestStreak: Math.max(s.bestStreak, newStreak),
          currentStreak: newStreak,
          maxLevelCampaign: s.maxLevelCampaign,
        },
      };
      save(next);
      return next;
    });
  }, []);

  const setMaxLevel = useCallback((level: number) => {
    setStore((prev) => {
      const next = {
        ...prev,
        stats: { ...prev.stats, maxLevelCampaign: Math.max(prev.stats.maxLevelCampaign, level) },
      };
      save(next);
      return next;
    });
  }, []);

  return {
    hydrated,
    prefs: store.prefs,
    stats: store.stats,
    setPrefs,
    recordSolve,
    setMaxLevel,
  };
}
