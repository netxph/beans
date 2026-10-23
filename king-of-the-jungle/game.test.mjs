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
    textContent: '', dataset: {}, style: {}, children: [], listeners: {}, disabled: false,
    lastElementChild: { textContent: '' },
    classList: {
      add: (name) => classNames.add(name), remove: (name) => classNames.delete(name),
      contains: (name) => classNames.has(name),
      toggle(name, active) { if (active) classNames.add(name); else classNames.delete(name); },
    },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    click() { if (!this.disabled) this.listeners.click?.(); },
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
  const quiz = element();
  const context = createContext({
    ...logic,
    document: {
      getElementById: (id) => nodes[id], querySelector: (selector) => selector === '.quiz' ? quiz : arena,
      querySelectorAll: (selector) => selector === '.step' ? Array.from({ length: 4 }, () => element()) : animals,
      createElement: () => element(), addEventListener() {},
    },
    window: { addEventListener() {} }, setTimeout() {},
    fetch: async () => ({ ok: true, text: async () => readFileSync(new URL('./questions.yaml', import.meta.url), 'utf8') }),
  });
  runInContext(source, context);
  await runInContext('loadDatabase()', context);
  return { nodes, animals, quiz, run: (code) => runInContext(code, context) };
}

async function startAs(name) {
  const session = await setup();
  session.animals.forEach((animal) => { animal.checked = animal.value === name; });
  session.nodes.startBtn.click();
  return session;
}

test('power-up charge requires five consecutive correct answers and stays ready until used', async () => {
  const { nodes, run } = await startAs('Lion');
  expect(nodes.powerMeter.value).toBe(0);
  expect(nodes.powerBtn.disabled).toBe(true);
  run('usePowerup();');
  expect(run('game.lionBoost')).toBe(false);
  run('for (let i = 0; i < 4; i++) { answer(game.current.answer); resolveTurn(); }');
  expect(nodes.powerMeter.value).toBe(4);
  expect(nodes.powerBtn.disabled).toBe(true);
  run('answer(game.current.choices.find((choice) => choice !== game.current.answer)); resolveTurn();');
  expect(nodes.powerMeter.value).toBe(0);
  run('for (let i = 0; i < 5; i++) { answer(game.current.answer); resolveTurn(); }');
  expect(nodes.powerMeter.value).toBe(5);
  expect(nodes.powerText.textContent).toContain('Ready!');
  expect(nodes.powerBtn.disabled).toBe(false);
  run('answer(game.current.choices.find((choice) => choice !== game.current.answer));');
  expect(nodes.powerBtn.disabled).toBe(true);
  run('usePowerup();');
  expect(run('game.charge')).toBe(5);
  expect(run('game.lionBoost')).toBe(false);
  run('resolveTurn();');
  expect(nodes.powerMeter.value).toBe(5);
  expect(nodes.powerBtn.disabled).toBe(false);
});

test('Lion doubles only the next correct hit and can recharge after using it', async () => {
  const { nodes, run } = await startAs('Lion');
  run('for (let i = 0; i < 5; i++) { answer(game.current.answer); resolveTurn(); }');
  nodes.powerBtn.click();
  expect(nodes.powerMeter.value).toBe(0);
  expect(run('game.lionBoost')).toBe(true);
  expect(nodes.powerBtn.disabled).toBe(true);
  run('answer(game.current.choices.find((choice) => choice !== game.current.answer)); resolveTurn();');
  expect(run('game.enemyHp')).toBe(50);
  expect(run('game.lionBoost')).toBe(true);
  run('answer(game.current.answer);');
  expect(run('game.enemyHp')).toBe(30);
  expect(run('game.lionBoost')).toBe(false);
  expect(nodes.feedback.textContent).toContain('20 damage');
  expect(nodes.powerMeter.value).toBe(1);
  run('resolveTurn(); answer(game.current.answer);');
  expect(run('game.enemyHp')).toBe(20);
  expect(nodes.feedback.textContent).toContain('10 damage');
  expect(nodes.powerMeter.value).toBe(2);
});

