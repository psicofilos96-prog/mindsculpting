import { useCallback, useEffect, useState } from "react";
import {
  loadState,
  saveState,
  recordRound,
  recordMemoriaRound,
  type ProgressState,
} from "./storage";
import type { RoundResult } from "../calculo/types";
import type { MemoriaPrefs, MemoriaRoundResult } from "../memoria/types";

const DEFAULT: ProgressState = {
  prefs: { level: "facil", inputMode: false, vibrate: true },
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

  return { state, hydrated, update, setPrefs, addRound, setMemoriaPrefs, addMemoriaRound };
}
