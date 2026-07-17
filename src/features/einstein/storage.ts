import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_EINSTEIN_PREFS,
  DEFAULT_EINSTEIN_STATS,
  type EinsteinPrefs,
  type EinsteinStats,
} from "./types";

const KEY = "neurotrainer:einstein";

interface Storage {
  prefs: EinsteinPrefs;
  stats: EinsteinStats;
}

const DEFAULT: Storage = {
  prefs: { ...DEFAULT_EINSTEIN_PREFS },
  stats: { ...DEFAULT_EINSTEIN_STATS },
};

function load(): Storage {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw) as Partial<Storage>;
    return {
      prefs: { ...DEFAULT.prefs, ...(p.prefs ?? {}) },
      stats: { ...DEFAULT.stats, ...(p.stats ?? {}) },
    };
  } catch {
    return DEFAULT;
  }
}

function save(s: Storage): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch { /* noop */ }
}

export interface SolveRecord {
  timeMs: number;
  hintsUsed: number;
  solved: boolean;
  themeId: string;
}

export function useEinsteinStorage() {
  const [store, setStore] = useState<Storage>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(load());
    setHydrated(true);
  }, []);

  const setPrefs = useCallback((patch: Partial<EinsteinPrefs>) => {
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
          ...s,
          solved: s.solved + (rec.solved ? 1 : 0),
          failed: s.failed + (rec.solved ? 0 : 1),
          totalAttempts: s.totalAttempts + 1,
          bestTimeMs: rec.solved
            ? s.bestTimeMs === 0 ? rec.timeMs : Math.min(s.bestTimeMs, rec.timeMs)
            : s.bestTimeMs,
          totalTimeMs: s.totalTimeMs + rec.timeMs,
          bestStreak: Math.max(s.bestStreak, newStreak),
          currentStreak: newStreak,
          hintsUsed: s.hintsUsed + rec.hintsUsed,
          campaignLevel: s.campaignLevel,
        },
      };
      save(next);
      return next;
    });
  }, []);

  const setCampaignLevel = useCallback((level: number) => {
    setStore((prev) => {
      const next = {
        ...prev,
        stats: { ...prev.stats, campaignLevel: Math.max(prev.stats.campaignLevel, level) },
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
    setCampaignLevel,
  };
}