test('Tiger removes exactly two wrong choices without changing the bank or allowing their keyboard shortcuts', async () => {
  const { nodes, run } = await startAs('Tiger');
  run('for (let i = 0; i < 5; i++) { answer(game.current.answer); resolveTurn(); }');
  const original = run('JSON.stringify(database)');
  const correct = run('game.current.answer');
  nodes.powerBtn.click();
  const hidden = nodes.choices.children.filter((button) => button.classList.contains('hidden'));
  expect(hidden).toHaveLength(2);
  expect(hidden.every((button) => button.disabled && button.dataset.choice !== correct)).toBe(true);
  expect(nodes.choices.children.filter((button) => !button.disabled)).toHaveLength(2);
  expect(nodes.choices.children.find((button) => button.dataset.choice === correct).disabled).toBe(false);
  expect(run('JSON.stringify(database)')).toBe(original);
  expect(run('game.answered')).toBe(5);
  expect(run('game.charge')).toBe(0);
  const eliminatedKey = nodes.choices.children.indexOf(hidden[0]) + 1;
  run(`chooseByKey('${eliminatedKey}');`);
  expect(run('game.answered')).toBe(5);
  const remainingWrong = nodes.choices.children.find((button) => !button.disabled && button.dataset.choice !== correct);
  remainingWrong.click();
  expect(run('game.wrong.length')).toBe(1);
  run('resolveTurn();');
  expect(nodes.choices.children.every((button) => !button.disabled && !button.classList.contains('hidden'))).toBe(true);
});

test('Elephant restores 25 percent of maximum health without exceeding 100 HP', async () => {
  for (const hp of [60, 90, 100]) {
    const { nodes, run } = await startAs('Elephant');
    run('for (let i = 0; i < 5; i++) { answer(game.current.answer); resolveTurn(); }');
    run(`game.playerHp = ${hp}; updateHealth();`);
    nodes.powerBtn.click();
    expect(run('game.playerHp')).toBe(Math.min(100, hp + 25));
    expect(nodes.playerHpText.textContent).toBe(`${Math.min(100, hp + 25)}/100`);
    expect(run('game.enemyHp')).toBe(50);
    expect(run('game.answered')).toBe(5);
    expect(run('game.charge')).toBe(0);
    run('usePowerup();');
    expect(run('game.playerHp')).toBe(Math.min(100, hp + 25));
  }
});

test('Gorilla skips only the current question without adding score, damage, or review entries', async () => {
  const { nodes, quiz, run } = await startAs('Gorilla');
  run('for (let i = 0; i < 5; i++) { answer(game.current.answer); resolveTurn(); }');
  const previous = nodes.question.textContent;
  const deckLength = run('game.deck.length');
  quiz.scrollTop = 250;
  nodes.powerBtn.click();
  expect(nodes.question.textContent).not.toBe(previous);
  expect(quiz.scrollTop).toBe(0);
  expect(run('game.deck.length')).toBe(deckLength - 1);
  expect(run('game.answered')).toBe(5);
  expect(run('game.correct')).toBe(5);
  expect(run('game.wrong.length')).toBe(0);
  expect(run('game.playerHp')).toBe(100);
  expect(run('game.enemyHp')).toBe(50);
  expect(run('game.charge')).toBe(0);
  expect(run('game.locked')).toBe(false);
  run('usePowerup();');
  expect(run('game.deck.length')).toBe(deckLength - 1);
  run('answer(game.current.answer); resolveTurn();');
  expect(run('game.charge')).toBe(1);
});

