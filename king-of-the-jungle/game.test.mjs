import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import * as logic from './logic.mjs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('./game.mjs', import.meta.url), 'utf8').replace(/^import .*\n/, '');

// A small DOM stand-in keeps game-flow checks independent of browser dependencies.
function element(classes = '') {
  const classNames = new Set(classes.split(' '));
  return {
    textContent: '', dataset: {}, style: {}, children: [], listeners: {},
    lastElementChild: { textContent: '' },
    classList: {
      add: (name) => classNames.add(name), remove: (name) => classNames.delete(name),
      contains: (name) => classNames.has(name),
      toggle(name, active) { if (active) classNames.add(name); else classNames.delete(name); },
    },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    click() { this.listeners.click?.(); },
    focus() {},
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; this.firstElementChild = children[0]; },
  };
}

async function setup() {
  const nodes = Object.fromEntries([...html.matchAll(/id="([^"]+)"(?: class="([^"]+)")?/g)]
    .map(([, id, classes]) => [id, element(classes)]));
  const animals = [...html.matchAll(/name="animal" value="([^"]+)" data-emoji="([^"]+)"( checked)?/g)]
    .map(([, value, emoji, checked]) => Object.assign(element(), { value, dataset: { emoji }, checked: !!checked }));
  const arena = element();
  const context = createContext({
    ...logic,
    document: {
      getElementById: (id) => nodes[id], querySelector: () => arena,
      querySelectorAll: (selector) => selector === '.step' ? Array.from({ length: 4 }, () => element()) : animals,
      createElement: () => element(), addEventListener() {},
    },
    window: { addEventListener() {} }, setTimeout() {},
    fetch: async () => ({ ok: true, text: async () => readFileSync(new URL('./questions.yaml', import.meta.url), 'utf8') }),
  });
  runInContext(source, context);
  await runInContext('loadDatabase()', context);
  return { nodes, animals, run: (code) => runInContext(code, context) };
}

test('each animal appears in battle and wins the crown with the same health and damage', async () => {
  const { nodes, animals, run } = await setup();
  expect(animals.map((animal) => animal.value)).toEqual(['Lion', 'Tiger', 'Elephant', 'Gorilla']);
  expect(animals.find((animal) => animal.checked).value).toBe('Lion');
  for (const selected of animals) {
    animals.forEach((animal) => { animal.checked = animal === selected; });
    selected.listeners.change();
    expect(nodes.introAnimal.textContent).toBe(selected.dataset.emoji);
    nodes.startBtn.click();
    expect(nodes.playerSprite.textContent).toBe(selected.dataset.emoji);
    expect(nodes.playerName.textContent).toBe(`YOU · ${selected.value.toUpperCase()}`);
    expect(nodes.battleTitle.textContent).toContain(selected.dataset.emoji);
    expect(nodes.playerHpText.textContent).toBe('100/100');
    for (let level = 0; level < 4; level++) {
      for (let turn = 0; turn < 5; turn++) run('answer(game.current.answer); resolveTurn();');
      if (level < 3) nodes.continueBtn.click();
    }
    expect(nodes.ending.classList.contains('hidden')).toBe(false);
    expect(nodes.endingText.textContent).toContain(`Your ${selected.value.toLowerCase()} defeated all four challengers with 100 HP left.`);
    expect(nodes.endingEmoji.textContent).toBe(`${selected.dataset.emoji} 👑`);
    nodes.againBtn.click();
    expect(nodes.intro.classList.contains('hidden')).toBe(false);
    expect(nodes.battle.classList.contains('hidden')).toBe(true);
  }
});

test('a winning game reviews only wrong answers with their explanations', async () => {
  const { nodes, run } = await setup();
  nodes.startBtn.click();
  const missed = run('game.current');
  run('answer(game.current.choices.find((choice) => choice !== game.current.answer)); resolveTurn();');
  for (let level = 0; level < 4; level++) {
    for (let turn = 0; turn < 5; turn++) run('answer(game.current.answer); resolveTurn();');
    if (level < 3) nodes.continueBtn.click();
  }
  expect(nodes.endingTitle.textContent).toBe('You are King of the Jungle!');
  nodes.reviewBtn.click();
  expect(nodes.reviewList.children).toHaveLength(1);
  expect(nodes.reviewList.children[0].children[2].textContent).toBe(`Correct answer: ${missed.answer}`);
  expect(nodes.reviewList.children[0].children[3].textContent).toBe(`Why: ${missed.explanation}`);
});

test('the question bank requires a nonempty explanation for every answer', async () => {
  const { run } = await setup();
  expect(run('validateDatabase(database)')).toBe(true);
  for (const explanation of ['undefined', '""', '"   "', '42']) {
    expect(run(`validateDatabase({ ...database, easy: [{ ...database.easy[0], explanation: ${explanation} }] })`)).toBe(false);
  }
});

test('a selected animal can lose, review answers, and return to choose another animal', async () => {
  const { nodes, animals, run } = await setup();
  animals.forEach((animal) => { animal.checked = animal.value === 'Elephant'; });
  nodes.startBtn.click();
  for (let turn = 0; turn < 5; turn++) run('answer(game.current.choices.find((choice) => choice !== game.current.answer)); resolveTurn();');
  expect(nodes.playerHpText.textContent).toBe('0/100');
  expect(nodes.endingTitle.textContent).toBe('The jungle wins this round');
  nodes.reviewBtn.click();
  expect(nodes.reviewList.children).toHaveLength(5);
  const wrongAnswers = run('game.wrong');
  nodes.reviewList.children.forEach((item, index) => {
    expect(item.children[1].textContent).toBe(`Your answer: ${wrongAnswers[index].chosen}`);
    expect(item.children[2].textContent).toBe(`Correct answer: ${wrongAnswers[index].correct}`);
    expect(item.children[3].className).toBe('review-explanation');
    expect(item.children[3].textContent).toBe(`Why: ${wrongAnswers[index].explanation}`);
  });
  nodes.reviewBackBtn.click();
  nodes.againBtn.click();
  expect(nodes.intro.classList.contains('hidden')).toBe(false);
  nodes.startBtn.click();
  expect(nodes.playerHpText.textContent).toBe('100/100');
  expect(nodes.playerSprite.textContent).toBe('🐘');
});
