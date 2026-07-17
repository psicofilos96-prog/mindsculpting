import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_CRIPTO_PREFS,
  DEFAULT_CRIPTO_STATS,
  type CriptoPrefs,
  type CriptoStats,
  type CipherMode,
} from "./types";

const KEY = "neurotrainer:cripto";

interface Storage { prefs: CriptoPrefs; stats: CriptoStats; }

const DEFAULT: Storage = {
  prefs: { ...DEFAULT_CRIPTO_PREFS },
  stats: { ...DEFAULT_CRIPTO_STATS, byMode: { ...DEFAULT_CRIPTO_STATS.byMode } },
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
        byMode: { ...DEFAULT.stats.byMode, ...((p.stats as Partial<CriptoStats>)?.byMode ?? {}) },
      },
    };
  } catch { return DEFAULT; }
}

function save(s: Storage): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
}

export interface SolveRecord {
  mode: CipherMode;
  difficulty: string;
  timeMs: number;
  hintsUsed: number;
  errors: number;
  solved: boolean;
}

export function useCriptoStorage() {
  const [store, setStore] = useState<Storage>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setStore(load()); setHydrated(true); }, []);

  const setPrefs = useCallback((patch: Partial<CriptoPrefs>) => {
    setStore((prev) => { const next = { ...prev, prefs: { ...prev.prefs, ...patch } }; save(next); return next; });
  }, []);

  const recordSolve = useCallback((rec: SolveRecord) => {
    setStore((prev) => {
      const s = prev.stats;
      const newStreak = rec.solved ? s.currentStreak + 1 : 0;
      const modeStats = s.byMode[rec.mode as CipherMode]!;
      const next: Storage = {
        prefs: prev.prefs,
        stats: {
          ...s,
          solved: s.solved + (rec.solved ? 1 : 0),
          totalAttempts: s.totalAttempts + 1,
          totalErrors: s.totalErrors + rec.errors,
          hintsUsed: s.hintsUsed + rec.hintsUsed,
          bestTimeMs: rec.solved ? (s.bestTimeMs === 0 ? rec.timeMs : Math.min(s.bestTimeMs, rec.timeMs)) : s.bestTimeMs,
          totalTimeMs: s.totalTimeMs + rec.timeMs,
          bestStreak: Math.max(s.bestStreak, newStreak),
          currentStreak: newStreak,
          byMode: {
            ...s.byMode,
            [rec.mode as CipherMode]: {
              solved: modeStats.solved + (rec.solved ? 1 : 0),
              attempts: modeStats.attempts + 1,
              bestTimeMs: rec.solved ? (modeStats.bestTimeMs === 0 ? rec.timeMs : Math.min(modeStats.bestTimeMs, rec.timeMs)) : modeStats.bestTimeMs,
            },
          },
        },
      };
      save(next);
      return next;
    });
  }, []);

  return { hydrated, prefs: store.prefs, stats: store.stats, setPrefs, recordSolve };
}