test('charge and active effects reset on each round and new game, and cannot be used after a round', async () => {
  for (const name of ['Lion', 'Tiger', 'Elephant', 'Gorilla']) {
    const { nodes, run } = await startAs(name);
    run('for (let i = 0; i < 10; i++) { answer(game.current.answer); resolveTurn(); }');
    expect(run('game.charge')).toBe(5);
    expect(nodes.powerBtn.disabled).toBe(true);
    run('usePowerup();');
    expect(run('game.charge')).toBe(5);
    nodes.continueBtn.click();
    expect(run('game.charge')).toBe(0);
    expect(run('game.lionBoost')).toBe(false);
    expect(nodes.powerMeter.value).toBe(0);
    expect(nodes.powerBtn.disabled).toBe(true);
    run('game.charge = 5; game.lionBoost = true; startLevel();');
    expect(run('game.charge')).toBe(0);
    expect(run('game.lionBoost')).toBe(false);
    run('game.charge = 5; endGame(false); usePowerup();');
    expect(run('game.charge')).toBe(5);
    nodes.againBtn.click();
    nodes.startBtn.click();
    expect(run('game.charge')).toBe(0);
    expect(run('game.lionBoost')).toBe(false);
  }
});

test('a new question resets only the quiz panel scroll position', async () => {
  const { nodes, quiz, run } = await setup();
  nodes.startBtn.click();
  quiz.scrollTop = 250;
  run('nextQuestion();');
  expect(quiz.scrollTop).toBe(0);
  expect(nodes.question.textContent).toBe(run('game.current.question'));
  expect(nodes.choices.children).toHaveLength(4);
});

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
      for (let turn = 0; turn < 10; turn++) run('answer(game.current.answer); resolveTurn();');
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

test('every round has enough unique questions for the longest surviving battle at half damage', async () => {
  const { nodes, run } = await setup();
  const damages = [10, 15, 20, 25];
  for (let level = 0; level < damages.length; level++) {
    nodes.startBtn.click();
    run(`game.level = ${level}; startLevel();`);
    const damage = damages[level];
    const wrongTurns = Math.ceil(100 / damage) - 1;
    expect(nodes.levelLabel.textContent).toContain(`${damage} enemy damage`);
    expect(run('database[LEVELS[game.level].key].length')).toBeGreaterThanOrEqual(10 + wrongTurns);
    const seen = new Set();
    for (let turn = 0; turn < wrongTurns + 10; turn++) {
      const prompt = run('game.current.question');
      expect(seen.has(prompt)).toBe(false);
      seen.add(prompt);
      if (turn < wrongTurns) {
        run('answer(game.current.choices.find((choice) => choice !== game.current.answer)); resolveTurn();');
        expect(run('game.playerHp')).toBe(100 - (turn + 1) * damage);
      } else {
        run('answer(game.current.answer);');
        expect(run('game.enemyHp')).toBe(100 - (turn - wrongTurns + 1) * 10);
        expect(nodes.feedback.textContent).toContain('Your attack deals 10 damage');
        run('resolveTurn();');
      }
    }
    expect(run('game.playerHp')).toBeGreaterThan(0);
    expect(run('game.correct')).toBe(10);
    expect(run('game.enemyHp')).toBe(0);
  }
});

test('every difficulty has enough unique questions even with Elephant healing or a Gorilla skip', async () => {
  for (const name of ['Elephant', 'Gorilla']) {
    const { nodes, run } = await startAs(name);
    for (let level = 0; level < 4; level++) {
      run(`ui.overlay.classList.add('hidden'); game.playerHp = 100; game.level = ${level}; startLevel();`);
      const damage = run('LEVELS[game.level].damage');
      const seen = new Set();
      const turn = (correct) => {
        expect(seen.has(nodes.question.textContent)).toBe(false);
        seen.add(nodes.question.textContent);
        run(correct
          ? 'answer(game.current.answer); resolveTurn();'
          : 'answer(game.current.choices.find((choice) => choice !== game.current.answer)); resolveTurn();');
      };
      for (let i = 0; i < Math.ceil(100 / damage) - 1; i++) turn(false);
      for (let i = 0; i < 5; i++) turn(true);
      if (name === 'Gorilla') {
        seen.add(nodes.question.textContent);
        nodes.powerBtn.click();
      } else {
        nodes.powerBtn.click();
        while (run('game.playerHp') > damage) turn(false);
      }
      for (let i = 0; i < 5; i++) turn(true);
      expect(run('game.playerHp')).toBeGreaterThan(0);
      expect(run('game.enemyHp')).toBe(0);
      expect(run('game.correct')).toBe((level + 1) * 10);
    }
  }
});

