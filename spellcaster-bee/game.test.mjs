import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import * as logic from './logic.mjs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('./game.mjs', import.meta.url), 'utf8').replace(/^import .*\n/, '');
const yaml = readFileSync(new URL('./words.yaml', import.meta.url), 'utf8');

// A small DOM stand-in follows the other arcade game's dependency-free flow tests.
function element() {
  const classes = new Set();
  return {
    textContent: '', hidden: false, disabled: false, children: [], dataset: {}, listeners: {}, attributes: {},
    clientWidth: 320, scrollLeft: 0,
    scrollTo({ left }) {
      this.scrollLeft = Math.max(0, Math.min((this.children.length - 1) * this.clientWidth, left));
      this.listeners.scroll?.();
    },
    style: { setProperty(name, value) { this[name] = value; } },
    classList: { toggle(name, active) { if (active) classes.add(name); else classes.delete(name); } },
    set innerHTML(_value) {
      const copy = element();
      copy.children = [element(), element()];
      this.children = [element(), copy, element()];
    },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    setAttribute(name, value) { this.attributes[name] = value; },
    click() { if (!this.disabled) this.listeners.click?.(); },
    focus() {},
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
  };
}

async function setup({ storage = new Map(), voices = [{ name: 'Daniel', lang: 'en-GB', localService: true }], supported = true, storageFails = false, response = yaml, ok = true } = {}) {
  const nodes = Object.fromEntries([...html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)].map(([tag, id]) => [id, Object.assign(element(), { hidden: /\bhidden\b/.test(tag), disabled: /\bdisabled\b/.test(tag) })]));
  const spoken = [];
  const events = {};
  const timers = new Map();
  let timerId = 0;
  const speech = {
    getVoices: () => voices,
    cancel() {},
    speak(utterance) { spoken.push(utterance); },
    addEventListener(type, handler) { events[type] = handler; },
  };
  const context = createContext({
    ...logic,
    document: { getElementById: (id) => nodes[id], createElement: element, addEventListener() {} },
    window: {
      scrollTo() {}, addEventListener(type, handler) { events[type] = handler; },
      speechSynthesis: supported ? speech : undefined,
      SpeechSynthesisUtterance: supported ? class { constructor(text) { this.text = text; } } : undefined,
      localStorage: {
        getItem(key) { if (storageFails) throw new Error('blocked'); return storage.get(key) ?? null; },
        setItem(key, value) { if (storageFails) throw new Error('full'); storage.set(key, value); },
      },
    },
    setTimeout(handler) { timers.set(++timerId, handler); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    fetch: async () => ({ ok, status: 404, text: async () => response }),
  });
  runInContext(source, context);
  await runInContext('loadBank()', context);
  const run = (code) => runInContext(code, context);
  function fill(correct = true) {
    const word = run('round.words[round.index]');
    const target = correct ? word : run('round.bubbles.find((bubble) => !round.words[round.index].includes(bubble.letter)).letter') + word.slice(1);
    for (const letter of target) {
      const id = run(`round.bubbles.find((bubble) => bubble.letter === ${JSON.stringify(letter)} && !round.selected.includes(bubble.id)).id`);
      nodes.bubbles.children[id].click();
    }
  }
  function answer(correct = true) {
    fill(correct);
    nodes.submitBtn.click();
  }
  function pass(mistakes = 0) {
    for (let i = 0; i < 10; i++) {
      answer(i >= mistakes);
      nodes.nextBtn.click();
    }
  }
  return { nodes, run, spoken, storage, timers, events, answer, fill, pass };
}

