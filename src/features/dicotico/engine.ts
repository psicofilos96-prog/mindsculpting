import {
  type DicoticoConfig,
  type QuestionType,
  type SoundDef,
  type Trial,
  type TrialQuestionType,
  getSoundPool,
} from "./types";

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Resolve the actual question type for a trial, handling "mixed" config. */
function resolveQuestionType(config: DicoticoConfig): TrialQuestionType {
  const pool: TrialQuestionType[] =
    config.questionType === "mixed"
      ? ["selective-left", "selective-right", "divided", "locate"]
      : config.questionType === "selective"
        ? ["selective-left", "selective-right"]
        : config.questionType === "divided"
          ? ["divided"]
          : ["locate"];
  return pick(pool);
}

/** Pick two distinct sounds from the pool for left and right channels. */
function pickSoundPair(config: DicoticoConfig): [SoundDef, SoundDef] {
  const pool = getSoundPool(config.variationType);
  if (pool.length < 2) return [pool[0]!, pool[0]!];
  const left = pick(pool);
  let right = pick(pool);
  let tries = 0;
  while (right.id === left.id && tries < 10) {
    right = pick(pool);
    tries++;
  }
  return [left, right];
}

export function generateTrial(config: DicoticoConfig): Trial {
  const [leftSound, rightSound] = pickSoundPair(config);
  const questionType = resolveQuestionType(config);
  const pool = getSoundPool(config.variationType);

  if (questionType === "selective-left" || questionType === "selective-right") {
    const target = questionType === "selective-left" ? leftSound : rightSound;
    const distractors = shuffle(pool.filter((s) => s.id !== target.id)).slice(0, 3);
    const options = shuffle([target, ...distractors]);
    return {
      leftSound,
      rightSound,
      questionType,
      correct: target.id,
      options,
    };
  }

  if (questionType === "divided") {
    // correct = [leftId, rightId]
    return {
      leftSound,
      rightSound,
      questionType,
      correct: [leftSound.id, rightSound.id],
      options: pool,
    };
  }

  // locate: pick one of the two sounds, ask which ear
  const target = Math.random() < 0.5 ? leftSound : rightSound;
  return {
    leftSound,
    rightSound,
    questionType,
    targetSound: target,
    correct: target.id === leftSound.id ? "left" : "right",
    options: [],
  };
}

// ---------- Web Audio API: stereo synthesis ----------

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

/** Ensure the audio context is running (must be called from a user gesture). */
export function unlockAudio(): void {
  getCtx();
}

function playTimbre(
  ctx: AudioContext,
  timbre: NonNullable<SoundDef["timbre"]>,
  panNode: StereoPannerNode,
  startTime: number,
  durationMs: number,
): void {
  const dur = durationMs / 1000;

  if (timbre === "bell") {
    // FM-ish bell: carrier + modulator with decay
    const carrier = ctx.createOscillator();
    carrier.type = "sine";
    carrier.frequency.value = 880;
    const mod = ctx.createOscillator();
    mod.type = "sine";
    mod.frequency.value = 1760;
    const modGain = ctx.createGain();
    modGain.gain.value = 400;
    mod.connect(modGain).connect(carrier.frequency);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.5, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
    carrier.connect(gain).connect(panNode);
    carrier.start(startTime);
    mod.start(startTime);
    carrier.stop(startTime + dur);
    mod.stop(startTime + dur);
    return;
  }

  if (timbre === "drum") {
    // Low sine with quick pitch drop + noise burst
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, startTime);
    osc.frequency.exponentialRampToValueAtTime(50, startTime + 0.1);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.6, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
    osc.connect(gain).connect(panNode);
    osc.start(startTime);
    osc.stop(startTime + dur);

    // noise component
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.3;
    noise.connect(noiseGain).connect(panNode);
    noise.start(startTime);
    return;
  }

  if (timbre === "whistle") {
    // High-pitched square-ish wave with slight vibrato
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 2000;
    const vibrato = ctx.createOscillator();
    vibrato.type = "sine";
    vibrato.frequency.value = 6;
    const vibGain = ctx.createGain();
    vibGain.gain.value = 30;
    vibrato.connect(vibGain).connect(osc.frequency);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.03);
    gain.gain.setValueAtTime(0.3, startTime + dur - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
    osc.connect(gain).connect(panNode);
    osc.start(startTime);
    vibrato.start(startTime);
    osc.stop(startTime + dur);
    vibrato.stop(startTime + dur);
    return;
  }

  // click — short noise burst
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const gain = ctx.createGain();
  gain.gain.value = 0.5;
  noise.connect(gain).connect(panNode);
  noise.start(startTime);
}

