// Sonido sintetizado con Web Audio (sin archivos): efectos breves y una música suave opcional.
import { getProgress } from './store';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
      musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, t: number, dur: number, { type = 'sine' as OscillatorType, vol = 0.3, attack = 0.005, slide = 0, out = sfxGain } = {}) {
  const c = ctx!; const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out!); o.start(t); o.stop(t + dur + 0.05);
}

export type Sfx = 'tap' | 'select' | 'correct' | 'wrong' | 'place' | 'hint' | 'complete' | 'chest' | 'partial' | 'erase';

export function sfx(name: Sfx) {
  if (!getProgress().settings.sound) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime + 0.01;
  switch (name) {
    case 'tap': tone(880, t, 0.05, { type: 'triangle', vol: 0.08 }); break;
    case 'select': tone(660, t, 0.07, { type: 'triangle', vol: 0.14 }); tone(990, t + 0.03, 0.06, { type: 'sine', vol: 0.08 }); break;
    case 'erase': tone(500, t, 0.09, { type: 'triangle', vol: 0.12, slide: 0.6 }); break;
    case 'place': tone(784, t, 0.12, { type: 'triangle', vol: 0.18 }); tone(1568, t, 0.08, { vol: 0.06 }); break;
    case 'hint': [880, 1175].forEach((f, i) => tone(f, t + i * 0.08, 0.25, { vol: 0.12 })); break;
    case 'partial': [660, 880].forEach((f, i) => tone(f, t + i * 0.09, 0.18, { type: 'triangle', vol: 0.14 })); break;
    case 'correct': [784, 988, 1319].forEach((f, i) => tone(f, t + i * 0.075, 0.28, { type: 'triangle', vol: 0.2 })); tone(2637, t + 0.22, 0.25, { vol: 0.05 }); break;
    case 'wrong': tone(220, t, 0.22, { type: 'square', vol: 0.07, slide: 0.7 }); tone(165, t + 0.1, 0.25, { type: 'triangle', vol: 0.14, slide: 0.8 }); break;
    case 'complete': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, t + i * 0.1, i === 5 ? 0.6 : 0.2, { type: 'triangle', vol: 0.2 })); break;
    case 'chest': [1319, 1568, 2093, 2637].forEach((f, i) => tone(f, t + i * 0.06, 0.3, { vol: 0.1 })); break;
  }
  try { if (name === 'wrong') navigator.vibrate?.([30, 40, 30]); else if (name === 'correct' || name === 'complete') navigator.vibrate?.(18); } catch { /* sin vibración */ }
}

// ---- Música: bucle generativo tranquilo (pentatónica, ~80 bpm) ----
let musicTimer: number | undefined;
let nextT = 0, step = 0;
const CHORDS = [[261.6, 329.6, 392.0], [220.0, 261.6, 329.6], [174.6, 220.0, 261.6], [196.0, 246.9, 293.7]];
const MELODY = [523.3, 587.3, 659.3, 784.0, 880.0];
export function setMusic(on: boolean) {
  const c = ac(); if (!c || !musicGain) return;
  musicGain.gain.cancelScheduledValues(c.currentTime);
  musicGain.gain.linearRampToValueAtTime(on ? 0.35 : 0, c.currentTime + 0.8);
  if (on && musicTimer === undefined) {
    nextT = c.currentTime + 0.1; step = 0;
    musicTimer = window.setInterval(() => {
      const cc = ctx!; const beat = 60 / 80 / 2;
      while (nextT < cc.currentTime + 0.4) {
        const bar = Math.floor(step / 8) % 4, k = step % 8;
        if (k === 0) CHORDS[bar].forEach(f => tone(f / 2, nextT, beat * 8, { type: 'sine', vol: 0.07, attack: 0.4, out: musicGain }));
        if (k % 2 === 0) tone(CHORDS[bar][(k / 2) % 3], nextT, beat * 1.6, { type: 'triangle', vol: 0.05, out: musicGain });
        if ((step * 7) % 5 === 1) tone(MELODY[(step * 3) % MELODY.length], nextT, beat * 2.5, { type: 'sine', vol: 0.035, attack: 0.03, out: musicGain });
        nextT += beat; step++;
      }
    }, 120);
  } else if (!on && musicTimer !== undefined) {
    const t = musicTimer; musicTimer = undefined;
    window.setTimeout(() => window.clearInterval(t), 900);
  }
}

/** Activa el audio con el primer gesto (los navegadores lo exigen) y aplica la preferencia de música. */
export function initAudio() {
  const start = () => { ac(); if (getProgress().settings.music) setMusic(true); };
  window.addEventListener('pointerdown', start, { once: true });
  window.addEventListener('keydown', start, { once: true });
  document.addEventListener('pointerdown', e => {
    const b = (e.target as HTMLElement).closest('button');
    if (b && !b.closest('.board-wrap') && !b.closest('.pad') && !b.disabled) sfx('tap');
  });
}
