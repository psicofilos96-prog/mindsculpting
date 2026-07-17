import { useCallback, useEffect, useState } from "react";
import { DEFAULT_CONFIG, type MundoIConfig, type MundoIStats } from "./types";

const KEY = "neurotrainer:morse-mundo1";

interface Storage {
  config: MundoIConfig;
  stats: MundoIStats;
}

const DEFAULT: Storage = {
  config: DEFAULT_CONFIG,
  stats: { sessions: 0, totalRounds: 0, totalCorrect: 0, bestStreak: 0, bestSequenceLength: 1 },
};

function load(): Storage {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<Storage>;
    return {
      config: { ...DEFAULT.config, ...(parsed.config ?? {}) },
      stats: { ...DEFAULT.stats, ...(parsed.stats ?? {}) },
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

export function useMorseStorage() {
  const [store, setStore] = useState<Storage>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(load());
    setHydrated(true);
  }, []);

  const setConfig = useCallback((patch: Partial<MundoIConfig>) => {
    setStore((prev) => {
      const next: Storage = { ...prev, config: { ...prev.config, ...patch } };
      save(next);
      return next;
    });
  }, []);

  const recordSession = useCallback(
    (rounds: number, correct: number, bestStreak: number, bestSequenceLength: number) => {
      setStore((prev) => {
        const next: Storage = {
          ...prev,
          stats: {
            sessions: prev.stats.sessions + 1,
            totalRounds: prev.stats.totalRounds + rounds,
            totalCorrect: prev.stats.totalCorrect + correct,
            bestStreak: Math.max(prev.stats.bestStreak, bestStreak),
            bestSequenceLength: Math.max(prev.stats.bestSequenceLength, bestSequenceLength),
          },
        };
        save(next);
        return next;
      });
    },
    [],
  );

  return {
    hydrated,
    config: store.config,
    stats: store.stats,
    setConfig,
    recordSession,
  };
}
