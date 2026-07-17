import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Lightbulb, RotateCw, Eraser, Clock,
  CircleCheck as CheckCircle2, ArrowLeft, ArrowRight,
} from "lucide-react";
import {
  CIPHER_MODE_LABEL,
  DIFFICULTY_LABEL,
  SYMBOLS,
  type CipherMode,
  type Difficulty,
  type GameMode,
  type Puzzle,
} from "@/features/cripto/types";
import {
  generatePuzzle,
  generateDailyPuzzle,
  checkSolution,
  getHint,
  getCaesarHint,
  calculateScore,
  decode,
} from "@/features/cripto/engine";
import { useCriptoStorage } from "@/features/cripto/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cripto/jogar")({
  validateSearch: z.object({
    mode: z.enum(["substitution", "symbol", "caesar", "numeric"]).default("substitution"),
    difficulty: z.enum(["easy", "medium", "hard", "expert"]).default("easy"),
    gameMode: z.enum(["training", "classic", "timed", "daily"]).default("training"),
  }),
  component: CriptoGame,
});

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function CriptoGame() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { recordSolve } = useCriptoStorage();
  const { mode, difficulty, gameMode } = search;

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [playerMapping, setPlayerMapping] = useState<Record<string, string>>({});
  const [selectedCipherChar, setSelectedCipherChar] = useState<string | null>(null);
  const [errors, setErrors] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [startMs, setStartMs] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [caesarShift, setCaesarShift] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedRef = useRef(false);

  // Generate puzzle on mount / mode change
  useEffect(() => {
    const p = gameMode === "daily" ? generateDailyPuzzle(mode) : generatePuzzle(mode, difficulty);
    setPuzzle(p);
    setPlayerMapping({});
    setSelectedCipherChar(null);
    setErrors(0);
    setHintsUsed(0);
    setSolved(false);
    setShowWin(false);
    setStartMs(Date.now());
    setElapsed(0);
    setWrongFlash(null);
    setScore(0);
    setCaesarShift(0);
    recordedRef.current = false;

    // Apply revealed hints
    if (p.revealedHints.length > 0) {
      const initialMapping: Record<string, string> = {};
      for (const idx of p.revealedHints) {
        const cipherCh = p.ciphertext[idx]!;
        const plainCh = p.plaintext[idx]!;
        initialMapping[cipherCh] = plainCh;
      }
      setPlayerMapping(initialMapping);
    }

    // For caesar, set initial shift to 0
    if (mode === "caesar" && p.shift !== undefined) {
      setCaesarShift(0);
    }
  }, [mode, difficulty, gameMode]);

  // Timer
  useEffect(() => {
    if (solved) return;
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startMs);
    }, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [solved, startMs]);

  // Check completion
  useEffect(() => {
    if (!puzzle || recordedRef.current) return;

    if (mode === "caesar") {
      // For caesar, check if the current shift produces correct text
      if (caesarShift === puzzle.shift) {
        recordedRef.current = true;
        setSolved(true);
        const finalTime = Date.now() - startMs;
        const s = calculateScore(difficulty, finalTime, hintsUsed, errors);
        setScore(s);
        recordSolve({ mode, difficulty, timeMs: finalTime, hintsUsed, errors, solved: true });
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(() => setShowWin(true), 400);
      }
    } else if (mode === "numeric") {
      // Numeric mode: check if player mapping is complete and correct
      if (checkSolution(puzzle, playerMapping)) {
        recordedRef.current = true;
        setSolved(true);
        const finalTime = Date.now() - startMs;
        const s = calculateScore(difficulty, finalTime, hintsUsed, errors);
        setScore(s);
        recordSolve({ mode, difficulty, timeMs: finalTime, hintsUsed, errors, solved: true });
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(() => setShowWin(true), 400);
      }
    } else {
      // Substitution / symbol: check mapping
      if (checkSolution(puzzle, playerMapping)) {
        recordedRef.current = true;
        setSolved(true);
        const finalTime = Date.now() - startMs;
        const s = calculateScore(difficulty, finalTime, hintsUsed, errors);
        setScore(s);
        recordSolve({ mode, difficulty, timeMs: finalTime, hintsUsed, errors, solved: true });
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(() => setShowWin(true), 400);
      }
    }
  }, [puzzle, playerMapping, caesarShift, mode, difficulty, startMs, hintsUsed, errors, recordSolve]);

  // For caesar mode, auto-generate mapping from shift
  const caesarDecoded = useMemo(() => {
    if (!puzzle || mode !== "caesar") return "";
    return puzzle.ciphertext
      .split("")
      .map((ch) => {
        if (ch === " ") return " ";
        const code = ch.charCodeAt(0) - 65;
        return ALPHABET[((code - caesarShift) % 26 + 26) % 26]!;
      })
      .join("");
  }, [puzzle, mode, caesarShift]);

  const handleCipherCharClick = useCallback((char: string) => {
    if (solved || mode === "caesar") return;
    setSelectedCipherChar(char);
  }, [solved, mode]);

  const handleLetterInput = useCallback((letter: string) => {
    if (!selectedCipherChar || !puzzle || solved) return;

    // Check if this mapping is correct
    const correctPlain = puzzle.plaintext
      .split("")
      .find((_, i) => puzzle.ciphertext[i] === selectedCipherChar && puzzle.plaintext[i] !== " ");

    if (correctPlain && correctPlain !== letter) {
      // Wrong mapping
      setErrors((e) => e + 1);
      setWrongFlash(selectedCipherChar);
      setTimeout(() => setWrongFlash(null), 500);
      return;
    }

    // Apply mapping
    setPlayerMapping((prev) => ({ ...prev, [selectedCipherChar]: letter }));
    setSelectedCipherChar(null);
  }, [selectedCipherChar, puzzle, solved]);

  const handleErase = useCallback(() => {
    if (!selectedCipherChar || solved) return;
    setPlayerMapping((prev) => {
      const next = { ...prev };
      delete next[selectedCipherChar];
      return next;
    });
  }, [selectedCipherChar, solved]);

  const handleHint = useCallback(() => {
    if (!puzzle || solved) return;

    if (mode === "caesar") {
      const shift = getCaesarHint(puzzle);
      if (shift !== null) {
        setCaesarShift(shift);
        setHintsUsed((n) => n + 1);
      }
    } else {
      const hint = getHint(puzzle, playerMapping);
      if (hint) {
        setPlayerMapping((prev) => ({ ...prev, [hint.cipherChar]: hint.plainChar }));
        setHintsUsed((n) => n + 1);
      }
    }
  }, [puzzle, mode, playerMapping, solved]);

  const handleRestart = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const p = gameMode === "daily" ? generateDailyPuzzle(mode) : generatePuzzle(mode, difficulty);
    setPuzzle(p);
    setPlayerMapping({});
    setSelectedCipherChar(null);
    setErrors(0);
    setHintsUsed(0);
    setSolved(false);
    setShowWin(false);
    setStartMs(Date.now());
    setElapsed(0);
    setWrongFlash(null);
    setScore(0);
    setCaesarShift(0);
    recordedRef.current = false;

    if (p.revealedHints.length > 0) {
      const initialMapping: Record<string, string> = {};
      for (const idx of p.revealedHints) {
        const cipherCh = p.ciphertext[idx]!;
        const plainCh = p.plaintext[idx]!;
        initialMapping[cipherCh] = plainCh;
      }
      setPlayerMapping(initialMapping);
    }
  }, [mode, difficulty, gameMode]);

  if (!puzzle) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="text-muted-foreground">Gerando desafio...</div>
      </div>
    );
  }

  // Get unique cipher characters in the message
  const cipherCharsInMessage = [...new Set(puzzle.ciphertext.split("").filter((c) => c !== " " && c !== "-" && c !== "/"))];

  // Decoded text for display
  const decodedText = mode === "caesar" ? caesarDecoded : decode(puzzle, playerMapping);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/cripto" })}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            {CIPHER_MODE_LABEL[mode]}
          </span>
          <span className="rounded-md bg-secondary/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {DIFFICULTY_LABEL[difficulty]}
          </span>
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono font-bold tabular-nums text-foreground">{formatTime(elapsed)}</span>
          </div>
        </div>

        <button
          onClick={handleRestart}
          title="Novo desafio"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground active:scale-95"
        >
          <RotateCw className="h-4 w-4" />
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center gap-4 px-4 py-4 overflow-y-auto">
        {/* Cipher display */}
        <div className="w-full max-w-2xl">
          <h3 className="mb-2 px-1 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {mode === "numeric" ? "Código Numérico" : "Mensagem Cifrada"}
          </h3>

          {mode === "numeric" ? (
            <NumericDisplay puzzle={puzzle} playerMapping={playerMapping} />
          ) : mode === "caesar" ? (
            <CaesarDisplay puzzle={puzzle} decoded={caesarDecoded} shift={caesarShift} />
          ) : (
            <CipherDisplay
              puzzle={puzzle}
              playerMapping={playerMapping}
              selectedCipherChar={selectedCipherChar}
              wrongFlash={wrongFlash}
              onCharClick={handleCipherCharClick}
              isSymbol={mode === "symbol"}
            />
          )}
        </div>

        {/* Caesar shift selector */}
        {mode === "caesar" && !solved && (
          <div className="w-full max-w-md">
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Deslocamento: <span className="font-mono text-primary">{caesarShift}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCaesarShift((s) => (s - 1 + 26) % 26)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card active:scale-95"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={25}
                  value={caesarShift}
                  onChange={(e) => setCaesarShift(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <button
                  onClick={() => setCaesarShift((s) => (s + 1) % 26)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card active:scale-95"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 text-center text-[10px] text-muted-foreground">
                Ajuste o deslocamento até o texto fazer sentido
              </div>
            </div>
          </div>
        )}

        {/* Numeric reference table */}
        {mode === "numeric" && (
          <NumericReference onLetterInput={handleLetterInput} hasSelected={selectedCipherChar !== null} />
        )}

        {/* Mapping table for substitution/symbol */}
        {mode !== "caesar" && mode !== "numeric" && (
          <MappingTable
            puzzle={puzzle}
            playerMapping={playerMapping}
            selectedCipherChar={selectedCipherChar}
            onCharClick={handleCipherCharClick}
            isSymbol={mode === "symbol"}
          />
        )}

        {/* Controls */}
        <div className="mt-auto w-full max-w-md space-y-2 pb-4">
          <div className="flex gap-2">
            <CtrlButton
              onClick={handleHint}
              icon={<Lightbulb className="h-4 w-4" />}
              label="Dica"
              accent
            />
            <CtrlButton
              onClick={handleErase}
              disabled={!selectedCipherChar}
              icon={<Eraser className="h-4 w-4" />}
              label="Apagar"
            />
          </div>

          {/* Alphabet keyboard (not for caesar or numeric) */}
          {mode !== "caesar" && (
            <div className="grid grid-cols-7 gap-1 sm:grid-cols-9">
              {ALPHABET.map((letter) => (
                <button
                  key={letter}
                  onClick={() => handleLetterInput(letter)}
                  disabled={!selectedCipherChar || solved}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-lg border border-border bg-card font-display text-sm font-bold text-foreground transition-all active:scale-95",
                    "hover:border-primary/50 hover:bg-primary/10",
                    (!selectedCipherChar || solved) && "opacity-40",
                  )}
                >
                  {letter}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Win overlay */}
      <AnimatePresence>
        {showWin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-[0_8px_48px_oklch(0_0_0/50%)]"
            >
              <div className="mb-4 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
              </div>
              <h2 className="text-center font-display text-2xl font-bold text-gradient-neural">
                Decifrado!
              </h2>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                {CIPHER_MODE_LABEL[mode]} · {DIFFICULTY_LABEL[difficulty]}
              </p>
              <div className="mt-3 rounded-xl border border-border bg-secondary/30 p-3 text-center">
                <div className="font-display text-lg font-bold text-foreground">{puzzle.plaintext}</div>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2">
                <ResultStat label="Pontos" value={String(score)} />
                <ResultStat label="Tempo" value={formatTime(elapsed)} />
                <ResultStat label="Erros" value={String(errors)} />
                <ResultStat label="Dicas" value={String(hintsUsed)} />
              </div>

              <div className="mt-5 space-y-2">
                <button
                  onClick={handleRestart}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-neural py-3.5 font-display text-base font-bold text-primary-foreground shadow-glow-primary active:scale-[0.98]"
                >
                  <RotateCw className="h-4 w-4" />
                  Novo desafio
                </button>
                <button
                  onClick={() => navigate({ to: "/cripto" })}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3.5 font-display text-base font-semibold text-foreground active:scale-[0.98]"
                >
                  Voltar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Cipher display component ─────────────────────────────────────────────────

function CipherDisplay({
  puzzle,
  playerMapping,
  selectedCipherChar,
  wrongFlash,
  onCharClick,
  isSymbol,
}: {
  puzzle: Puzzle;
  playerMapping: Record<string, string>;
  selectedCipherChar: string | null;
  wrongFlash: string | null;
  onCharClick: (char: string) => void;
  isSymbol: boolean;
}) {
  const words = puzzle.ciphertext.split(" ");

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-3 rounded-xl border border-border bg-card/40 p-4">
      {words.map((word, wi) => (
        <div key={wi} className="flex gap-0.5">
          {word.split("").map((cipherCh, ci) => {
            const globalIdx = puzzle.ciphertext.indexOf(word) + ci;
            const decoded = playerMapping[cipherCh] ?? "";
            const isSelected = selectedCipherChar === cipherCh;
            const isWrong = wrongFlash === cipherCh;
            const isRevealed = puzzle.revealedHints.includes(globalIdx);

            return (
              <div
                key={ci}
                className="flex flex-col items-center"
              >
                <button
                  onClick={() => onCharClick(cipherCh)}
                  className={cn(
                    "flex h-9 w-8 items-center justify-center rounded-t-md border-2 border-b-0 font-display text-lg font-bold transition-all",
                    isSelected ? "border-primary bg-primary/10" : "border-border bg-card/60",
                    isWrong && "border-destructive bg-destructive/20 animate-pulse",
                    isSymbol && "text-base",
                  )}
                >
                  {cipherCh}
                </button>
                <div
                  className={cn(
                    "flex h-9 w-8 items-center justify-center rounded-b-md border-2 border-t-0 font-display text-lg font-bold transition-all",
                    isSelected ? "border-primary bg-primary/5" : "border-border bg-background/40",
                    decoded && "text-foreground",
                    !decoded && "text-transparent",
                    isRevealed && decoded && "text-success",
                  )}
                >
                  {decoded || "·"}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Caesar display ───────────────────────────────────────────────────────────

function CaesarDisplay({ puzzle, decoded, shift }: { puzzle: Puzzle; decoded: string; shift: number }) {
  const words = puzzle.ciphertext.split(" ");

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-3 rounded-xl border border-border bg-card/40 p-4">
      {words.map((word, wi) => (
        <div key={wi} className="flex gap-0.5">
          {word.split("").map((cipherCh, ci) => {
            const decodedCh = decoded.split(" ")[wi]?.[ci] ?? "";
            const isCorrect = decodedCh === puzzle.plaintext.split(" ")[wi]?.[ci];

            return (
              <div key={ci} className="flex flex-col items-center">
                <div className="flex h-9 w-8 items-center justify-center rounded-t-md border-2 border-b-0 border-border bg-card/60 font-display text-lg font-bold">
                  {cipherCh}
                </div>
                <div
                  className={cn(
                    "flex h-9 w-8 items-center justify-center rounded-b-md border-2 border-t-0 font-display text-lg font-bold transition-all",
                    shift > 0 && isCorrect
                      ? "border-success/50 bg-success/10 text-success"
                      : "border-border bg-background/40 text-foreground",
                  )}
                >
                  {decodedCh || "·"}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Numeric display ──────────────────────────────────────────────────────────

function NumericDisplay({
  puzzle,
  playerMapping,
}: {
  puzzle: Puzzle;
  playerMapping: Record<string, string>;
}) {
  // For numeric mode, ciphertext is like "3-1-20 / 8-5-12-12-15"
  // Player needs to type the letters
  const words = puzzle.ciphertext.split(" / ");

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-3 rounded-xl border border-border bg-card/40 p-4">
      {words.map((word, wi) => {
        const numbers = word.split("-");
        const plainWord = puzzle.plaintext.split(" ")[wi] ?? "";
        return (
          <div key={wi} className="flex gap-0.5">
            {numbers.map((num, ni) => {
              const correctLetter = plainWord[ni] ?? "";
              const playerLetter = playerMapping[num] ?? "";
              const isCorrect = playerLetter === correctLetter && playerLetter !== "";

              return (
                <div key={ni} className="flex flex-col items-center">
                  <div className="flex h-9 w-10 items-center justify-center rounded-t-md border-2 border-b-0 border-border bg-card/60 font-mono text-sm font-bold text-primary">
                    {num}
                  </div>
                  <input
                    value={playerLetter}
                    maxLength={1}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      // Will be handled by parent
                    }}
                    className={cn(
                      "flex h-9 w-10 items-center justify-center rounded-b-md border-2 border-t-0 text-center font-display text-lg font-bold uppercase outline-none",
                      isCorrect
                        ? "border-success/50 bg-success/10 text-success"
                        : "border-border bg-background/40 text-foreground",
                    )}
                    placeholder="·"
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Mapping table ────────────────────────────────────────────────────────────

function MappingTable({
  puzzle,
  playerMapping,
  selectedCipherChar,
  onCharClick,
  isSymbol,
}: {
  puzzle: Puzzle;
  playerMapping: Record<string, string>;
  selectedCipherChar: string | null;
  onCharClick: (char: string) => void;
  isSymbol: boolean;
}) {
  const cipherCharsInMessage = [...new Set(puzzle.ciphertext.split("").filter((c) => c !== " "))].sort();

  return (
    <div className="w-full max-w-md">
      <h3 className="mb-2 px-1 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Tabela de Correspondência
      </h3>
      <div className="grid grid-cols-7 gap-1 rounded-xl border border-border bg-card/40 p-3 sm:grid-cols-9">
        {cipherCharsInMessage.map((cipherCh) => {
          const decoded = playerMapping[cipherCh] ?? "";
          const isSelected = selectedCipherChar === cipherCh;

          return (
            <button
              key={cipherCh}
              onClick={() => onCharClick(cipherCh)}
              className={cn(
                "flex flex-col items-center rounded-md border-2 py-1 transition-all active:scale-95",
                isSelected ? "border-primary bg-primary/10" : "border-border bg-card/60 hover:border-primary/30",
                decoded && "border-success/40 bg-success/10",
              )}
            >
              <span className={cn("font-display text-sm font-bold", isSymbol ? "text-base" : "text-sm", "text-foreground")}>
                {cipherCh}
              </span>
              <span className={cn("font-display text-xs font-bold", decoded ? "text-success" : "text-muted-foreground/30")}>
                {decoded || "·"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Numeric reference table ───────────────────────────────────────────────────

function NumericReference({ onLetterInput, hasSelected }: { onLetterInput: (l: string) => void; hasSelected: boolean }) {
  return (
    <div className="w-full max-w-md">
      <h3 className="mb-2 px-1 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Referência: A=1, B=2, ... Z=26
      </h3>
      <div className="grid grid-cols-9 gap-1 rounded-xl border border-border bg-card/40 p-3">
        {ALPHABET.map((letter, i) => (
          <div
            key={letter}
            className="flex flex-col items-center rounded-md border border-border bg-card/60 px-1 py-0.5"
          >
            <span className="font-mono text-[10px] text-muted-foreground">{i + 1}</span>
            <span className="font-display text-sm font-bold text-foreground">{letter}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Control button ───────────────────────────────────────────────────────────

function CtrlButton({
  onClick, disabled, icon, label, accent,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all active:scale-95",
        disabled
          ? "border-border bg-card/30 text-muted-foreground/50"
          : accent
          ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
          : "border-border bg-card/60 text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-2 text-center">
      <div className="font-mono text-sm font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
