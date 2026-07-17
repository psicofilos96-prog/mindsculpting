import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Delete, Check, X, ArrowRight, Brain, Eye } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import {
  analyzeHiddenCategory,
  calcScore,
  generateDistractorProblems,
  generateList,
  memorizeTimeMs,
  validateRecall,
  validateRecognition,
} from "@/features/recall/engine";
import {
  DIFFICULTY_LABEL,
  DISTRACTOR_DURATION_MS,
  GAME_MODE_LABEL,
  LATE_RECALL_DURATION_MS,
  LIST_TYPE_LABEL,
  MAX_ROUNDS,
  WORDS_BY_DIFFICULTY,
  type Difficulty,
  type GameMode,
  type ListType,
  type RecallProblem,
  type RecognitionResult,
  type ValidationResult,
} from "@/features/recall/types";
import { useLocalProgress } from "@/features/progress/useLocalProgress";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  difficulty: z.enum(["facil", "medio", "dificil", "especialista"]).optional(),
  gameMode: z.enum(["classico", "rodadas", "tardia", "ordem", "reconhecimento", "distrator"]).optional(),
  listType: z.enum(["aleatoria", "categorias-ocultas"]).optional(),
});

export const Route = createFileRoute("/recall/jogar")({
  validateSearch: (s) => searchSchema.parse(s),
  component: JogarRecall,
});

type Phase =
  | "countdown"
  | "memorize"
  | "distractor"
  | "late-task"
  | "recall"
  | "recognition"
  | "feedback"
  | "done";

function vibrate(pattern: number | number[], enabled: boolean) {
  if (enabled && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch { /* noop */ }
  }
}

