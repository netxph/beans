import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function setup(search = '') {
  let focused;
  const timers = [];
  const messages = [];
  const handlers = {};
  function element(classes = '') {
    const names = new Set(classes.split(' '));
    return {
      style: {}, listeners: {}, textContent: '',
      classList: { add: (name) => names.add(name), remove: (name) => names.delete(name), contains: (name) => names.has(name) },
      addEventListener(type, handler) { this.listeners[type] = handler; },
      focus() { focused = this; },
    };
  }
  const nodes = Object.fromEntries([...html.matchAll(/id="([^"]+)"(?: class="([^"]+)")?/g)]
    .map(([, id, classes]) => [id, element(classes)]));
  const cards = new Map();
  nodes.gamesGrid.querySelectorAll = () => [...nodes.gamesGrid.innerHTML.matchAll(/data-game-id="([^"]+)"/g)].map(([, id]) => {
    if (!cards.has(id)) cards.set(id, Object.assign(element(), { dataset: { gameId: id } }));
    return cards.get(id);
  });
  nodes.gamesGrid.querySelector = (selector) => cards.get(selector.match(/data-game-id="([^"]+)"/)[1]);
  nodes.gameFrame.contentWindow = { focus() {}, postMessage: (message) => messages.push(message) };
  const location = { search, origin: 'https://beans.test' };
  const context = createContext({
    document: { getElementById: (id) => nodes[id], documentElement: { style: { setProperty() {} } } },
    window: { innerHeight: 800, location, addEventListener: (type, handler) => { handlers[type] = handler; } },
    navigator: {}, location, URLSearchParams, console,
    history: { replaceState(_state, _unused, url) { location.search = new URL(url, location.origin).search; } },
    setTimeout: (handler) => timers.push(handler), clearTimeout() {},
  });
  runInContext(source, context);
  return { nodes, cards, timers, messages, handlers, location, focused: () => focused, run: (code) => runInContext(code, context) };
}

test('every game uses the shared title and back button without auto-hiding navigation', () => {
  const { nodes, cards, timers, location, focused, run } = setup();
  expect(cards.size).toBe(8);
  expect(html).not.toMatch(/top-trigger|nav-visible|showNav|hideNavSoon/);
  expect(html).toContain('aria-label="Back to game selection"');
  const headerCss = html.match(/\.player-top \{([^}]+)\}/)[1];
  expect(headerCss).toContain('flex-shrink: 0');
  expect(headerCss).not.toMatch(/position: absolute|transform:|opacity:|pointer-events:/);
  expect(html).toMatch(/iframe \{\s*flex: 1;\s*min-height: 0;/);
  for (const game of run('games')) {
    run(`openGame(${JSON.stringify(game.id)})`);
    expect(nodes.player.classList.contains('show')).toBe(true);
    expect(nodes.home.style.display).toBe('none');
    expect(nodes.playerTitle.textContent).toBe(game.title);
    expect(nodes.gameFrame.title).toBe(game.title);
    expect(nodes.gameFrame.src).toBe(game.src);
    while (timers.length) timers.shift()();
    expect(nodes.player.classList.contains('show')).toBe(true);
    nodes.backBtn.listeners.click();
    expect(nodes.player.classList.contains('show')).toBe(false);
    expect(nodes.home.style.display).toBe('');
    expect(nodes.gameFrame.src).toBe('about:blank');
    expect(location.search).toBe('');
    expect(focused()).toBe(cards.get(game.id));
  }
});

test('deep links show the game title and keyboard activation of Back is not intercepted', () => {
  const { nodes, handlers, messages } = setup('?game=mully');
  expect(nodes.playerTitle.textContent).toBe('Mully');
  expect(nodes.player.classList.contains('show')).toBe(true);
  let prevented = false;
  handlers.keydown({ key: 'Enter', code: 'Enter', target: { closest: () => nodes.backBtn }, preventDefault() { prevented = true; } });
  expect(prevented).toBe(false);
  expect(messages).toHaveLength(0);
  handlers.keydown({ key: '1', code: 'Digit1', target: { closest: () => null }, preventDefault() { prevented = true; } });
  expect(prevented).toBe(true);
  expect(messages[0].key).toBe('1');
  nodes.backBtn.listeners.click();
  expect(nodes.player.classList.contains('show')).toBe(false);
});
