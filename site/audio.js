import { midiToFrequency } from './pitch.js';

let context;
let pluckWave;

export async function getAudio() {
  const AudioContext = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContext) throw new Error('Web Audio is unavailable');
  if (!context) context = new AudioContext();
  if (context.state !== 'running') await context.resume();
  return context;
}

export async function playNotes(notes, spacing = 0) {
  const audio = await getAudio();
  pluckWave ??= audio.createPeriodicWave(
    new Float32Array(6),
    new Float32Array([0, 1, 0.35, 0.18, 0.09, 0.045]),
  );
  notes.forEach((note, index) => {
    const start = audio.currentTime + 0.015 + index * spacing;
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();
    oscillator.setPeriodicWave(pluckWave);
    oscillator.frequency.value = midiToFrequency(note);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(0.28 / Math.sqrt(notes.length), start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.92);
    oscillator.connect(envelope).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.94);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  });
}