test('review shows all words alphabetically in pages of 10 without changing saved grades', async () => {
  const data = logic.parseWordsYaml(yaml);
  const saved = JSON.stringify({ bank: JSON.stringify(data), grades: [90, null, null] });
  const storage = new Map([['spellcaster-bee.graduation.v1', saved]]);
  const { nodes, run, spoken } = await setup({ storage });
  expect(nodes.reviewBtn.disabled).toBe(false);
  nodes.reviewBtn.click();
  expect(nodes.review.hidden).toBe(false);
  expect(nodes.intro.hidden).toBe(true);
  expect(nodes.lesson.hidden).toBe(true);
  const pages = nodes.reviewDeck.children;
  expect(pages.map((page) => page.children[1].children.length)).toEqual([10, 10, 10, 10, 10, 7]);
  expect(pages.flatMap((page) => page.children[1].children.map((item) => item.textContent))).toEqual(Object.values(data).flat().sort());
  expect(pages[0].children[0].textContent).toBe('Words 1–10');
  expect(pages[5].children[0].textContent).toBe('Words 51–57');
  expect(nodes.reviewCount.textContent).toBe('Page 1 / 6');
  expect(nodes.reviewPrevBtn.disabled).toBe(true);
  expect(nodes.reviewNextBtn.disabled).toBe(false);
  nodes.reviewHomeBtn.click();
  expect(nodes.intro.hidden).toBe(false);
  expect(nodes.review.hidden).toBe(true);
  expect(run('bankSignature')).toBe(JSON.stringify(data));
  expect(run('grades')).toEqual([90, null, null]);
  expect(run('typeof round')).toBe('undefined');
  expect([...storage.values()]).toEqual([saved]);
  expect(spoken).toHaveLength(0);
});

test('review supports buttons, arrow keys and swipe scroll positions without passing its ends', async () => {
  const { nodes, run } = await setup();
  nodes.reviewBtn.click();
  nodes.reviewNextBtn.click();
  expect(nodes.reviewCount.textContent).toBe('Page 2 / 6');
  nodes.reviewPrevBtn.click();
  expect(nodes.reviewCount.textContent).toBe('Page 1 / 6');
  let prevented = false;
  nodes.review.listeners.keydown({ key: 'ArrowRight', preventDefault() { prevented = true; } });
  expect(prevented).toBe(true);
  expect(nodes.reviewCount.textContent).toBe('Page 2 / 6');
  nodes.review.listeners.keydown({ key: 'ArrowLeft', preventDefault() {} });
  expect(nodes.reviewCount.textContent).toBe('Page 1 / 6');
  nodes.review.listeners.keydown({ key: 'Enter', preventDefault() { throw new Error('Unrelated key intercepted'); } });
  nodes.reviewDeck.scrollLeft = nodes.reviewDeck.clientWidth * 4;
  nodes.reviewDeck.listeners.scroll();
  expect(nodes.reviewCount.textContent).toBe('Page 5 / 6');
  nodes.reviewNextBtn.click();
  expect(nodes.reviewCount.textContent).toBe('Page 6 / 6');
  expect(nodes.reviewNextBtn.disabled).toBe(true);
  run('moveReview(1)');
  expect(nodes.reviewCount.textContent).toBe('Page 6 / 6');
  nodes.reviewDeck.scrollLeft = -30;
  nodes.reviewDeck.listeners.scroll();
  expect(nodes.reviewCount.textContent).toBe('Page 1 / 6');
  nodes.reviewPrevBtn.click();
  expect(nodes.reviewCount.textContent).toBe('Page 1 / 6');
  nodes.reviewHomeBtn.click();
  run('moveReview(1)');
  nodes.reviewBtn.click();
  expect(nodes.reviewCount.textContent).toBe('Page 1 / 6');
});

test('review includes 15-letter words and remains available without speech support', async () => {
  const response = yaml.replace('  - muffin', '  - congratulations');
  const { nodes, spoken } = await setup({ supported: false, response });
  expect(nodes.levelCards.children.every((button) => button.disabled)).toBe(true);
  expect(nodes.reviewBtn.disabled).toBe(false);
  nodes.reviewBtn.click();
  const items = nodes.reviewDeck.children.flatMap((page) => page.children[1].children);
  const word = items.find((item) => item.textContent === 'congratulations');
  expect(items).toHaveLength(57);
  expect(word.style['--word-length']).toBe(15);
  expect(spoken).toHaveLength(0);
});

