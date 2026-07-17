import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_CONFIG,
  DEFAULT_STATS,
  type AnswerRecord,
  type DicoticoConfig,
  type DicoticoStats,
} from "./types";

const KEY = "neurotrainer:dicotico";

interface Storage {
  config: DicoticoConfig;
  stats: DicoticoStats;
}

const DEFAULT: Storage = {
  config: DEFAULT_CONFIG,
  stats: DEFAULT_STATS,
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

export function useDicoticoStorage() {
  const [store, setStore] = useState<Storage>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(load());
    setHydrated(true);
  }, []);

  const setConfig = useCallback((patch: Partial<DicoticoConfig>) => {
    setStore((prev) => {
      const next: Storage = { ...prev, config: { ...prev.config, ...patch } };
      save(next);
      return next;
    });
  }, []);

  const recordSession = useCallback((answers: AnswerRecord[]) => {
    setStore((prev) => {
      let totalCorrect = 0;
      let leftCorrect = 0;
      let leftTotal = 0;
      let rightCorrect = 0;
      let rightTotal = 0;
      let selectiveCorrect = 0;
      let selectiveTotal = 0;
      let dividedCorrect = 0;
      let dividedTotal = 0;
      let locateCorrect = 0;
      let locateTotal = 0;

      for (const a of answers) {
        if (a.correct) totalCorrect++;
        if (a.questionType === "selective-left") {
          selectiveTotal++;
          if (a.correct) selectiveCorrect++;
          leftTotal++;
          if (a.correct) leftCorrect++;
        } else if (a.questionType === "selective-right") {
          selectiveTotal++;
          if (a.correct) selectiveCorrect++;
          rightTotal++;
          if (a.correct) rightCorrect++;
        } else if (a.questionType === "divided") {
          dividedTotal++;
          if (a.correct) dividedCorrect++;
          // divided counts toward both ears
          leftTotal++;
          rightTotal++;
          if (a.correct) {
            leftCorrect++;
            rightCorrect++;
          }
        } else if (a.questionType === "locate") {
          locateTotal++;
          if (a.correct) locateCorrect++;
          if (a.correct === "left" && a.correct) leftCorrect++;
          // For locate, we count toward the ear of the correct answer
        }
      }

      const next: Storage = {
        ...prev,
        stats: {
          sessions: prev.stats.sessions + 1,
          totalAnswers: prev.stats.totalAnswers + answers.length,
          totalCorrect: prev.stats.totalCorrect + totalCorrect,
          leftCorrect: prev.stats.leftCorrect + leftCorrect,
          leftTotal: prev.stats.leftTotal + leftTotal,
          rightCorrect: prev.stats.rightCorrect + rightCorrect,
          rightTotal: prev.stats.rightTotal + rightTotal,
          selectiveCorrect: prev.stats.selectiveCorrect + selectiveCorrect,
          selectiveTotal: prev.stats.selectiveTotal + selectiveTotal,
          dividedCorrect: prev.stats.dividedCorrect + dividedCorrect,
          dividedTotal: prev.stats.dividedTotal + dividedTotal,
          locateCorrect: prev.stats.locateCorrect + locateCorrect,
          locateTotal: prev.stats.locateTotal + locateTotal,
        },
      };
      save(next);
      return next;
    });
  }, []);

  return {
    hydrated,
    config: store.config,
    stats: store.stats,
    setConfig,
    recordSession,
  };
}
