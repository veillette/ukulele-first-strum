import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
  : 'playwright');

const base = 'http://localhost/ukulele-first-strum/';
const output = new URL('../../dist/', import.meta.url);

test('leaving the tuner stops a stream granted after navigation', async (t) => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route(base + '**', (route) => {
    const relativePath = new URL(route.request().url()).pathname.slice(new URL(base).pathname.length);
    return route.fulfill({ path: fileURLToPath(new URL(relativePath || 'index.html', output)) });
  });
  await context.addInitScript(() => {
    const microphone = { resolve: null, stoppedTracks: 0, inputAttempts: 0 };
    window.testMicrophone = microphone;
    navigator.mediaDevices.getUserMedia = () => new Promise((resolve) => { microphone.resolve = resolve; });
    const createInput = AudioContext.prototype.createMediaStreamSource;
    AudioContext.prototype.createMediaStreamSource = function (stream) {
      microphone.inputAttempts += 1;
      return createInput.call(this, stream);
    };
  });

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base + '#tune');
  await page.getByRole('button', { name: 'Start microphone' }).click();
  await page.waitForFunction(() => !!window.testMicrophone.resolve);
  assert.equal(await page.locator('#mic-status').textContent(), 'Waiting for microphone permission.');

  await page.locator('.nav-link[href="#chords"]').click();
  await page.locator('#chords').waitFor();
  assert.equal(await page.locator('#mic-status').textContent(), 'Microphone is off.');

  await page.evaluate(() => {
    const microphone = window.testMicrophone;
    const tracks = Array.from({ length: 2 }, () => Object.assign(new EventTarget(), {
      stop: () => { microphone.stoppedTracks += 1; },
    }));
    microphone.resolve({ getTracks: () => tracks, getAudioTracks: () => tracks });
  });

  await page.waitForFunction(() => window.testMicrophone.stoppedTracks === 2);
  assert.equal(await page.evaluate(() => window.testMicrophone.inputAttempts), 0);
  await page.locator('.nav-link[href="#tune"]').click();
  await page.getByRole('button', { name: 'Start microphone' }).waitFor();
  assert.equal(await page.locator('#mic-status').textContent(), 'Microphone is off.');
  assert.deepEqual(errors, []);
});