test('starts only the unlocked class, speaks the word without showing its spelling, and supports last-letter undo', async () => {
  const { nodes, run, spoken } = await setup();
  expect(nodes.levelCards.children.map((button) => button.disabled)).toEqual([false, true, true]);
  run('startLevel(2)');
  expect(nodes.lesson.hidden).toBe(true);
  nodes.levelCards.children[0].click();
  expect(nodes.lesson.hidden).toBe(false);
  expect(spoken.at(-1).text).toBe(run('round.words[0]'));
  expect(spoken.at(-1).lang).toBe('en-GB');
  expect(nodes.feedback.hidden).toBe(true);
  expect(nodes.slots.children.every((slot) => slot.textContent === '')).toBe(true);
  expect(nodes.submitBtn.disabled).toBe(true);
  nodes.bubbles.children[0].click();
  nodes.bubbles.children[1].click();
  nodes.slots.children[0].click();
  expect(run('round.selected.length')).toBe(2);
  nodes.slots.children[1].click();
  expect(run('round.selected')).toEqual([0]);
  expect(nodes.bubbles.children[1].disabled).toBe(false);
  nodes.listenBtn.click();
  expect(spoken).toHaveLength(2);
  expect(run('round.index')).toBe(0);
});

test('a 15-letter word renders all slots and bubbles and supports undo and submission', async () => {
  const word = 'congratulations';
  const data = logic.parseWordsYaml(yaml);
  data.easy[0] = word;
  const response = logic.LEVELS.map(({ key }) => `${key}:\n${data[key].slice(0, 10).map((entry) => `  - ${entry}`).join('\n')}`).join('\n');
  const { nodes, run, answer, fill } = await setup({ response });
  nodes.levelCards.children[0].click();
  while (run('round.words[round.index]') !== word) {
    answer();
    nodes.nextBtn.click();
  }
  expect(nodes.slots.children).toHaveLength(15);
  expect(nodes.slots.style['--word-length']).toBe(15);
  expect(nodes.bubbles.children).toHaveLength(19);
  expect(nodes.undoBtn.disabled).toBe(true);
  nodes.undoBtn.click();
  expect(run('round.selected.length')).toBe(0);
  fill();
  const lastId = run('round.selected.at(-1)');
  expect(nodes.undoBtn.disabled).toBe(false);
  nodes.undoBtn.click();
  expect(run('round.selected.length')).toBe(14);
  expect(nodes.bubbles.children[lastId].disabled).toBe(false);
  expect(nodes.submitBtn.disabled).toBe(true);
  nodes.bubbles.children[lastId].click();
  nodes.submitBtn.click();
  expect(run('round.last.correct')).toBe(true);
  expect(nodes.feedbackText.textContent).toContain(word);
  expect(nodes.undoBtn.hidden).toBe(true);
  expect(nodes.undoBtn.disabled).toBe(true);
  nodes.undoBtn.click();
  expect(run('round.selected.length')).toBe(15);
});

test('wrong answers reveal the spelling, block double scoring, and move on only when tapped', async () => {
  const { nodes, run, answer } = await setup();
  nodes.levelCards.children[0].click();
  answer(false);
  expect(nodes.feedback.hidden).toBe(false);
  expect(nodes.feedbackText.textContent).toContain(run('round.words[0]'));
  expect(nodes.workshop.dataset.effect).toBe('explosion');
  expect(nodes.bubbleArea.hidden).toBe(true);
  expect(nodes.listenBtn.disabled).toBe(true);
  nodes.submitBtn.click();
  expect(run('round.mistakes')).toBe(1);
  expect(run('round.index')).toBe(0);
  nodes.nextBtn.click();
  expect(run('round.index')).toBe(1);
  expect(run('round.selected.length')).toBe(0);
  expect(nodes.feedback.hidden).toBe(true);
});

