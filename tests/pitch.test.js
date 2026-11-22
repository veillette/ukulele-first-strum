import assert from 'node:assert/strict';
import test from 'node:test';
import { strings } from '../site/content.js';
import { centsFromTarget, detectPitch, midiToFrequency, tuningState } from '../site/pitch.js';

function pluck(frequency, rate) {
  return Float32Array.from({ length: 2048 }, (_, i) => {
    const phase = 2 * Math.PI * frequency * i / rate + 0.2;
    return 0.2 * Math.exp(-i / 1800) * (Math.sin(phase) + 0.65 * Math.sin(2 * phase) + 0.25 * Math.sin(3 * phase));
  });
}

for (const rate of [44100, 48000]) {
  for (const { name, midi } of strings) {
    test(`tunes ${name} at ${rate} Hz sample rate`, () => {
      const target = midiToFrequency(midi);
      for (const [cents, expected] of [[-20, 'Flat'], [0, 'In tune'], [20, 'Sharp']]) {
        const sample = pluck(target * 2 ** (cents / 1200), rate);
        const detected = detectPitch(sample, rate);
        assert.ok(detected);
        const offset = centsFromTarget(detected, target);
        assert.ok(Math.abs(offset - cents) < 3, `Expected ${cents} cents, measured ${offset}`);
        assert.equal(tuningState(offset), expected);
      }
    });
  }
}

test('ignores silence and constant microphone offsets', () => {
  for (const value of [0, 0.03, -0.03]) {
    assert.equal(detectPitch(new Float32Array(2048).fill(value), 48000), null);
  }
});

test('flags a different string or octave', () => {
  for (const frequency of [220, 261.63, 880]) {
    const detected = detectPitch(pluck(frequency, 48000), 48000);
    assert.ok(detected);
    assert.equal(tuningState(centsFromTarget(detected, 440)), 'Check the selected string');
  }
});