function playTone(
  ctx: AudioContext,
  freq: number,
  panNode: StereoPannerNode,
  startTime: number,
  durationMs: number,
): void {
  const dur = durationMs / 1000;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.4, startTime + 0.02);
  gain.gain.setValueAtTime(0.4, startTime + dur - 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
  osc.connect(gain).connect(panNode);
  osc.start(startTime);
  osc.stop(startTime + dur);
}

function playRhythm(
  ctx: AudioContext,
  beats: number,
  panNode: StereoPannerNode,
  startTime: number,
  totalDurationMs: number,
): void {
  const beatDur = Math.min(200, totalDurationMs / (beats * 2));
  const gap = (totalDurationMs - beats * beatDur) / Math.max(1, beats);
  for (let i = 0; i < beats; i++) {
    const t = startTime + (i * (beatDur + gap)) / 1000;
    playTone(ctx, 600, panNode, t, beatDur);
  }
}

/**
 * Play a sound fully panned to one channel.
 * pan = -1 → 100% left, pan = +1 → 100% right.
 */
function playSoundOnChannel(
  sound: SoundDef,
  pan: number,
  startTime: number,
  durationMs: number,
): void {
  const ctx = getCtx();
  const panNode = ctx.createStereoPanner();
  panNode.pan.value = pan;
  // Connect panNode to destination so it's always audible
  panNode.connect(ctx.destination);

  if (sound.kind === "tone" && sound.freq) {
    playTone(ctx, sound.freq, panNode, startTime, durationMs);
  } else if (sound.kind === "timbre" && sound.timbre) {
    playTimbre(ctx, sound.timbre, panNode, startTime, durationMs);
  } else if (sound.kind === "rhythm" && sound.beats) {
    playRhythm(ctx, sound.beats, panNode, startTime, durationMs);
  }
}

/**
 * Play a dicotic trial: leftSound in left channel, rightSound in right channel, simultaneously.
 */
export function playTrial(trial: Trial, durationMs: number): void {
  const ctx = getCtx();
  const now = ctx.currentTime + 0.1; // small delay for scheduling
  playSoundOnChannel(trial.leftSound, -1, now, durationMs);
  playSoundOnChannel(trial.rightSound, +1, now, durationMs);
}

/**
 * Play a single sound preview (used in "locate" question to replay the target).
 * pan = -1 left, +1 right, 0 center.
 */
export function playSingleSound(sound: SoundDef, pan: number, durationMs: number): void {
  const ctx = getCtx();
  const now = ctx.currentTime + 0.05;
  playSoundOnChannel(sound, pan, now, durationMs);
}

/**
 * Play a short stereo test tone to verify headphones are working.
 * Plays a tone in left then right channel.
 */
export function playHeadphoneTest(): void {
  const ctx = getCtx();
  const now = ctx.currentTime + 0.1;
  // Left channel
  const panL = ctx.createStereoPanner();
  panL.pan.value = -1;
  panL.connect(ctx.destination);
  playTone(ctx, 440, panL, now, 500);
  // Right channel
  const panR = ctx.createStereoPanner();
  panR.pan.value = 1;
  panR.connect(ctx.destination);
  playTone(ctx, 660, panR, now + 0.6, 500);
}
