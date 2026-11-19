import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { LEVELS, parseWordsYaml, createBubbles, createRound, selectBubble, removeLetter, spelledWord, submitSpell, nextWord, readProgress } from './logic.mjs';

const yaml = readFileSync(new URL('./words.yaml', import.meta.url), 'utf8');
const bank = parseWordsYaml(yaml);

function answer(round, correct = true) {
  const word = round.words[round.index];
  const letters = correct ? [...word] : Array.from({ length: word.length }, () => null);
  for (const letter of letters) {
    const bubble = round.bubbles.find((item) => !round.selected.includes(item.id) && (letter === null || item.letter === letter));
    round = selectBubble(round, bubble.id);
  }
  if (!correct && spelledWord(round) === word) {
    round = removeLetter(round, round.selected.length - 1);
    round = selectBubble(round, round.bubbles.find((bubble) => !word.includes(bubble.letter)).id);
  }
  return submitSpell(round);
}

function finish(mistakes) {
  let round = createRound(bank.easy);
  for (let i = 0; i < 10; i++) {
    round = answer(round, i >= mistakes);
    if (round.phase === 'failed' || round.phase === 'passed') break;
    round = nextWord(round);
  }
  return round;
}

test('loads all 56 supplied words plus necessary in three equal 19-word pools', () => {
  const expected = `island orchestra colonel chaos vacuum pharaoh chameleon asthma souvenir yacht
    broccoli bureau cinnamon camouflage raspberry probably definite courageous occasional leisure
    rhythm stubborn persevere knowledge solemn resign debris embarrassment environment rendezvous
    muffin knuckle thirsty dazzle honest adventure separate disappear courage curious embarrass
    imagination fortunate accomplish hesitate embarrassed wrinkle scissors blossom feather journey
    grateful enormous drought foreign pumpkin necessary`.split(/\s+/);
  expect(LEVELS.map(({ key }) => bank[key].length)).toEqual([19, 19, 19]);
  expect(Object.values(bank).flat().sort()).toEqual(expected.sort());
  expect(new Set(Object.values(bank).flat()).size).toBe(57);
  expect(parseWordsYaml(yaml.replace('  - muffin', '  - "Muffin" # a comment').replace('  - thirsty', "  - 'thirsty'").replaceAll('\n', '\r\n')).easy).toEqual(bank.easy);
});

test('accepts balanced pools of at least 10 words and rejects undersized or unequal pools', () => {
  const minimum = LEVELS.map(({ key }) => `${key}:\n${bank[key].slice(0, 10).map((word) => `  - ${word}`).join('\n')}`).join('\n');
  expect(Object.values(parseWordsYaml(minimum)).map((words) => words.length)).toEqual([10, 10, 10]);
  expect(() => parseWordsYaml(minimum.replace('  - muffin\n', ''))).toThrow('at least 10 words');
  expect(() => parseWordsYaml(yaml.replace('  - muffin\n', ''))).toThrow('same number of words');
});

test('rejects invalid YAML, missing or extra words, duplicate levels and unsafe word content', () => {
  for (const invalid of [
    yaml.replace('  - muffin', '- muffin'), yaml.replace('  - muffin', '  - c'),
    yaml.replace('  - muffin', '  - cats-and-dogs'), yaml.replace('  - muffin\n', ''),
    `${yaml}\n  - extra`, `${yaml}\neasy:\n  - cat`,
    yaml.replace('  - thirsty', '  - MUFFIN'), yaml.replace('  - island', '  - muffin'),
    yaml.replace('easy:', 'beginner:'), yaml.replace('  - muffin', '  - <script>'),
    yaml.replace('  - muffin', '  - abcdefghijklmnop'), yaml.replace('  - muffin', '  - "cat\''),
    'easy:\n  - cat', '',
  ]) expect(() => parseWordsYaml(invalid)).toThrow();
});

test('accepts words through 15 letters and rejects 16 letters', () => {
  for (const word of ['communication', 'responsibility', 'congratulations']) {
    expect(parseWordsYaml(yaml.replace('  - muffin', `  - ${word}`)).easy[0]).toBe(word);
  }
  expect(() => parseWordsYaml(yaml.replace('  - muffin', '  - congratulationss'))).toThrow('2–15 letters');
});

