/**
 * Tiny Web Audio synth for SFX. No assets — generated on the fly.
 * Calls are no-ops if user hasn't interacted yet (browser autoplay policy).
 */

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) return null;
    try { ctx = new Ctor(); } catch { return null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(v: boolean) { muted = v; }
export function isMuted() { return muted; }

interface ToneOpts {
  freq: number;
  duration: number;          // seconds
  type?: OscillatorType;
  gain?: number;             // peak 0..1
  freqEnd?: number;          // glide
  attack?: number;
  release?: number;
}

function tone({ freq, duration, type = 'sine', gain = 0.18, freqEnd, attack = 0.005, release = 0.05 }: ToneOpts) {
  const c = getCtx();
  if (!c || muted) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + duration);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.linearRampToValueAtTime(gain, t0 + duration - release);
  g.gain.linearRampToValueAtTime(0, t0 + duration);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noiseBurst(duration: number, gain = 0.12, hp = 800) {
  const c = getCtx();
  if (!c || muted) return;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = hp;
  const g = c.createGain();
  const t0 = c.currentTime;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  src.connect(filt).connect(g).connect(c.destination);
  src.start();
  src.stop(t0 + duration);
}

export const SFX = {
  coin: (combo = 1) => {
    // Bright bell, pitch climbs slightly with combo
    const base = 880 + Math.min(combo - 1, 8) * 60;
    tone({ freq: base, freqEnd: base * 1.5, duration: 0.12, type: 'triangle', gain: 0.16 });
    tone({ freq: base * 2, duration: 0.1, type: 'sine', gain: 0.08 });
  },
  bigCoin: () => {
    // 500/1000 naira chime
    tone({ freq: 660, freqEnd: 990, duration: 0.18, type: 'triangle', gain: 0.18 });
    tone({ freq: 1320, duration: 0.15, type: 'sine', gain: 0.1 });
  },
  jump: () => {
    tone({ freq: 320, freqEnd: 540, duration: 0.14, type: 'square', gain: 0.1 });
  },
  slide: () => {
    noiseBurst(0.18, 0.08, 600);
  },
  laneSwitch: () => {
    tone({ freq: 480, duration: 0.05, type: 'sine', gain: 0.06 });
  },
  shieldHit: () => {
    tone({ freq: 220, freqEnd: 880, duration: 0.18, type: 'sawtooth', gain: 0.14 });
    tone({ freq: 440, duration: 0.18, type: 'sine', gain: 0.08 });
  },
  powerup: () => {
    tone({ freq: 523, duration: 0.08, type: 'square', gain: 0.12 });
    setTimeout(() => tone({ freq: 659, duration: 0.08, type: 'square', gain: 0.12 }), 70);
    setTimeout(() => tone({ freq: 784, duration: 0.12, type: 'square', gain: 0.12 }), 140);
  },
  crash: () => {
    noiseBurst(0.5, 0.25, 200);
    tone({ freq: 110, freqEnd: 40, duration: 0.6, type: 'sawtooth', gain: 0.2 });
  },
  gameOver: () => {
    tone({ freq: 392, duration: 0.18, type: 'triangle', gain: 0.14 });
    setTimeout(() => tone({ freq: 311, duration: 0.18, type: 'triangle', gain: 0.14 }), 180);
    setTimeout(() => tone({ freq: 247, duration: 0.32, type: 'triangle', gain: 0.14 }), 360);
  },
  uiTap: () => {
    tone({ freq: 1200, duration: 0.04, type: 'square', gain: 0.06 });
  },
};
