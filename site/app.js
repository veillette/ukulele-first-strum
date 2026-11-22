import { getAudio, playNotes } from './audio.js';
import { chords, songs, strings } from './content.js';
import { centsFromTarget, detectPitch, midiToFrequency, tuningState } from './pitch.js';

const byId = (id) => document.getElementById(id);
const sections = ['start', 'tune', 'chords', 'songs'];
const navLinks = document.querySelectorAll('nav a');
const progressKey = 'ukulele-starter:lessons';
const lessons = Array.from(document.querySelectorAll('[data-lesson]'));

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

function initLessons() {
  const progress = byId('lesson-progress');
  function update() {
    const complete = lessons.filter((lesson) => lesson.checked);
    setText(progress, `${complete.length} of ${lessons.length} complete`);
  }
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey) ?? '[]');
    for (const lesson of lessons) lesson.checked = Array.isArray(saved) && saved.includes(lesson.dataset.lesson);
  } catch {
    // The checklist remains available during this visit.
  }
  for (const lesson of lessons) {
    lesson.addEventListener('change', () => {
      update();
      try {
        localStorage.setItem(progressKey, JSON.stringify(lessons.filter((item) => item.checked).map((item) => item.dataset.lesson)));
      } catch {
        // Storage can be disabled or full.
      }
    });
  }
  update();
}

const mic = byId('mic');
const micStatus = byId('mic-status');
const needle = byId('meter-needle');
const reading = byId('pitch-reading');
const pitchStatus = byId('pitch-status');
const toneStatus = byId('tuner-audio-status');
let stringIndex = 0;
let micSession;
let referenceEnds = 0;

const stringButtons = strings.map(({ name, octave, midi }, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  const label = document.createElement('span');
  label.textContent = name + octave;
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
  needle.hidden = true;
  setText(reading, message);
  setText(pitchStatus, message);
}

function stopMic(message = 'Microphone is off.') {
  if (!micSession) return;
  const session = micSession;
  micSession = undefined;
  clearInterval(session.timer);
  session.input?.disconnect();
  session.stream?.getTracks().forEach((track) => track.stop());
  setText(mic, 'Start microphone');
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
      if (!session.lastPitch || performance.now() - session.lastPitch > 400) {
        resetReading('Pluck the selected string.');
      }
      return;
    }
    session.lastPitch = performance.now();
    const target = midiToFrequency(strings[stringIndex].midi);
    const cents = centsFromTarget(frequency, target);
    const state = tuningState(cents);
    if (Math.abs(cents) <= 350) {
      needle.style.setProperty('--needle', `${50 + Math.max(-50, Math.min(50, cents))}%`);
      needle.hidden = false;
    } else {
      needle.hidden = true;
    }
    const signedCents = Math.round(cents);
    const offset = signedCents > 0 ? `+${signedCents}` : String(signedCents);
    setText(reading, `${state} · ${offset} cents`);
    setText(pitchStatus, state);
  }, 100);
}

async function startMic() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setText(micStatus, 'This browser can’t access the microphone here. Play a reference note to tune by ear.');
    return;
  }
  const session = {};
  micSession = session;
  setText(mic, 'Cancel microphone');
  setText(micStatus, 'Waiting for microphone permission.');
  try {
    const audio = await getAudio();
    if (micSession !== session) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    if (micSession !== session) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    session.stream = stream;
    stream.getAudioTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        if (micSession === session) stopMic('Microphone disconnected. You can start it again or use a reference note.');
      }, { once: true });
    });
    const analyser = audio.createAnalyser();
    analyser.fftSize = 2048;
    session.input = audio.createMediaStreamSource(stream);
    session.input.connect(analyser);
    setText(mic, 'Stop microphone');
    setText(micStatus, 'Listening. Microphone audio stays on this device.');
    resetReading('Pluck the selected string.');
    watchPitch(session, analyser, audio.sampleRate);
  } catch (error) {
    if (micSession !== session) return;
    const reason = error.name === 'NotAllowedError' ? 'Microphone permission was denied.' : 'Microphone unavailable.';
    stopMic(`${reason} Play a reference note to tune by ear.`);
  }
}

mic.addEventListener('click', () => {
  if (micSession) stopMic();
  else void startMic();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopMic();
});
window.addEventListener('pagehide', () => stopMic());

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

function addPickers(group, entries) {
  const picker = byId(group === 'chords' ? 'chord-picker' : 'song-picker');
  return new Map(Object.entries(entries).map(([key, entry]) => {
    const link = document.createElement('a');
    link.href = `#${group}/${key}`;
    link.textContent = group === 'chords' ? key : entry.name;
    picker.append(link);
    return [key, link];
  }));
}

