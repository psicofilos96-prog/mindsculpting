import type { GameMode, SeqColor } from "./types";

// ---------- Sequence generation ----------

export function generateNextColor(palette: SeqColor[], exclude?: string): SeqColor {
  let pick = palette[Math.floor(Math.random() * palette.length)]!;
  if (exclude && palette.length > 1) {
    let tries = 0;
    while (pick.id === exclude && tries < 5) {
      pick = palette[Math.floor(Math.random() * palette.length)]!;
      tries++;
    }
  }
  return pick;
}

export function generateInitialSequence(palette: SeqColor[], length: number): SeqColor[] {
  const seq: SeqColor[] = [];
  for (let i = 0; i < length; i++) {
    seq.push(generateNextColor(palette, seq[seq.length - 1]?.id));
  }
  return seq;
}

// ---------- Web Audio API: note synthesis ----------

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

/** Must be called from a user gesture to unlock audio. */
export function unlockAudio(): void {
  getCtx();
}

interface PlayOpts {
  freq: number;
  durationMs: number;
  soft?: boolean; // softer envelope for kids mode
  volume?: number;
}

function playNote({ freq, durationMs, soft, volume }: PlayOpts): void {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const dur = durationMs / 1000;
  const vol = volume ?? (soft ? 0.15 : 0.3);

  const osc = ctx.createOscillator();
  osc.type = soft ? "sine" : "triangle";
  osc.frequency.value = freq;

  // Subtle vibrato for richness
  const vibrato = ctx.createOscillator();
  vibrato.type = "sine";
  vibrato.frequency.value = 5;
  const vibGain = ctx.createGain();
  vibGain.gain.value = soft ? 2 : 4;
  vibrato.connect(vibGain).connect(osc.frequency);

  const gain = ctx.createGain();
  // Attack → sustain → fade out
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(vol, now + (soft ? 0.03 : 0.015));
  gain.gain.setValueAtTime(vol, now + dur * 0.4);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  vibrato.start(now);
  osc.stop(now + dur);
  vibrato.stop(now + dur);
}

/** Play a color's note with fade-out. */
export function playColorNote(color: SeqColor, durationMs: number, soft?: boolean): void {
  playNote({ freq: color.freq, durationMs, soft });
}

/** Play a short success chord (ascending). */
export function playSuccessSound(): void {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const notes = [261.63, 329.63, 392.0, 523.25];
  notes.forEach((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = f;
    const gain = ctx.createGain();
    const t = now + i * 0.08;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  });
}

/** Play a failure sound (descending dissonant). */
export function playFailSound(): void {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const notes = [220, 207, 196, 174];
  notes.forEach((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = f;
    const gain = ctx.createGain();
    const t = now + i * 0.1;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  });
}

// ---------- Daily challenge ----------

/** Deterministic PRNG (mulberry32) for daily challenge. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate a deterministic sequence for the daily challenge. */
export function generateDailySequence(
  palette: SeqColor[],
  length: number,
  date: Date,
): SeqColor[] {
  const seed =
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const rng = mulberry32(seed);
  const seq: SeqColor[] = [];
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(rng() * palette.length);
    seq.push(palette[idx]!);
  }
  return seq;
}

export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}
