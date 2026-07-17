import type { CipherMode, Difficulty, Puzzle } from "./types";
import { SYMBOLS } from "./types";
import { WORD_BANK } from "@/features/recall/wordBank";

// ── Seeded RNG ───────────────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateSeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// ── Text normalization ──────────────────────────────────────────────────────

const ACCENT_MAP: Record<string, string> = {
  "á":"a","à":"a","â":"a","ã":"a","ä":"a","é":"e","è":"e","ê":"e","ë":"e",
  "í":"i","ì":"i","î":"i","ï":"i","ó":"o","ò":"o","ô":"o","õ":"o","ö":"o",
  "ú":"u","ù":"u","û":"u","ü":"u","ç":"c",
  "Á":"A","À":"A","Â":"A","Ã":"A","Ä":"A","É":"E","È":"E","Ê":"E","Ë":"E",
  "Í":"I","Ì":"I","Î":"I","Ï":"I","Ó":"O","Ò":"O","Ô":"O","Õ":"O","Ö":"O",
  "Ú":"U","Ù":"U","Û":"U","Ü":"U","Ç":"C",
};

function normalize(text: string): string {
  return text.split("").map((ch) => ACCENT_MAP[ch] ?? ch).join("")
    .toUpperCase().replace(/[^A-Z\s]/g, "").replace(/\s+/g, " ").trim();
}

// ── Word/phrase selection ────────────────────────────────────────────────────

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function pickWord(rng: () => number, difficulty: Difficulty): string {
  const targetLevel = difficulty === "easy" ? "F" : difficulty === "medium" ? "M" : "D";
  const pool = WORD_BANK.filter((w) => w.dificuldade === targetLevel);
  const word = pool[Math.floor(rng() * pool.length)]!;
  return normalize(word.palavra);
}

function generatePhrase(rng: () => number, difficulty: Difficulty): string {
  const wordCount = difficulty === "medium" ? 2 : difficulty === "hard" ? 3 : 4;
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) words.push(pickWord(rng, difficulty));
  return words.join(" ");
}

function generateMessage(rng: () => number, difficulty: Difficulty): string {
  if (difficulty === "easy") return pickWord(rng, "easy");
  if (difficulty === "medium") return rng() < 0.5 ? pickWord(rng, "medium") : generatePhrase(rng, "medium");
  if (difficulty === "hard") return generatePhrase(rng, "hard");
  return generatePhrase(rng, "expert");
}

// ── Cipher generators ────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function generateSubstitution(plaintext: string, rng: () => number): { ciphertext: string; mapping: Record<string, string> } {
  const shuffled = shuffleArray(ALPHABET, rng);
  const mapping: Record<string, string> = {};
  for (let i = 0; i < 26; i++) mapping[ALPHABET[i]!] = shuffled[i]!;
  const ciphertext = plaintext.split("").map((ch) => ch === " " ? " " : mapping[ch] ?? ch).join("");
  return { ciphertext, mapping };
}

function generateSymbolCipher(plaintext: string, rng: () => number): { ciphertext: string; mapping: Record<string, string> } {
  const shuffledSymbols = shuffleArray([...SYMBOLS], rng);
  const mapping: Record<string, string> = {};
  for (let i = 0; i < 26; i++) mapping[ALPHABET[i]!] = shuffledSymbols[i]!;
  const ciphertext = plaintext.split("").map((ch) => ch === " " ? " " : mapping[ch] ?? ch).join("");
  return { ciphertext, mapping };
}

function generateCaesar(plaintext: string, rng: () => number): { ciphertext: string; shift: number } {
  const shift = 1 + Math.floor(rng() * 25);
  const ciphertext = plaintext.split("").map((ch) => {
    if (ch === " ") return " ";
    const code = ch.charCodeAt(0) - 65;
    return ALPHABET[(code + shift) % 26]!;
  }).join("");
  return { ciphertext, shift };
}

function generateNumeric(plaintext: string): { ciphertext: string } {
  const ciphertext = plaintext.split(" ").map((word) =>
    word.split("").map((ch) => ch.charCodeAt(0) - 64).join("-")
  ).join(" / ");
  return { ciphertext };
}

// ── Hint generation ─────────────────────────────────────────────────────────

const DIFFICULTY_HINT_COUNT: Record<Difficulty, number> = { easy: 4, medium: 2, hard: 0, expert: 0 };