function markCurrent(links, selected) {
  for (const [key, link] of links) {
    if (key === selected) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
}

function chordDiagram(shape) {
  const positions = [60, 100, 140, 180];
  const stringsMarkup = positions.map((x, i) => {
    const marker = shape[i];
    const y = marker && 64 + (marker[0] - 1) * 36;
    return `<text x="${x}" y="16" text-anchor="middle">${strings[i].name}</text>
      <path d="M${x} 46 V154" stroke="currentColor" stroke-width="1.5"/>
      ${marker
        ? `<circle cx="${x}" cy="${y}" r="12" class="dot"/>
           <text x="${x}" y="${y}" dy=".35em" text-anchor="middle" class="finger">${marker[1]}</text>`
        : `<circle cx="${x}" cy="32" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>`}`;
  }).join('');
  return `<svg class="diagram" viewBox="0 0 240 168" aria-hidden="true">
    <path d="M60 46 H180" stroke="currentColor" stroke-width="4"/>
    <path d="M60 82 H180 M60 118 H180 M60 154 H180" stroke="currentColor" stroke-width="1.5"/>
    <g font-size="13" text-anchor="middle"><text x="39" y="69">1</text><text x="39" y="105">2</text><text x="39" y="141">3</text></g>
    ${stringsMarkup}
  </svg>`;
}

const fingers = ['index', 'middle', 'ring', 'pinky'];
const chordLinks = addPickers('chords', chords);
const songLinks = addPickers('songs', songs);

function renderChord(key) {
  const { name, shape, tip } = chords[key];
  const rows = shape.map((mark, index) => {
    const position = mark ? `fret ${mark[0]}, ${fingers[mark[1] - 1]} finger` : 'open string';
    return `<li><strong>${strings[index].name}</strong> · ${position}</li>`;
  }).join('');
  const detail = byId('chord-detail');
  detail.innerHTML = `${chordDiagram(shape)}
    <div>
      <h2>${name}</h2>
      <p>Open circles mean open strings. The numbers inside filled circles tell you which fingers to use.</p>
      <ul class="fingering-list">${rows}</ul>
      <p>${tip}</p>
      <div class="actions" style="margin-top: 1rem"><button type="button" class="button primary">Hear ${key}</button></div>
      <p class="notice" role="status" hidden></p>
    </div>`;
  detail.querySelector('button').addEventListener('click', async () => {
    const status = detail.querySelector('.notice');
    status.hidden = true;
    try {
      await playNotes(strings.map(({ midi }, index) => midi + (shape[index]?.[0] ?? 0)), 0.055);
    } catch {
      setText(status, 'Chord audio is unavailable in this browser.');
      status.hidden = false;
    }
  });
  markCurrent(chordLinks, key);
}

function renderSong(key) {
  const { name, beats, intro, next, measures } = songs[key];
  const chart = measures.map(([chord, text]) => `<li class="measure">
    <a href="#chords/${chord}" aria-label="See ${chord} fingering">${chord}</a>
    <p>${text}</p><small>Beats ${beats}</small>
  </li>`).join('');
  byId('song-detail').innerHTML = `<h2>${name}</h2><p>${intro}</p>
    <ol class="song-grid" role="list" aria-label="Song measures">${chart}</ol>
    <p>${next}</p>`;
  markCurrent(songLinks, key);
}

let currentSection = 'start';

function route({ focus = true } = {}) {
  const [hash, key] = location.hash.slice(1).split('/');
  if (hash === 'main') return;
  const section = sections.includes(hash) ? hash : 'start';
  const changed = section !== currentSection;
  currentSection = section;
  if (section !== 'tune') stopMic();
  if (section === 'chords') renderChord(chordLinks.has(key) ? key : 'C');
  if (section === 'songs') renderSong(songLinks.has(key) ? key : 'first-changes');
  sections.forEach((id) => { byId(id).hidden = id !== section; });
  navLinks.forEach((link) => {
    if (link.hash === `#${section}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (focus && changed) {
    byId(`${section}-title`).focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

function setupInstall() {
  let prompt;
  const installButton = byId('install-button');
  const status = byId('offline-status');
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    prompt = event;
    installButton.hidden = false;
  });
  installButton.addEventListener('click', async () => {
    const available = prompt;
    prompt = undefined;
    installButton.hidden = true;
    try {
      await available?.prompt();
    } catch {
      setText(status, 'Use your browser’s install option to add this app.');
    }
  });
  window.addEventListener('appinstalled', () => {
    prompt = undefined;
    installButton.hidden = true;
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(async () => {
      await navigator.serviceWorker.ready;
      setText(status, 'Ready for offline practice on this device.');
    }).catch(() => {
      setText(status, 'Offline practice is unavailable here.');
    });
  } else {
    setText(status, 'Offline practice is unavailable here.');
  }
}

initLessons();
selectString(0);
route({ focus: false });
window.addEventListener('hashchange', () => route());
setupInstall();
