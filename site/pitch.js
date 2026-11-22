export function midiToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

export function centsFromTarget(frequency, target) {
  return 1200 * Math.log2(frequency / target);
}

// YIN compares the waveform against delayed copies and looks for the first
// clear period. Searching beyond the ukulele's range lets the UI flag a wrong note.
export function detectPitch(samples, sampleRate) {
  const stride = Math.max(1, Math.floor(sampleRate / 12000));
  const recording = new Float32Array(Math.floor(samples.length / stride));
  let mean = 0;
  for (let i = 0; i < recording.length; i++) {
    const offset = i * stride;
    let sum = 0;
    for (let j = 0; j < stride; j++) sum += samples[offset + j];
    recording[i] = sum / stride;
    mean += recording[i];
  }
  mean /= recording.length;
  let energy = 0;
  for (const sample of recording) energy += (sample - mean) ** 2;
  if (!recording.length || Math.sqrt(energy / recording.length) < 0.007) return null;

  const rate = sampleRate / stride;
  const minLag = Math.max(2, Math.floor(rate / 1100));
  const maxLag = Math.ceil(rate / 120);
  const window = recording.length - maxLag - 1;
  if (window < maxLag) return null;

  const difference = new Float32Array(maxLag + 2);
  let cumulative = 0;
  for (let lag = 1; lag < difference.length; lag++) {
    let sum = 0;
    for (let i = 0; i < window; i++) {
      const delta = recording[i] - recording[i + lag];
      sum += delta * delta;
    }
    cumulative += sum;
    difference[lag] = cumulative ? sum * lag / cumulative : 1;
  }
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (difference[lag] >= 0.15) continue;
    while (lag < maxLag && difference[lag + 1] < difference[lag]) lag++;
    const left = difference[lag - 1];
    const center = difference[lag];
    const right = difference[lag + 1];
    const curvature = left - 2 * center + right;
    const refinement = curvature ? (left - right) / (2 * curvature) : 0;
    return rate / (lag + Math.max(-0.5, Math.min(0.5, refinement)));
  }
  return null;
}

export function tuningState(cents) {
  if (Math.abs(cents) > 350) return 'Check the selected string';
  if (cents < -5) return 'Flat';
  if (cents > 5) return 'Sharp';
  return 'In tune';
}
