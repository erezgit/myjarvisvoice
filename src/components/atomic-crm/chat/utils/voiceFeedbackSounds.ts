/**
 * Voice Input Feedback Sounds
 *
 * Plays audio feedback when microphone recording starts/stops.
 * Uses Web Audio API to generate sounds programmatically.
 */

/**
 * Play Start-3: Quick chime "bing-bong" E4→C4
 * Used when recording STARTS
 */
export function playStartSound(): void {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const t = audioContext.currentTime;

  // First tone - E4
  const osc1 = audioContext.createOscillator();
  const gain1 = audioContext.createGain();
  osc1.connect(gain1);
  gain1.connect(audioContext.destination);
  osc1.frequency.value = 330; // E4
  osc1.type = 'sine';
  gain1.gain.setValueAtTime(0.09, t);
  gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc1.start(t);
  osc1.stop(t + 0.06);

  // Second tone - C4
  const osc2 = audioContext.createOscillator();
  const gain2 = audioContext.createGain();
  osc2.connect(gain2);
  gain2.connect(audioContext.destination);
  osc2.frequency.value = 262; // C4
  osc2.type = 'sine';
  gain2.gain.setValueAtTime(0.09, t + 0.07);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
  osc2.start(t + 0.07);
  osc2.stop(t + 0.13);
}

/**
 * Play Stop-3: Trill + 2 descending rings
 * Used when recording STOPS
 */
export function playStopSound(): void {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const t = audioContext.currentTime;

  // Quick trill first
  const oscT = audioContext.createOscillator();
  const gainT = audioContext.createGain();
  const lfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();
  lfo.connect(lfoGain);
  lfoGain.connect(oscT.frequency);
  oscT.connect(gainT);
  gainT.connect(audioContext.destination);
  oscT.frequency.value = 200;
  lfo.frequency.value = 18;
  lfoGain.gain.value = 20;
  oscT.type = 'sine';
  gainT.gain.setValueAtTime(0.08, t);
  gainT.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
  lfo.start(t);
  oscT.start(t);
  lfo.stop(t + 0.055);
  oscT.stop(t + 0.055);

  // 2 descending rings
  for (let i = 0; i < 2; i++) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = 240 - i * 60;
    osc.type = 'sine';
    const startTime = t + 0.065 + i * 0.045;
    gain.gain.setValueAtTime(0.07, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.035);
    osc.start(startTime);
    osc.stop(startTime + 0.035);
  }
}
