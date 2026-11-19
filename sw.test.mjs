import { expect, test } from 'bun:test';

let fetchHandler;
let installHandler;
let networkCalls = 0;
let skipWaitingCalls = 0;

globalThis.self = {
  location: { origin: 'https://beans.test', href: 'https://beans.test/beans/sw.js' },
  addEventListener(type, handler) {
    if (type === 'fetch') fetchHandler = handler;
    if (type === 'install') installHandler = handler;
  },
  skipWaiting() { skipWaitingCalls++; },
};
globalThis.fetch = async () => {
  networkCalls++;
  throw new Error('offline');
};

await import('./sw.js');

async function dispatch(request) {
  let response;
  fetchHandler({ request, respondWith(value) { response = value; } });
  return response;
}

test('updates pre-cache fresh files instead of reusing stale browser HTTP cache entries', async () => {
  let requests;
  globalThis.caches = { open: async () => ({ addAll: async (entries) => { requests = entries; } }) };
  const before = skipWaitingCalls;
  let completion;
  installHandler({ waitUntil(value) { completion = value; } });
  await completion;

  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((request) => request.cache === 'reload')).toBe(true);
  expect(requests.map((request) => request.url)).toContain('https://beans.test/beans/spellcaster-bee/game.mjs');
  expect(skipWaitingCalls).toBe(before + 1);
});

test('does not activate an update when a fresh app-shell download fails', async () => {
  globalThis.caches = { open: async () => ({ addAll: async () => { throw new Error('offline'); } }) };
  const before = skipWaitingCalls;
  let completion;
  installHandler({ waitUntil(value) { completion = value; } });

  await expect(completion).rejects.toThrow('offline');
  expect(skipWaitingCalls).toBe(before);
});

test('serves a cached module without mixing in a newer network version', async () => {
  globalThis.caches = { match: async () => new Response('cached module') };
  const response = await dispatch(new Request('https://beans.test/king-of-the-jungle/logic.mjs'));

  expect(await response.text()).toBe('cached module');
  expect(networkCalls).toBe(0);
});

test('does not return the app HTML when an uncached module fails', async () => {
  globalThis.caches = { match: async () => undefined };
  const response = await dispatch(new Request('https://beans.test/king-of-the-jungle/logic.mjs'));

  expect(response.type).toBe('error');
});
