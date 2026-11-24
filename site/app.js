import { playNotes } from './audio.js';
import { chords, songs, strings } from './content.js';
import { createTuner } from './tuner.js';
import { store } from './storage.js';

const byId = (id) => document.getElementById(id);
const sections = ['start', 'tune', 'chords', 'songs'];
const navLinks = document.querySelectorAll('.nav-link');
const progressKey = 'ukulele-starter:lessons';
const lessons = Array.from(document.querySelectorAll('[data-lesson]'));

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

function initLessons() {
  const progress = byId('lesson-progress');
  const meter = byId('lesson-meter');
  meter.max = lessons.length;
  function update() {
    const complete = lessons.filter((lesson) => lesson.checked);
    meter.value = complete.length;
    setText(progress, `${complete.length} of ${lessons.length} complete`);
  }
  const saved = store.get(progressKey, []);
  for (const lesson of lessons) {
    lesson.checked = Array.isArray(saved) && saved.includes(lesson.dataset.lesson);
    lesson.addEventListener('change', () => {
      update();
      store.set(progressKey, lessons.filter((item) => item.checked).map((item) => item.dataset.lesson));
    });
  }
  update();
}

function icon(name) {
  return `<svg class="icon" aria-hidden="true"><use href="./icons/interface.svg#${name}"></use></svg>`;
}

function addPickerLinks(picker, group, choices) {
  return new Map(choices.map(([key, label]) => {
    const link = document.createElement('a');
    link.href = `#${group}/${key}`;
    link.textContent = label;
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
  const fretCount = Math.max(3, ...shape.map((mark) => mark?.[0] ?? 0));
  const gridBottom = 46 + fretCount * 36;
  const fretsMarkup = Array.from({ length: fretCount }, (_, index) => {
    const y = 82 + index * 36;
    return `<path d="M60 ${y} H180" stroke="currentColor" stroke-width="1.5"/>
      <text x="39" y="${y - 13}" font-size="16" text-anchor="middle">${index + 1}</text>`;
  }).join('');
  const stringsMarkup = positions.map((x, i) => {
    const marker = shape[i];
    const y = marker && 64 + (marker[0] - 1) * 36;
    return `<text x="${x}" y="18" font-size="17" text-anchor="middle">${strings[i].name}</text>
      <path d="M${x} 46 V${gridBottom}" stroke="currentColor" stroke-width="1.5"/>
      ${marker
        ? `<circle cx="${x}" cy="${y}" r="13" class="dot"/>
           <text x="${x}" y="${y}" dy=".35em" text-anchor="middle" class="finger">${marker[1]}</text>`
        : `<circle cx="${x}" cy="32" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>`}`;
  }).join('');
  return `<svg class="diagram" viewBox="22 0 180 ${gridBottom + 14}" aria-hidden="true">
    <path d="M60 46 H180" stroke="currentColor" stroke-width="4"/>
    ${fretsMarkup}
    ${stringsMarkup}
  </svg>`;
}

const fingers = ['index', 'middle', 'ring', 'pinky'];
function addRouteSelect(select, section, options) {
  for (const [key, label] of options) select.add(new Option(label, key));
  select.addEventListener('change', () => {
    location.hash = `${section}/${select.value}`;
  });
  return select;
}

const chordLinks = addPickerLinks(byId('chord-picker'), 'chords', ['C', 'Am', 'F', 'G7'].map((key) => [key, key]));
const chordSelect = addRouteSelect(byId('chord-select'), 'chords',
  Object.entries(chords).map(([key, { name }]) => [key, `${key} · ${name}`]));
const songSelect = addRouteSelect(byId('song-select'), 'songs',
  Object.entries(songs).map(([key, { name }]) => [key, name]));

function renderChord(key) {
  const { name, shape, tip } = chords[key];
  const rows = shape.map((mark, index) => {
    const position = mark ? `fret ${mark[0]}, ${fingers[mark[1] - 1]} finger` : 'open string';
    return `<li><strong>${strings[index].name}</strong> · ${position}</li>`;
  }).join('');
  const detail = byId('chord-detail');
  detail.innerHTML = `<h2>${name}</h2>
    <div class="chord-figure">${chordDiagram(shape)}</div>
    <div class="fingering">
      <ul class="fingering-list">${rows}</ul>
      <p class="diagram-key">Open circles mark open strings. Numbers show which fingers to use.</p>
    </div>
    <div class="chord-practice">
      <button type="button" class="button primary">${icon('listen')} Hear ${key}</button>
      <p>${tip}</p>
      <p class="notice" role="status" hidden></p>
      <button type="button" class="button secondary" data-copy-link="#chords/${key}">Copy chord link</button><span class="copy-status" role="status"></span>
    </div>`;
  detail.querySelector('.primary').addEventListener('click', async () => {
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
  chordSelect.value = key;
}

function renderSong(key) {
  const { name, beats, intro, next, measures } = songs[key];
  const chart = measures.map(([chord, text]) => `<li class="measure">
    <a href="#chords/${chord}" aria-label="See ${chord} fingering">${chord}</a>
    <div><p>${text}</p><small>Beats ${beats}</small></div>
  </li>`).join('');
  byId('song-detail').innerHTML = `<h2>${name}</h2><p>${intro}</p>
    <ol class="song-grid" role="list" aria-label="Song measures">${chart}</ol>
    <p>${next}</p>
    <button type="button" class="button secondary" data-copy-link="#songs/${key}">Copy song link</button><span class="copy-status" role="status"></span>`;
  songSelect.value = key;
}

const tuner = createTuner(byId('tune'));
let currentSection = 'start';

function route({ focus = true } = {}) {
  const [hash, key] = location.hash.slice(1).split('/');
  if (hash === 'main') return;
  const section = sections.includes(hash) ? hash : 'start';
  const changed = section !== currentSection;
  currentSection = section;
  if (section !== 'tune') tuner.stop();
  if (section === 'chords') renderChord(Object.hasOwn(chords, key) ? key : 'C');
  if (section === 'songs') renderSong(Object.hasOwn(songs, key) ? key : 'first-changes');
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
route({ focus: false });
window.addEventListener('hashchange', () => route());
setupInstall();
