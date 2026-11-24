import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const template = await readFile(new URL('../scripts/sw.js', import.meta.url), 'utf8');
const scope = 'https://veillette.github.io/ukulele-first-strum/';
const prefix = `ukulele-starter:${scope}:`;
const assets = ['index.html', 'styles.css', 'app.js', 'icons/ukulele-192.png'];

test('caches the app under the Pages subpath and retires only its own old revisions', async () => {
  const listeners = new Map();
  const cacheEntries = new Map([
    [`${prefix}old`, new Map()],
    ['another-app', new Map()],
  ]);
  let claimed = false;
  const store = {
    keys: async () => [...cacheEntries.keys()],
    delete: async (name) => cacheEntries.delete(name),
    open: async (name) => {
      if (!cacheEntries.has(name)) cacheEntries.set(name, new Map());
      const cache = cacheEntries.get(name);
      return {
        addAll: async (requests) => {
          for (const request of requests) {
            assert.equal(request.cache, 'reload');
            cache.set(request.url, new Response(request.url));
          }
        },
        match: async (key) => cache.get(key)?.clone(),
      };
    },
  };

  runInNewContext(template
    .replace('/* BUILD_FILES */ []', JSON.stringify(assets))
    .replace('__BUILD_VERSION__', 'new'), {
    self: {
      registration: { scope },
      location: new URL('sw.js', scope),
      addEventListener: (type, listener) => listeners.set(type, listener),
      clients: { claim: async () => { claimed = true; } },
    },
    URL,
    Request,
    caches: store,
    fetch: () => assert.fail('Unexpected network request'),
  });

  async function fire(type) {
    let done;
    listeners.get(type)({ waitUntil: (promise) => { done = promise; } });
    assert.ok(done);
    await done;
  }

  await fire('install');
  assert.deepEqual([...cacheEntries.get(`${prefix}new`).keys()], assets.map((file) => scope + file));
  assert.ok(cacheEntries.has(`${prefix}old`), 'The old cache is kept until activation');
  await fire('activate');
  assert.equal(claimed, true);
  assert.deepEqual([...cacheEntries.keys()], ['another-app', `${prefix}new`]);

  function request(url, mode = 'cors') {
    let response;
    listeners.get('fetch')({
      request: { method: 'GET', url, mode },
      respondWith: (promise) => { response = promise; },
    });
    return response;
  }

  assert.equal(await (await request(`${scope}?source=install`, 'navigate')).text(), scope + 'index.html');
  assert.equal(await (await request(scope + 'app.js')).text(), scope + 'app.js');
  assert.equal(request('https://veillette.github.io/another-app/', 'navigate'), undefined);
  assert.equal(request(scope + 'missing.js'), undefined);
});
