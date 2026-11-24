import { getAudio, playNotes } from './audio.js';
import { strings } from './content.js';
import { centsFromTarget, detectPitch, midiToFrequency, tuningState } from './pitch.js';

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

export function createTuner(section) {
  const document = section.ownerDocument;
  const view = document.defaultView;
  const byId = (id) => section.querySelector('#' + id);

  const mic = byId('mic');
  const micLabel = mic.querySelector('span');
  const micStatus = byId('mic-status');
  const tunerDisplay = byId('tuning-display');
  const needle = byId('meter-needle');
  const reading = byId('pitch-reading');
  const pitchOffset = byId('pitch-offset');
  const pitchStatus = byId('pitch-status');
  const toneStatus = byId('tuner-audio-status');
  const meterLimit = 50;
  const tuningFeedback = {
    Flat: { state: 'flat', message: 'Flat · Tighten slightly' },
    'In tune': { state: 'in-tune', message: 'In tune ✓', announcement: 'In tune.' },
    Sharp: { state: 'sharp', message: 'Sharp · Loosen slightly' },
  };
  let stringIndex = 0;
  let micSession;
  let referenceEnds = 0;

  const stringButtons = strings.map(({ name, octave, midi }, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    const label = document.createElement('span');
    label.textContent = name;
    button.setAttribute('aria-label', `${name}${octave}, ${Math.round(midiToFrequency(midi))} hertz`);
    const frequency = document.createElement('small');
    frequency.textContent = `${Math.round(midiToFrequency(midi))} Hz`;
    button.append(label, frequency);
    button.addEventListener('click', () => selectString(index));
    byId('string-buttons').append(button);
    return button;
  });

  function selectString(index) {
    stringIndex = index;
    const { name, octave, midi } = strings[index];
    stringButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    setText(byId('tuning-target'), `Target ${name}${octave} · ${midiToFrequency(midi).toFixed(2)} Hz`);
    resetReading(micSession?.stream ? 'Pluck the selected string.' : 'Choose how you’d like to tune.');
  }

  function resetReading(message) {
    delete tunerDisplay.dataset.state;
    needle.hidden = true;
    pitchOffset.hidden = true;
    setText(reading, message);
    setText(pitchStatus, message);
  }

  function showPitch(cents) {
    const state = tuningState(cents);
    const feedback = tuningFeedback[state];
    if (!feedback) {
      resetReading(state);
      return;
    }

    const position = Math.max(-meterLimit, Math.min(meterLimit, cents));
    needle.style.setProperty('--needle', `${50 + 50 * position / meterLimit}%`);
    needle.hidden = false;
    tunerDisplay.dataset.state = feedback.state;

    const rounded = Math.round(cents);
    const offset = rounded > 0 ? `+${rounded}` : rounded < 0 ? `−${Math.abs(rounded)}` : '0';
    setText(pitchOffset, `${offset} cents`);
    pitchOffset.hidden = false;
    setText(reading, feedback.message);
    setText(pitchStatus, feedback.announcement ?? feedback.message);
  }

  function stop(message = 'Microphone is off.') {
    if (!micSession) return;
    const session = micSession;
    micSession = undefined;
    clearInterval(session.timer);
    session.input?.disconnect();
    session.stream?.getTracks().forEach((track) => track.stop());
    setText(micLabel, 'Start microphone');
    setText(micStatus, message);
    resetReading('Choose how you’d like to tune.');
  }

  function watchPitch(session, analyser, rate) {
    const buffer = new Float32Array(analyser.fftSize);
    session.timer = setInterval(() => {
      if (performance.now() < referenceEnds) return;
      analyser.getFloatTimeDomainData(buffer);
      const frequency = detectPitch(buffer, rate);
      if (frequency === null) {
        if (!session.lastPitch || performance.now() - session.lastPitch > 800) {
          resetReading('Pluck the selected string.');
        }
        return;
      }
      session.lastPitch = performance.now();
      const target = midiToFrequency(strings[stringIndex].midi);
      showPitch(centsFromTarget(frequency, target));
    }, 100);
  }

  async function start() {
    if (!view.navigator.mediaDevices?.getUserMedia) {
      setText(micStatus, 'This browser can’t access the microphone here. Play a reference note to tune by ear.');
      return;
    }
    const session = {};
    micSession = session;
    setText(micLabel, 'Cancel microphone');
    setText(micStatus, 'Waiting for microphone permission.');
    try {
      const audio = await getAudio();
      if (micSession !== session) return;
      const stream = await view.navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      if (micSession !== session) {
        // Navigation can cancel the session while the permission prompt is open.
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      session.stream = stream;
      stream.getAudioTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          if (micSession === session) stop('Microphone disconnected. You can start it again or use a reference note.');
        }, { once: true });
      });
      const analyser = audio.createAnalyser();
      analyser.fftSize = 2048;
      session.input = audio.createMediaStreamSource(stream);
      session.input.connect(analyser);
      setText(micLabel, 'Stop microphone');
      setText(micStatus, 'Listening. Microphone audio stays on this device.');
      resetReading('Pluck the selected string.');
      watchPitch(session, analyser, audio.sampleRate);
    } catch (error) {
      if (micSession !== session) return;
      const reason = error.name === 'NotAllowedError' ? 'Microphone permission was denied.' : 'Microphone unavailable.';
      stop(`${reason} Play a reference note to tune by ear.`);
    }
  }

  mic.addEventListener('click', () => {
    if (micSession) stop();
    else void start();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });
  view.addEventListener('pagehide', () => stop());

  byId('tone').addEventListener('click', async () => {
    toneStatus.hidden = true;
    try {
      await playNotes([strings[stringIndex].midi]);
      referenceEnds = performance.now() + 1000;
      if (micSession?.stream) resetReading('Listen to the reference note, then pluck.');
    } catch {
      setText(toneStatus, 'Reference audio is unavailable in this browser.');
      toneStatus.hidden = false;
    }
  });

  selectString(0);
  return { stop };
}