test('a winning game reviews only wrong answers with their explanations', async () => {
  const { nodes, run } = await setup();
  nodes.startBtn.click();
  const missed = run('game.current');
  run('answer(game.current.choices.find((choice) => choice !== game.current.answer)); resolveTurn();');
  for (let level = 0; level < 4; level++) {
    for (let turn = 0; turn < 10; turn++) run('answer(game.current.answer); resolveTurn();');
    if (level < 3) nodes.continueBtn.click();
  }
  expect(nodes.endingTitle.textContent).toBe('You are King of the Jungle!');
  nodes.reviewBtn.click();
  expect(nodes.reviewList.children).toHaveLength(1);
  expect(nodes.reviewList.children[0].children[2].textContent).toBe(`Correct answer: ${missed.answer}`);
  expect(nodes.reviewList.children[0].children[3].textContent).toBe(`Why: ${missed.explanation}`);
  expect(nodes.reviewList.children[0].children[4].className).toBe('review-topic');
  expect(nodes.reviewList.children[0].children[4].textContent).toBe(`Topic category: ${missed.topic}`);
});

test('battle choices are randomized while grading and review keep the original answer', async () => {
  const { nodes, run } = await setup();
  nodes.startBtn.click();
  const original = run('database.easy[0]');
  run(`shuffledQuestion = (question) => ({ ...question, choices: [...question.choices].reverse() });
    game.deck = [database.easy[0]]; nextQuestion();`);
  expect(nodes.choices.children.map((button) => button.dataset.choice)).toEqual([...original.choices].reverse());
  expect(run('database.easy[0].choices')).toEqual(original.choices);
  const wrong = nodes.choices.children.find((button) => button.dataset.choice !== original.answer);
  wrong.click();
  expect(nodes.choices.children.find((button) => button.dataset.choice === original.answer).classList.contains('correct')).toBe(true);
  expect(wrong.classList.contains('wrong')).toBe(true);
  expect(run('game.wrong[0].correct')).toBe(original.answer);
  expect(run('game.playerHp')).toBe(90);

  run('game.deck = [database.easy[0]]; nextQuestion();');
  nodes.choices.children.find((button) => button.dataset.choice === original.answer).click();
  expect(run('game.correct')).toBe(1);
  expect(run('game.enemyHp')).toBe(90);
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
  for (let turn = 0; turn < 10; turn++) run('answer(game.current.choices.find((choice) => choice !== game.current.answer)); resolveTurn();');
  expect(nodes.playerHpText.textContent).toBe('0/100');
  expect(nodes.endingTitle.textContent).toBe('The jungle wins this round');
  nodes.reviewBtn.click();
  expect(nodes.reviewList.children).toHaveLength(10);
  const wrongAnswers = run('game.wrong');
  nodes.reviewList.children.forEach((item, index) => {
    expect(item.children[1].textContent).toBe(`Your answer: ${wrongAnswers[index].chosen}`);
    expect(item.children[2].textContent).toBe(`Correct answer: ${wrongAnswers[index].correct}`);
    expect(item.children[3].className).toBe('review-explanation');
    expect(item.children[3].textContent).toBe(`Why: ${wrongAnswers[index].explanation}`);
    expect(item.children[4].className).toBe('review-topic');
    expect(item.children[4].textContent).toBe(`Topic category: ${wrongAnswers[index].topic}`);
  });
  nodes.reviewBackBtn.click();
  nodes.againBtn.click();
  expect(nodes.intro.classList.contains('hidden')).toBe(false);
  nodes.startBtn.click();
  expect(nodes.playerHpText.textContent).toBe('100/100');
  expect(nodes.playerSprite.textContent).toBe('🐘');
});