function generateRevealedHints(plaintext: string, difficulty: Difficulty, rng: () => number): number[] {
  const count = DIFFICULTY_HINT_COUNT[difficulty];
  if (count === 0) return [];
  const uniqueLetters = [...new Set(plaintext.replace(/\s/g, "").split(""))];
  const shuffledLetters = shuffleArray(uniqueLetters, rng);
  const lettersToReveal = new Set(shuffledLetters.slice(0, Math.min(count, uniqueLetters.length)));
  const revealed: number[] = [];
  for (let i = 0; i < plaintext.length; i++) {
    if (plaintext[i]! !== " " && lettersToReveal.has(plaintext[i]!)) revealed.push(i);
  }
  return revealed;
}

// ── Puzzle generation ────────────────────────────────────────────────────────

export function generatePuzzle(mode: CipherMode, difficulty: Difficulty, seed?: number): Puzzle {
  const actualSeed = seed ?? Math.floor(Math.random() * 2 ** 31);
  const rng = mulberry32(actualSeed);
  const plaintext = generateMessage(rng, difficulty);

  let ciphertext: string;
  let mapping: Record<string, string> = {};
  let shift: number | undefined;

  switch (mode) {
    case "substitution": { const r = generateSubstitution(plaintext, rng); ciphertext = r.ciphertext; mapping = r.mapping; break; }
    case "symbol": { const r = generateSymbolCipher(plaintext, rng); ciphertext = r.ciphertext; mapping = r.mapping; break; }
    case "caesar": { const r = generateCaesar(plaintext, rng); ciphertext = r.ciphertext; shift = r.shift; break; }
    case "numeric": { const r = generateNumeric(plaintext); ciphertext = r.ciphertext; break; }
  }

  const revealedHints = generateRevealedHints(plaintext, difficulty, rng);

  return { id: `cripto-${mode}-${difficulty}-${actualSeed}`, mode, difficulty, plaintext, ciphertext, mapping, shift, revealedHints, seed: actualSeed };
}

export function generateDailyPuzzle(mode: CipherMode): Puzzle {
  return generatePuzzle(mode, "medium", dateSeed());
}

// ── Validation ──────────────────────────────────────────────────────────────

export function checkSolution(puzzle: Puzzle, playerMapping: Record<string, string>): boolean {
  for (let i = 0; i < puzzle.plaintext.length; i++) {
    const plainCh = puzzle.plaintext[i]!;
    if (plainCh === " ") continue;
    const cipherCh = puzzle.ciphertext[i]!;
    if (playerMapping[cipherCh] !== plainCh) return false;
  }
  return true;
}

export function decode(puzzle: Puzzle, playerMapping: Record<string, string>): string {
  return puzzle.ciphertext.split("").map((ch) => {
    if (ch === " ") return " ";
    if (ch === "/" || ch === "-") return ch;
    return playerMapping[ch] ?? "";
  }).join("");
}

export function getHint(puzzle: Puzzle, playerMapping: Record<string, string>): { cipherChar: string; plainChar: string } | null {
  const unmapped: { cipher: string; plain: string }[] = [];
  for (let i = 0; i < puzzle.plaintext.length; i++) {
    const plainCh = puzzle.plaintext[i]!;
    if (plainCh === " ") continue;
    const cipherCh = puzzle.ciphertext[i]!;
    if (cipherCh === " " || cipherCh === "-" || cipherCh === "/") continue;
    if (playerMapping[cipherCh] !== plainCh) unmapped.push({ cipher: cipherCh, plain: plainCh });
  }
  if (unmapped.length === 0) return null;
  const pick = unmapped[Math.floor(Math.random() * unmapped.length)]!;
  return { cipherChar: pick.cipher, plainChar: pick.plain };
}

export function getCaesarHint(puzzle: Puzzle): number | null { return puzzle.shift ?? null; }

// ── Scoring ──────────────────────────────────────────────────────────────────

export function calculateScore(difficulty: Difficulty, timeMs: number, hintsUsed: number, errors: number): number {
  const base: Record<Difficulty, number> = { easy: 100, medium: 200, hard: 350, expert: 500 };
  let score = base[difficulty];
  if (timeMs < 30000) score += 50; else if (timeMs < 60000) score += 25;
  if (hintsUsed === 0) score += 75;
  if (errors === 0) score += 50;
  score -= hintsUsed * 20;
  score -= errors * 10;
  return Math.max(0, score);
}