function JogarRecall() {
  const search = Route.useSearch() as {
    difficulty?: Difficulty;
    gameMode?: GameMode;
    listType?: ListType;
  };
  const navigate = useNavigate();
  const { state, setRecallPrefs, addRecallRound } = useLocalProgress();
  const prefs = state.recallPrefs;

  const difficulty: Difficulty = search.difficulty ?? prefs.difficulty;
  const gameMode: GameMode = search.gameMode ?? prefs.gameMode;
  const listType: ListType = search.listType ?? prefs.listType;
  const vibrateOn = prefs.vibrate;

  const wordCount = WORDS_BY_DIFFICULTY[difficulty];
  const orderMode = gameMode === "ordem";
  const isMultiRound = gameMode === "rodadas";
  const isRecognition = gameMode === "reconhecimento";
  const isDistractor = gameMode === "distrator";
  const isLateRecall = gameMode === "tardia";

  const [problem, setProblem] = useState<RecallProblem>(() => generateList(difficulty, listType));
  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [memorizeLeft, setMemorizeLeft] = useState(0);
  const [typedWords, setTypedWords] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [round, setRound] = useState(1);
  const [learningCurve, setLearningCurve] = useState<number[]>([]);
  const [distractorProblems] = useState(() => generateDistractorProblems(20));
  const [distractorIdx, setDistractorIdx] = useState(0);
  const [distractorInput, setDistractorInput] = useState("");
  const [distractorLeft, setDistractorLeft] = useState(DISTRACTOR_DURATION_MS);
  const [lateTaskLeft, setLateTaskLeft] = useState(LATE_RECALL_DURATION_MS);
  const [recognitionMarked, setRecognitionMarked] = useState<Set<string>>(new Set());

  const recognitionList = useMemo(() => {
    const all = [...problem.words, ...problem.distractors];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j]!, all[i]!];
    }
    return all;
  }, [problem]);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);
  useEffect(() => { setRecallPrefs({ difficulty, gameMode, listType }); }, [difficulty, gameMode, listType, setRecallPrefs]);

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("memorize");
      setMemorizeLeft(memorizeTimeMs(difficulty, wordCount));
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, countdown, difficulty, wordCount]);

  // Memorize countdown
  useEffect(() => {
    if (phase !== "memorize") return;
    const totalMs = memorizeTimeMs(difficulty, wordCount);
    const start = performance.now();
    const tick = () => {
      const left = totalMs - (performance.now() - start);
      if (left <= 0) {
        setMemorizeLeft(0);
        // Transition based on mode
        if (isDistractor) {
          setPhase("distractor");
          setDistractorLeft(DISTRACTOR_DURATION_MS);
        } else if (isLateRecall) {
          setPhase("late-task");
          setLateTaskLeft(LATE_RECALL_DURATION_MS);
        } else {
          setPhase("recall");
        }
        return;
      }
      setMemorizeLeft(left);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [phase, difficulty, wordCount, isDistractor, isLateRecall]);

  // Distractor countdown
  useEffect(() => {
    if (phase !== "distractor") return;
    const start = performance.now();
    const remaining = distractorLeft;
    const tick = () => {
      const left = remaining - (performance.now() - start);
      if (left <= 0) {
        setDistractorLeft(0);
        setPhase("recall");
        return;
      }
      setDistractorLeft(left);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [phase, distractorLeft]);

  // Late task countdown
  useEffect(() => {
    if (phase !== "late-task") return;
    const start = performance.now();
    const remaining = lateTaskLeft;
    const tick = () => {
      const left = remaining - (performance.now() - start);
      if (left <= 0) {
        setLateTaskLeft(0);
        setPhase("recall");
        return;
      }
      setLateTaskLeft(left);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [phase, lateTaskLeft]);

  const finishRecall = useCallback(() => {
    const val = validateRecall(typedWords, problem, orderMode);
    setValidation(val);
    vibrate(val.correct.length > 0 ? 30 : [60, 40, 60], vibrateOn);

    if (isRecognition) {
      setPhase("recognition");
      return;
    }

    if (isMultiRound && round < MAX_ROUNDS) {
      setLearningCurve((prev) => [...prev, val.correct.length]);
      setPhase("feedback");
      return;
    }

    if (isMultiRound) {
      setLearningCurve((prev) => [...prev, val.correct.length]);
    }

    finishGame(val, null);
  }, [typedWords, problem, orderMode, isRecognition, isMultiRound, round, vibrateOn]);

  const finishRecognition = useCallback(() => {
    const recResult = validateRecognition(recognitionMarked, problem);
    setRecognitionResult(recResult);
    finishGame(validation, recResult);
  }, [recognitionMarked, problem, validation]);

  const finishGame = useCallback(
    (val: ValidationResult | null, recResult: RecognitionResult | null) => {
      clearTimers();
      const correct = val?.correct.length ?? 0;
      const total = problem.words.length;
      const intrusions = val?.intrusions.length ?? 0;
      const perseverations = val?.perseverations.length ?? 0;
      const score = calcScore(correct, total, intrusions, perseverations, difficulty, val?.orderCorrect, val?.orderTotal);

      const hiddenAnalysis = problem.hiddenCategory
        ? analyzeHiddenCategory(typedWords, problem)
        : { hiddenRecall: 0, scatteredRecall: 0, hiddenTotal: 0, scatteredTotal: 0 };

      addRecallRound({
        difficulty,
        gameMode,
        listType,
        correct,
        total,
        intrusions,
        perseverations,
        orderCorrect: val?.orderCorrect ?? 0,
        orderTotal: val?.orderTotal ?? 0,
        recognitionHits: recResult?.hits ?? 0,
        recognitionTotal: recResult?.total ?? 0,
        hiddenCategoryRecall: hiddenAnalysis.hiddenTotal > 0
          ? (hiddenAnalysis.hiddenRecall / hiddenAnalysis.hiddenTotal) * 100 : 0,
        scatteredRecall: hiddenAnalysis.scatteredTotal > 0
          ? (hiddenAnalysis.scatteredRecall / hiddenAnalysis.scatteredTotal) * 100 : 0,
        hiddenCategory: problem.hiddenCategory ?? "",
        learningCurve: isMultiRound ? learningCurve : [],
        score,
        playedAt: Date.now(),
      });

      navigate({
        to: "/recall/resultado",
        search: {
          difficulty,
          gameMode,
          listType,
          correct,
          total,
          intrusions,
          perseverations,
          orderCorrect: val?.orderCorrect ?? 0,
          orderTotal: val?.orderTotal ?? 0,
          recognitionHits: recResult?.hits ?? 0,
          recognitionTotal: recResult?.total ?? 0,
          hiddenCategoryRecall: hiddenAnalysis.hiddenTotal > 0
            ? Math.round((hiddenAnalysis.hiddenRecall / hiddenAnalysis.hiddenTotal) * 100) : 0,
          scatteredRecall: hiddenAnalysis.scatteredTotal > 0
            ? Math.round((hiddenAnalysis.scatteredRecall / hiddenAnalysis.scatteredTotal) * 100) : 0,
          hiddenCategory: problem.hiddenCategory ?? "",
          score,
          learningCurve: isMultiRound ? learningCurve.join(",") : "",
        },
      });
    },
    [clearTimers, problem, difficulty, gameMode, listType, typedWords, isMultiRound, learningCurve, addRecallRound, navigate],
  );

  const nextRound = useCallback(() => {
    setRound((r) => r + 1);
    setTypedWords([]);
    setInputVal("");
    setValidation(null);
    setPhase("countdown");
    setCountdown(3);
  }, []);

  // Submit word
  const submitWord = () => {
    const word = inputVal.trim();
    if (!word) return;
    setTypedWords((prev) => [...prev, word]);
    setInputVal("");
    vibrate(15, vibrateOn);
  };

  // Distractor submit
  const submitDistractor = () => {
    const val = parseInt(distractorInput, 10);
    if (isNaN(val)) return;
    setDistractorInput("");
    setDistractorIdx((i) => Math.min(i + 1, distractorProblems.length - 1));
  };

  const memorizePct = memorizeLeft > 0
    ? (memorizeLeft / memorizeTimeMs(difficulty, wordCount)) * 100
    : 0;

  const distractorPct = (distractorLeft / DISTRACTOR_DURATION_MS) * 100;
  const lateTaskPct = (lateTaskLeft / LATE_RECALL_DURATION_MS) * 100;

  return (
    <AppShell title={DIFFICULTY_LABEL[difficulty].label} back="/recall">
      {/* Mode + round info */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card/60 px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">{GAME_MODE_LABEL[gameMode].label}</span>
        <div className="flex items-center gap-2">
          {isMultiRound && (
            <span className="font-mono text-xs text-accent">Rodada {round}/{MAX_ROUNDS}</span>
          )}
          <span className="text-[11px] text-muted-foreground">{LIST_TYPE_LABEL[listType].label}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Countdown */}
        {phase === "countdown" && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="mt-20 flex flex-col items-center"
          >
            <div className="font-display text-7xl font-bold text-gradient-neural">
              {countdown > 0 ? countdown : "GO"}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Prepare-se para memorizar...</p>
          </motion.div>
        )}

        {/* Memorize */}
        {phase === "memorize" && (
          <motion.div
            key="memorize"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-sm font-semibold text-foreground">Memorize as palavras</span>
              <span className="font-mono text-sm text-accent">{Math.ceil(memorizeLeft / 1000)}s</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-secondary/60">
              <div className="h-full bg-gradient-neural transition-all duration-75 ease-linear" style={{ width: `${memorizePct}%` }} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {problem.words.map((w, i) => (
                <motion.div
                  key={`${w.palavra}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-xl border border-border bg-card p-3 text-center font-display text-base font-semibold text-foreground"
                >
                  {w.palavra}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Distractor task */}
        {phase === "distractor" && (
          <motion.div
            key="distractor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-sm font-semibold text-foreground">Tarefa intermediária — Cálculo</span>
              <span className="font-mono text-sm text-accent">{Math.ceil(distractorLeft / 1000)}s</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-secondary/60">
              <div className="h-full bg-accent transition-all duration-75 ease-linear" style={{ width: `${distractorPct}%` }} />
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">Resolva as contas enquanto aguarda a recordação.</p>
            <div className="mt-6 flex min-h-[120px] items-center justify-center rounded-2xl border border-border bg-card/60 p-6">
              <span className="font-mono text-4xl font-bold text-gradient-neural">
                {distractorProblems[distractorIdx]?.display}
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                value={distractorInput}
                onChange={(e) => setDistractorInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitDistractor()}
                placeholder="Resposta"
                className="flex-1 rounded-xl border border-border bg-card px-4 py-3 font-mono text-xl font-bold text-foreground outline-none focus:border-primary/50"
              />
              <button
                onClick={submitDistractor}
                className="rounded-xl bg-gradient-neural px-5 font-bold text-primary-foreground shadow-glow-primary active:scale-95"
              >
                <Check className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Late recall task */}
        {phase === "late-task" && (
          <motion.div
            key="late-task"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-sm font-semibold text-foreground">Tarefa intermediária</span>
              <span className="font-mono text-sm text-accent">{Math.ceil(lateTaskLeft / 1000)}s</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-secondary/60">
              <div className="h-full bg-accent transition-all duration-75 ease-linear" style={{ width: `${lateTaskPct}%` }} />
            </div>
            <div className="mt-8 flex flex-col items-center text-center">
              <Brain className="h-12 w-12 text-accent" />
              <p className="mt-4 text-sm text-muted-foreground">
                Aguarde o tempo acabar para a fase de recordação.
                <br />Isto mede retenção de longo prazo.
              </p>
            </div>
          </motion.div>
        )}

        {/* Recall */}
        {phase === "recall" && (
          <motion.div
            key={`recall-${round}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-sm font-semibold text-foreground">
                {orderMode ? "Digite as palavras na ordem exata" : "Digite as palavras que lembrar"}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{typedWords.length}/{wordCount}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-card/60 p-3 min-h-[60px]">
              {typedWords.length === 0 && (
                <span className="text-xs text-muted-foreground self-center">Nenhuma palavra ainda...</span>
              )}
              {typedWords.map((w, i) => (
                <span key={i} className="rounded-lg bg-secondary/70 px-2 py-1 text-xs font-medium text-foreground">
                  {orderMode && <span className="text-muted-foreground">{i + 1}. </span>}
                  {w}
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitWord()}
                placeholder="Digite uma palavra..."
                autoFocus
                className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground outline-none focus:border-primary/50"
              />
              <button
                onClick={() => setInputVal("")}
                className="rounded-xl bg-secondary/70 px-3 active:scale-95"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={submitWord}
              disabled={!inputVal.trim()}
              className="mt-2 w-full rounded-xl bg-secondary/70 py-2.5 text-sm font-medium text-foreground active:scale-95 disabled:opacity-50"
            >
              Adicionar palavra
            </button>
            <button
              onClick={finishRecall}
              className="mt-3 w-full rounded-xl bg-gradient-neural py-3.5 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-[0.98]"
            >
              Finalizar recordação
            </button>
          </motion.div>
        )}

        {/* Recognition */}
        {phase === "recognition" && (
          <motion.div
            key="recognition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-accent" />
              <span className="font-display text-sm font-semibold text-foreground">
                Reconhecimento — marque as palavras que você viu
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {recognitionList.map((w) => {
                  const lw = w.palavra.toLowerCase();
                  const marked = recognitionMarked.has(lw);
                  return (
                    <button
                      key={w.palavra}
                      onClick={() => {
                        setRecognitionMarked((prev) => {
                          const next = new Set(prev);
                          if (next.has(lw)) next.delete(lw);
                          else next.add(lw);
                          return next;
                        });
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-3 text-left transition-all active:scale-95",
                        marked
                          ? "border-primary/50 bg-primary/15 shadow-glow-primary"
                          : "border-border bg-card/60",
                      )}
                    >
                      <span className="text-sm font-medium text-foreground">{w.palavra}</span>
                      {marked && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
            </div>
            <button
              onClick={finishRecognition}
              className="mt-4 w-full rounded-xl bg-gradient-neural py-3.5 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-[0.98]"
            >
              Finalizar reconhecimento
            </button>
          </motion.div>
        )}

        {/* Feedback (between rounds in multi-round mode) */}
        {phase === "feedback" && validation && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <div className="rounded-2xl border border-border bg-card/60 p-4 text-center">
              <div className="font-display text-2xl font-bold text-gradient-neural">
                Rodada {round} — {validation.correct.length}/{wordCount}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {validation.forgotten.length > 0 && (
                  <div className="mt-2">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Esquecidas: </span>
                    <span className="font-medium text-destructive">{validation.forgotten.join(", ")}</span>
                  </div>
                )}
                {validation.intrusions.length > 0 && (
                  <div className="mt-1">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Intrusões: </span>
                    <span className="font-medium text-amber-500">{validation.intrusions.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={nextRound}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-neural py-3.5 font-display text-base font-bold text-primary-foreground shadow-glow-primary transition-transform active:scale-[0.98]"
            >
              Próxima rodada <ArrowRight className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