test('every bubble set includes each repeated letter plus four decoys, with unique identities', () => {
  for (const word of Object.values(bank).flat()) {
    const bubbles = createBubbles(word);
    expect(bubbles).toHaveLength(word.length + 4);
    expect(new Set(bubbles.map(({ id }) => id)).size).toBe(bubbles.length);
    for (const letter of new Set(word)) {
      expect(bubbles.filter((bubble) => bubble.letter === letter)).toHaveLength([...word].filter((item) => item === letter).length);
    }
  }
});

test('draws exactly 10 unique words from the whole pool without changing the bank', () => {
  for (const { key } of LEVELS) {
    const words = bank[key];
    const original = [...words];
    const first = createRound(words, () => 0.999999);
    const rotated = createRound(words, () => 0);
    for (const round of [first, rotated]) {
      expect(round.words).toHaveLength(10);
      expect(new Set(round.words).size).toBe(10);
      expect(round.words.every((word) => words.includes(word))).toBe(true);
    }
    expect(first.words).toEqual(words.slice(0, 10));
    expect(rotated.words).not.toEqual(first.words);
    expect(rotated.words.some((word) => !words.slice(0, 10).includes(word))).toBe(true);
    expect(words).toEqual(original);
  }
});

test('only unused bubbles can be picked, and only the last placed letter can be returned', () => {
  let round = createRound(Array(10).fill('book'), () => 0.5);
  const letters = round.bubbles.filter(({ letter }) => letter === 'o');
  expect(selectBubble(round, -1)).toBe(round);
  round = selectBubble(round, letters[0].id);
  expect(selectBubble(round, letters[0].id)).toBe(round);
  round = selectBubble(round, letters[1].id);
  expect(spelledWord(round)).toBe('oo');
  expect(removeLetter(round, 0)).toBe(round);
  round = removeLetter(round, 1);
  expect(round.selected).toEqual([letters[0].id]);
  round = selectBubble(round, letters[1].id);
  expect(spelledWord(round)).toBe('oo');
});

test('incomplete spells cannot be submitted and submitted spells cannot be edited or scored twice', () => {
  let round = createRound(bank.easy);
  expect(submitSpell(round)).toBe(round);
  const before = round;
  round = answer(round);
  expect(before.selected).toHaveLength(0);
  expect(round.correct).toBe(1);
  expect(submitSpell(round)).toBe(round);
  expect(selectBubble(round, 0)).toBe(round);
  expect(removeLetter(round, round.selected.length - 1)).toBe(round);
  const next = nextWord(round);
  expect(next.selected).toEqual([]);
  expect(next.index).toBe(1);
  expect(next.last).toBeNull();
  expect(nextWord(next)).toBe(next);
});

test('passes all 10 questions with zero through three mistakes, grading each question once', () => {
  for (let mistakes = 0; mistakes <= 3; mistakes++) {
    const round = finish(mistakes);
    expect(round.phase).toBe('passed');
    expect(round.index).toBe(9);
    expect(round.correct * 10).toBe(100 - mistakes * 10);
    expect(round.mistakes).toBe(mistakes);
    expect(nextWord(round)).toBe(round);
  }
});

test('the fourth mistake fails immediately and a retry is a clean 10-word round', () => {
  const failed = finish(4);
  expect(failed.phase).toBe('failed');
  expect(failed.index).toBe(3);
  expect(failed.mistakes).toBe(4);
  expect(failed.last.correct).toBe(false);
  expect(failed.last.word).toBe(failed.words[3]);
  expect(nextWord(failed)).toBe(failed);
  const retry = createRound(bank.easy);
  expect(retry.index).toBe(0);
  expect(retry.mistakes).toBe(0);
  expect(new Set(retry.words).size).toBe(10);
  expect(bank.easy).toEqual(parseWordsYaml(yaml).easy);
});

test('restores only sequential passing grades for the current word bank', () => {
  const signature = JSON.stringify(bank);
  for (const grades of [[null, null, null], [70, null, null], [80, 90, null], [100, 70, 90]]) {
    expect(readProgress(JSON.stringify({ bank: signature, grades }), signature)).toEqual(grades);
  }
  for (const source of [null, '{}', 'broken', JSON.stringify({ bank: 'old', grades: [100, 100, 100] }),
    ...[[70, null, 90], [null, 100, 100], [60, null, null], [75, null, null], [100, 100], ['100', null, null]]
      .map((grades) => JSON.stringify({ bank: signature, grades }))]) {
    expect(readProgress(source, signature)).toEqual([null, null, null]);
  }
});