test('graduations show 70–100 percent diplomas and all three classes award Supreme Spellcaster', async () => {
  const { nodes, run, pass, storage } = await setup();
  nodes.levelCards.children[0].click();
  for (let level = 0; level < 3; level++) {
    pass(3 - level);
    expect(nodes.diploma.hidden).toBe(false);
    expect(nodes.wizardTitle.textContent).toBe(`Wizard Class ${level + 1}`);
    expect(nodes.diplomaGrade.textContent).toBe(`${70 + level * 10}%`);
    nodes.graduateBtn.click();
  }
  expect(nodes.supreme.hidden).toBe(false);
  expect(nodes.courseGrade.textContent).toBe('Best course grade: 80%');
  expect(run('grades')).toEqual([70, 80, 90]);
  nodes.supremeHomeBtn.click();
  expect(nodes.loading.textContent).toContain('Supreme Spellcaster');
  const restored = await setup({ storage });
  expect(restored.nodes.levelCards.children.every((button) => !button.disabled)).toBe(true);
  expect(restored.run('grades')).toEqual([70, 80, 90]);
});

test('the fourth mistake retries only the current level and never clears earlier diplomas', async () => {
  const { nodes, run, pass, answer } = await setup();
  nodes.levelCards.children[0].click();
  pass();
  nodes.graduateBtn.click();
  for (let i = 0; i < 3; i++) { answer(false); nodes.nextBtn.click(); }
  expect(run('round.phase')).toBe('spelling');
  expect(run('round.mistakes')).toBe(3);
  answer(false);
  expect(run('round.phase')).toBe('failed');
  expect(nodes.feedbackText.textContent).toContain('4 mistakes');
  nodes.nextBtn.click();
  expect(run('levelIndex')).toBe(1);
  expect(run('round.index')).toBe(0);
  expect(run('round.mistakes')).toBe(0);
  expect(run('grades')).toEqual([100, null, null]);
});

test('passing saves immediately, replay keeps the best grade, and unfinished classes do not unlock levels', async () => {
  const { nodes, storage, run, answer, pass } = await setup();
  nodes.levelCards.children[0].click();
  for (let i = 0; i < 9; i++) { answer(); nodes.nextBtn.click(); }
  answer();
  expect(nodes.diploma.hidden).toBe(true);
  expect(JSON.parse([...storage.values()][0]).grades).toEqual([100, null, null]);
  nodes.nextBtn.click();
  nodes.diplomaHomeBtn.click();
  nodes.levelCards.children[0].click();
  pass(3);
  expect(nodes.diplomaGrade.textContent).toBe('70%');
  expect(run('grades')).toEqual([100, null, null]);
  nodes.graduateBtn.click();
  answer();
  const restored = await setup({ storage });
  expect(restored.nodes.levelCards.children.map((button) => button.disabled)).toEqual([false, false, true]);
  restored.nodes.levelCards.children[1].click();
  expect(restored.run('round.index')).toBe(0);
});

test('speech failures and unsupported browsers are visible, with safe replay and cancellation', async () => {
  const unsupported = await setup({ supported: false });
  expect(unsupported.nodes.speechWarning.hidden).toBe(false);
  expect(unsupported.nodes.levelCards.children.every((button) => button.disabled)).toBe(true);
  const { nodes, spoken, timers, events } = await setup();
  nodes.levelCards.children[0].click();
  const old = spoken.at(-1);
  nodes.listenBtn.click();
  old.onerror();
  expect(nodes.speechWarning.hidden).toBe(true);
  spoken.at(-1).onerror();
  expect(nodes.speechWarning.hidden).toBe(false);
  expect(nodes.speechWarning.textContent).toContain('could not play');
  nodes.listenBtn.click();
  for (const handler of timers.values()) handler();
  expect(nodes.speechWarning.textContent).toContain('hasn’t started');
  events.pagehide();
  expect(timers.size).toBe(0);
});

test('prefers male English voices, British accents, and local voices within an accent', async () => {
  const female = { name: 'Samantha', lang: 'en-US', localService: true, default: true };
  const american = { name: 'Microsoft David Online (Natural)', lang: 'en-US', localService: false };
  const local = { name: 'Alex (Enhanced)', lang: 'en-US', localService: true };
  const british = { name: 'Daniel', lang: 'en-GB', localService: true };
  const labelledFemale = { name: 'Google UK English Female', lang: 'en-GB', localService: true };
  const labelledMale = { name: 'Google UK English Male', lang: 'en-GB', localService: false };
  for (const [voices, expected] of [
    [[female, american, local, labelledMale, british], british],
    [[female, american, local, labelledMale], labelledMale],
    [[female, american, local], local],
    [[female, american], american],
    [[labelledFemale, local], local],
    [[labelledFemale, labelledMale], labelledMale],
  ]) {
    const { nodes, spoken } = await setup({ voices });
    nodes.levelCards.children[0].click();
    expect(spoken.at(-1).voice).toBe(expected);
    expect(spoken.at(-1).pitch).toBe(1);
  }
});

