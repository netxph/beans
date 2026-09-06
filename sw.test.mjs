import { expect, test } from 'bun:test';

let fetchHandler;
let networkCalls = 0;

globalThis.self = {
  location: { origin: 'https://beans.test' },
  addEventListener(type, handler) {
    if (type === 'fetch') fetchHandler = handler;
  },
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
