/** Short synthesized chime. Called from a gesture to comply with WebView autoplay rules. */
export async function playStartupSound(volume: number): Promise<void> {
  if (volume <= 0) return;
  const context = new AudioContext();
  try {
    await context.resume();
    const start = context.currentTime;
    const level = Math.min(100, Math.max(0, volume)) / 100 * 0.12;
    for (const [index, frequency] of [523.25, 659.25, 783.99].entries()) {
      const oscillator = context.createOscillator(); const gain = context.createGain();
      const time = start + index * 0.13;
      oscillator.type = 'triangle'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(level, time + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(time); oscillator.stop(time + 0.25);
    }
    await new Promise<void>(resolve => window.setTimeout(resolve, 650));
  } finally { await context.close(); }
}
