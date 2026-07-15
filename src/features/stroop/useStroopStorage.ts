import { useCallback, useEffect, useState } from "react";
import { DEFAULT_CONFIG, type StroopConfig, type StroopStats } from "./types";

const KEY = "neurotrainer:stroop";

interface Storage {
  config: StroopConfig;
  stats: StroopStats;
}

const DEFAULT: Storage = {
  config: DEFAULT_CONFIG,
  stats: { sessions: 0, totalAnswers: 0, totalCorrect: 0, bestAccuracy: 0, bestAvgMs: 0 },
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

export function useStroopStorage() {
  const [store, setStore] = useState<Storage>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(load());
    setHydrated(true);
  }, []);

  const setConfig = useCallback((patch: Partial<StroopConfig>) => {
    setStore((prev) => {
      const next: Storage = { ...prev, config: { ...prev.config, ...patch } };
      save(next);
      return next;
    });
  }, []);

  const recordSession = useCallback(
    (answers: number, correct: number, avgMs: number) => {
      setStore((prev) => {
        const accuracy = answers > 0 ? Math.round((correct / answers) * 100) : 0;
        const next: Storage = {
          ...prev,
          stats: {
            sessions: prev.stats.sessions + 1,
            totalAnswers: prev.stats.totalAnswers + answers,
            totalCorrect: prev.stats.totalCorrect + correct,
            bestAccuracy: Math.max(prev.stats.bestAccuracy, accuracy),
            bestAvgMs:
              prev.stats.bestAvgMs === 0
                ? avgMs
                : avgMs > 0
                  ? Math.min(prev.stats.bestAvgMs, avgMs)
                  : prev.stats.bestAvgMs,
          },
        };
        save(next);
        return next;
      });
    },
    [],
  );

  return { hydrated, config: store.config, stats: store.stats, setConfig, recordSession };
}
