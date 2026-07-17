import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_COFRES_PREFS,
  DEFAULT_COFRES_STATS,
  type CofresPrefs,
  type CofresStats,
  type Difficulty,
} from "./types";

const KEY = "neurotrainer:cofres";

interface Storage { prefs: CofresPrefs; stats: CofresStats; }

const DEFAULT: Storage = {
  prefs: { ...DEFAULT_COFRES_PREFS },
  stats: { ...DEFAULT_COFRES_STATS, byDifficulty: { ...DEFAULT_COFRES_STATS.byDifficulty } },
};

function load(): Storage {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw) as Partial<Storage>;
    return {
      prefs: { ...DEFAULT.prefs, ...(p.prefs ?? {}) },
      stats: {
        ...DEFAULT.stats,
        ...(p.stats ?? {}),
        byDifficulty: {
          ...DEFAULT.stats.byDifficulty,
          ...((p.stats as Partial<CofresStats>)?.byDifficulty ?? {}),
        },
      },
    };
  } catch { return DEFAULT; }
}

function save(s: Storage): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
}

export interface SolveRecord {
  difficulty: Difficulty;
  timeMs: number;
  guessesUsed: number;
  hintsUsed: number;
  solved: boolean;
}

export function useCofresStorage() {
  const [store, setStore] = useState<Storage>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setStore(load()); setHydrated(true); }, []);

  const setPrefs = useCallback((patch: Partial<CofresPrefs>) => {
    setStore((prev) => { const next = { ...prev, prefs: { ...prev.prefs, ...patch } }; save(next); return next; });
  }, []);

  const recordSolve = useCallback((rec: SolveRecord) => {
    setStore((prev) => {
      const s = prev.stats;
      const diffStats = s.byDifficulty[rec.difficulty]!;
      const newStreak = rec.solved ? s.currentStreak + 1 : 0;
      const next: Storage = {
        prefs: prev.prefs,
        stats: {
          ...s,
          solved: s.solved + (rec.solved ? 1 : 0),
          failed: s.failed + (rec.solved ? 0 : 1),
          totalAttempts: s.totalAttempts + 1,
          totalGuesses: s.totalGuesses + rec.guessesUsed,
          bestTimeMs: rec.solved ? (s.bestTimeMs === 0 ? rec.timeMs : Math.min(s.bestTimeMs, rec.timeMs)) : s.bestTimeMs,
          totalTimeMs: s.totalTimeMs + rec.timeMs,
          bestStreak: Math.max(s.bestStreak, newStreak),
          currentStreak: newStreak,
          byDifficulty: {
            ...s.byDifficulty,
            [rec.difficulty]: { solved: diffStats.solved + (rec.solved ? 1 : 0), attempts: diffStats.attempts + 1 },
          },
        },
      };
      save(next);
      return next;
    });
  }, []);

  return { hydrated, prefs: store.prefs, stats: store.stats, setPrefs, recordSolve };
}
