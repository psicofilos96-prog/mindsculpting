import { useCallback, useEffect, useState } from "react";
import {
  ACHIEVEMENTS,
  DEFAULT_CONFIG,
  DEFAULT_STATS,
  type GameMode,
  type GameResult,
  type SequenceConfig,
  type SequenceStats,
} from "./types";

const KEY = "neurotrainer:sequencia";

interface Storage {
  config: SequenceConfig;
  stats: SequenceStats;
  lastDailyDate: string | null;
  dailyBest: number;
}

const DEFAULT: Storage = {
  config: DEFAULT_CONFIG,
  stats: DEFAULT_STATS,
  lastDailyDate: null,
  dailyBest: 0,
};

function load(): Storage {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw) as Partial<Storage>;
    return {
      config: { ...DEFAULT.config, ...(p.config ?? {}) },
      stats: {
        ...DEFAULT.stats,
        ...(p.stats ?? {}),
        bestByMode: { ...DEFAULT.stats.bestByMode, ...(p.stats?.bestByMode ?? {}) },
        achievements: p.stats?.achievements ?? [],
      },
      lastDailyDate: p.lastDailyDate ?? null,
      dailyBest: p.dailyBest ?? 0,
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

export function useSequenceStorage() {
  const [store, setStore] = useState<Storage>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(load());
    setHydrated(true);
  }, []);

  const setConfig = useCallback((patch: Partial<SequenceConfig>) => {
    setStore((prev) => {
      const next: Storage = { ...prev, config: { ...prev.config, ...patch } };
      save(next);
      return next;
    });
  }, []);

  const recordGame = useCallback((result: GameResult) => {
    setStore((prev) => {
      const prevStats = prev.stats;
      const prevModeBest = prevStats.bestByMode[result.mode] ?? 0;

      // Check for new achievements
      const newAchievements = [...prevStats.achievements];
      for (const ach of ACHIEVEMENTS) {
        if (result.sequenceLength >= ach.threshold && !newAchievements.includes(ach.id)) {
          newAchievements.push(ach.id);
        }
      }

      const nextStats: SequenceStats = {
        games: prevStats.games + 1,
        bestSequence: Math.max(prevStats.bestSequence, result.sequenceLength),
        totalScore: prevStats.totalScore + result.score,
        bestScore: Math.max(prevStats.bestScore, result.score),
        bestByMode: {
          ...prevStats.bestByMode,
          [result.mode]: Math.max(prevModeBest, result.sequenceLength),
        },
        achievements: newAchievements,
      };

      const next: Storage = { ...prev, stats: nextStats };
      save(next);
      return next;
    });
  }, []);

  const recordDaily = useCallback((sequenceLength: number, dateStr: string) => {
    setStore((prev) => {
      if (prev.lastDailyDate === dateStr) return prev; // already played today
      const next: Storage = {
        ...prev,
        lastDailyDate: dateStr,
        dailyBest: Math.max(prev.dailyBest, sequenceLength),
      };
      save(next);
      return next;
    });
  }, []);

  return {
    hydrated,
    config: store.config,
    stats: store.stats,
    lastDailyDate: store.lastDailyDate,
    dailyBest: store.dailyBest,
    setConfig,
    recordGame,
    recordDaily,
  };
}
