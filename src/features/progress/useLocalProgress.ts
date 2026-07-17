import { useCallback, useEffect, useState } from "react";
import {
  loadState,
  saveState,
  recordRound,
  recordMemoriaRound,
  recordRecallRound,
  recordSlideRound,
  type ProgressState,
  type SlideRoundResult,
} from "./storage";
import type { RoundResult } from "../calculo/types";
import type { MemoriaPrefs, MemoriaRoundResult } from "../memoria/types";
import type { RecallPrefs, RecallRoundResult } from "../recall/types";
import { DEFAULT_RECALL_PREFS } from "../recall/types";
import type { SlidePrefs } from "../slide/types";
import { DEFAULT_SLIDE_PREFS, DEFAULT_SLIDE_STATS } from "../slide/types";

const DEFAULT: ProgressState = {
  prefs: {
    level: "iniciante",
    answerMode: "input",
    gameMode: "practice",
    timePerQuestion: 0,
    flashDuration: 0,
    timedDuration: 60,
    precisionCount: 20,
    vibrate: true,
  },
  stats: {},
  history: [],
  memoriaPrefs: {
    mode: "forward",
    alphabet: "digits",
    input: "keypad",
    chunking: false,
    display: "sequential",
    lengthMode: "adaptive",
    fixedLength: 5,
    totalTimeMs: 4000,
  },
  memoriaStats: {},
  memoriaHistory: [],
  recallPrefs: { ...DEFAULT_RECALL_PREFS },
  recallStats: {},
  recallHistory: [],
  slidePrefs: { ...DEFAULT_SLIDE_PREFS },
  slideStats: { ...DEFAULT_SLIDE_STATS },
};

export function useLocalProgress() {
  const [state, setState] = useState<ProgressState>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  const update = useCallback((next: ProgressState) => {
    setState(next);
    saveState(next);
  }, []);

  const setPrefs = useCallback(
    (patch: Partial<ProgressState["prefs"]>) => {
      setState((prev) => {
        const next = { ...prev, prefs: { ...prev.prefs, ...patch } };
        saveState(next);
        return next;
      });
    },
    [],
  );

  const setMemoriaPrefs = useCallback(
    (patch: Partial<MemoriaPrefs>) => {
      setState((prev) => {
        const next = { ...prev, memoriaPrefs: { ...prev.memoriaPrefs, ...patch } };
        saveState(next);
        return next;
      });
    },
    [],
  );

  const setRecallPrefs = useCallback(
    (patch: Partial<RecallPrefs>) => {
      setState((prev) => {
        const next = { ...prev, recallPrefs: { ...prev.recallPrefs, ...patch } };
        saveState(next);
        return next;
      });
    },
    [],
  );

  const setSlidePrefs = useCallback(
    (patch: Partial<SlidePrefs>) => {
      setState((prev) => {
        const next = { ...prev, slidePrefs: { ...prev.slidePrefs, ...patch } };
        saveState(next);
        return next;
      });
    },
    [],
  );

  const addRound = useCallback((result: RoundResult) => {
    setState((prev) => {
      const next = recordRound(prev, result);
      saveState(next);
      return next;
    });
  }, []);

  const addMemoriaRound = useCallback((result: MemoriaRoundResult) => {
    setState((prev) => {
      const next = recordMemoriaRound(prev, result);
      saveState(next);
      return next;
    });
  }, []);

  const addRecallRound = useCallback((result: RecallRoundResult) => {
    setState((prev) => {
      const next = recordRecallRound(prev, result);
      saveState(next);
      return next;
    });
  }, []);

  const addSlideRound = useCallback((result: SlideRoundResult) => {
    setState((prev) => {
      const next = recordSlideRound(prev, result);
      saveState(next);
      return next;
    });
  }, []);

  return {
    state, hydrated, update,
    setPrefs, addRound,
    setMemoriaPrefs, addMemoriaRound,
    setRecallPrefs, addRecallRound,
    setSlidePrefs, addSlideRound,
  };
}