test('warns when male voices cannot be identified and never picks a non-English male voice', async () => {
  for (const voices of [
    [{ name: 'Samantha', lang: 'en-US' }, { name: 'David', lang: 'fr-FR' }],
    [{ name: 'English Female', lang: 'en-US' }],
    [{ lang: 'en-US' }],
  ]) {
    const { nodes, spoken } = await setup({ voices });
    nodes.levelCards.children[0].click();
    expect(spoken.at(-1).voice).toBe(voices[0]);
    expect(nodes.speechWarning.textContent).toContain('male English voice couldn’t be identified');
    spoken.at(-1).onstart();
    expect(nodes.speechWarning.hidden).toBe(false);
  }
});

test('replay selects a male voice when the device finishes loading its voices', async () => {
  const voices = [];
  const { nodes, spoken, events } = await setup({ voices });
  nodes.levelCards.children[0].click();
  expect(nodes.speechWarning.textContent).toContain('male English voice couldn’t be identified');
  const male = { name: 'Microsoft Ryan', lang: 'en-GB', localService: true };
  voices.push(male);
  events.voiceschanged();
  nodes.listenBtn.click();
  expect(spoken.at(-1).voice).toBe(male);
  expect(nodes.speechWarning.hidden).toBe(true);
});

test('accepts other English male accents without warning and handles lazy or missing voices', async () => {
  const american = await setup({ voices: [{ name: 'Alex', lang: 'en-US', localService: true }] });
  american.nodes.levelCards.children[0].click();
  expect(american.spoken.at(-1).lang).toBe('en-US');
  expect(american.nodes.speechWarning.hidden).toBe(true);
  american.spoken.at(-1).onstart();
  expect(american.nodes.speechWarning.hidden).toBe(true);
  const nonEnglish = await setup({ voices: [{ lang: 'fr-FR' }] });
  nonEnglish.nodes.levelCards.children[0].click();
  expect(nonEnglish.spoken).toHaveLength(0);
  expect(nonEnglish.nodes.speechWarning.textContent).toContain('No English voice');
  const lazy = await setup({ voices: [] });
  lazy.nodes.levelCards.children[0].click();
  expect(lazy.spoken.at(-1).lang).toBe('en-GB');
});

test('blocked storage does not interrupt graduation and invalid word banks cannot start', async () => {
  const blocked = await setup({ storageFails: true });
  blocked.nodes.levelCards.children[0].click();
  blocked.pass();
  expect(blocked.nodes.diploma.hidden).toBe(false);
  expect(blocked.nodes.storageWarning.hidden).toBe(false);
  for (const options of [{ response: 'easy:\n  - cat' }, { ok: false }]) {
    const invalid = await setup(options);
    expect(invalid.nodes.loadError.hidden).toBe(false);
    expect(invalid.nodes.levelCards.children).toHaveLength(0);
    expect(invalid.nodes.reviewBtn.disabled).toBe(true);
    invalid.nodes.reviewBtn.click();
    expect(invalid.nodes.review.hidden).toBe(true);
  }
});

test('all game assets and the shared shuffle module are pre-cached for offline play', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const file of ['index.html', 'style.css', 'game.mjs', 'logic.mjs', 'words.yaml']) {
    expect(sw).toContain(`'./spellcaster-bee/${file}'`);
    expect(readFileSync(new URL(`./${file}`, import.meta.url)).length).toBeGreaterThan(0);
  }
  expect(sw).toContain("'./king-of-the-jungle/logic.mjs'");
  expect(readFileSync(new URL('./style.css', import.meta.url), 'utf8')).toContain('prefers-reduced-motion:reduce');
});
