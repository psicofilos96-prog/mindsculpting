export const MORSE_MAP: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.",
  H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.",
  O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-",
  V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
  "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
};

export type MorseSymbol = "." | "-";

type PlayOptions = {
  wpm?: number;
  frequency?: number;
};

let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

// 1 unidade de tempo em ms, a partir do WPM (regra PARIS padrão)
export function unitMs(wpm: number): number {
  return 1200 / wpm;
}

function tone(durationMs: number, frequency: number): Promise<void> {
  return new Promise((resolve) => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    const d = durationMs / 1000;
    const attack = Math.min(0.005, d / 4);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + attack);
    gain.gain.linearRampToValueAtTime(0.3, now + d - attack);
    gain.gain.linearRampToValueAtTime(0, now + d);

    osc.start(now);
    osc.stop(now + d);
    osc.onended = () => resolve();
  });
}

function silence(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playPattern(pattern: string, u: number, frequency: number): Promise<void> {
  for (let i = 0; i < pattern.length; i++) {
    const symbol = pattern[i];
    await tone(symbol === "." ? u : u * 3, frequency);
    if (i < pattern.length - 1) await silence(u);
  }
}

export async function playMorseText(text: string, options: PlayOptions = {}): Promise<void> {
  const wpm = options.wpm ?? 15;
  const frequency = options.frequency ?? 600;
  const u = unitMs(wpm);

  const words = text.toUpperCase().trim().split(/\s+/);

  for (let w = 0; w < words.length; w++) {
    const letters = words[w].split("");
    for (let l = 0; l < letters.length; l++) {
      const pattern = MORSE_MAP[letters[l]];
      if (!pattern) continue;
      await playPattern(pattern, u, frequency);
      if (l < letters.length - 1) await silence(u * 3);
    }
    if (w < words.length - 1) await silence(u * 7);
  }
}

export async function playSymbol(symbol: MorseSymbol, options: PlayOptions = {}): Promise<void> {
  const wpm = options.wpm ?? 15;
  const frequency = options.frequency ?? 600;
  const u = unitMs(wpm);
  await tone(symbol === "." ? u : u * 3, frequency);
}

export async function playLetter(letter: string, options: PlayOptions = {}): Promise<void> {
  const pattern = MORSE_MAP[letter.toUpperCase()];
  if (!pattern) return;
  const wpm = options.wpm ?? 15;
  const frequency = options.frequency ?? 600;
  const u = unitMs(wpm);
  await playPattern(pattern, u, frequency);
}

export function randomSymbol(): MorseSymbol {
  return Math.random() < 0.5 ? "." : "-";
}

export function generateSequence(length: number): MorseSymbol[] {
  return Array.from({ length }, () => randomSymbol());
}
