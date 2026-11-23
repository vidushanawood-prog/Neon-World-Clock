let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function scheduleTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  peakGain: number,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.03);
}

/**
 * Plays a crisp, harmonic synthesized alarm chime using Web Audio API (no external audio files).
 */
export function playAlarmChime(): boolean {
  const ctx = getAudioContext();
  if (!ctx) return false;
  const t = ctx.currentTime + 0.02;

  // Gentle bright major triad arpeggio repeated twice (C5 -> E5 -> G5 -> C6)
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, idx) => {
    scheduleTone(ctx, freq, t + idx * 0.14, 0.55, 0.14, 'triangle');
    scheduleTone(ctx, freq * 2, t + idx * 0.14, 0.35, 0.035, 'sine');
  });

  // Second gentle phrase
  notes.forEach((freq, idx) => {
    scheduleTone(ctx, freq, t + 0.72 + idx * 0.14, 0.65, 0.12, 'triangle');
  });

  return true;
}

/**
 * Plays a warm two-tone horological hourly chime (G5 -> E5).
 */
export function playHourlyChime(): boolean {
  const ctx = getAudioContext();
  if (!ctx) return false;
  const t = ctx.currentTime + 0.02;

  scheduleTone(ctx, 783.99, t, 0.7, 0.11, 'sine');
  scheduleTone(ctx, 1567.98, t, 0.4, 0.025, 'sine');
  scheduleTone(ctx, 659.25, t + 0.28, 0.95, 0.13, 'sine');
  scheduleTone(ctx, 1318.51, t + 0.28, 0.5, 0.025, 'sine');

  return true;
}
