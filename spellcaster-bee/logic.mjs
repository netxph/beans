import { shuffle } from '../king-of-the-jungle/logic.mjs';

export const LEVELS = [
  { key: 'easy', label: 'Easy', title: 'Wizard Class 1' },
  { key: 'average', label: 'Average', title: 'Wizard Class 2' },
  { key: 'difficult', label: 'Difficult', title: 'Wizard Class 3' },
];

export function parseWordsYaml(source) {
  const bank = {};
  let words;
  // shortcut: supports only word lists with plain or quoted English words; use a YAML library for richer lessons.
  for (const [index, line] of source.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    if (/^\s*(#.*)?$/.test(line)) continue;
    const heading = line.match(/^(easy|average|difficult):\s*(?:#.*)?$/);
    if (heading) {
      if (bank[heading[1]]) throw new Error(`Duplicate level on line ${index + 1}.`);
      bank[heading[1]] = words = [];
      continue;
    }
    const item = line.match(/^  - ([a-zA-Z]+|"[a-zA-Z]+"|'[a-zA-Z]+')\s*(?:#.*)?$/);
    if (!words || !item) throw new Error(`Invalid word list on line ${index + 1}. Use two spaces, a dash, and an English word.`);
    const word = item[1].replace(/^["']|["']$/g, '').toLowerCase();
    if (!/^[a-z]{2,15}$/.test(word)) throw new Error(`Word on line ${index + 1} must have 2–15 letters.`);
    if (Object.values(bank).some((list) => list.includes(word))) throw new Error(`Duplicate word on line ${index + 1}: ${word}.`);
    words.push(word);
  }
  for (const { key } of LEVELS) {
    if ((bank[key]?.length ?? 0) < 10) throw new Error(`${key} must contain at least 10 words.`);
    if (bank[key].length !== bank.easy.length) throw new Error('Each difficulty must contain the same number of words.');
  }
  return bank;
}

export function createBubbles(word, random = Math.random) {
  const decoys = [...'abcdefghijklmnopqrstuvwxyz'].filter((letter) => !word.includes(letter));
  const letters = [...word, ...Array.from({ length: 4 }, () => decoys[Math.floor(random() * decoys.length)])];
  return shuffle(letters, random).map((letter, id) => ({ id, letter }));
}

export function createRound(words, random = Math.random) {
  const deck = shuffle(words, random).slice(0, 10);
  return { words: deck, index: 0, correct: 0, mistakes: 0, selected: [], bubbles: createBubbles(deck[0], random), phase: 'spelling', last: null };
}

export function selectBubble(round, id) {
  if (round.phase !== 'spelling' || round.selected.length === round.words[round.index].length ||
      !round.bubbles.some((bubble) => bubble.id === id) || round.selected.includes(id)) return round;
  return { ...round, selected: [...round.selected, id] };
}

export function removeLetter(round, position) {
  if (round.phase !== 'spelling' || !round.selected.length || position !== round.selected.length - 1) return round;
  return { ...round, selected: round.selected.slice(0, -1) };
}

export function spelledWord(round) {
  return round.selected.map((id) => round.bubbles[id].letter).join('');
}

export function submitSpell(round) {
  if (round.phase !== 'spelling' || round.selected.length !== round.words[round.index].length) return round;
  const word = round.words[round.index];
  const answer = spelledWord(round);
  const correct = answer === word;
  const mistakes = round.mistakes + Number(!correct);
  return {
    ...round, correct: round.correct + Number(correct), mistakes,
    phase: mistakes > 3 ? 'failed' : round.index === round.words.length - 1 ? 'passed' : 'feedback',
    last: { word, answer, correct },
  };
}

export function nextWord(round, random = Math.random) {
  if (round.phase !== 'feedback') return round;
  const index = round.index + 1;
  return { ...round, index, selected: [], bubbles: createBubbles(round.words[index], random), phase: 'spelling', last: null };
}

export function readProgress(source, bankSignature) {
  const empty = [null, null, null];
  try {
    const saved = JSON.parse(source);
    if (saved?.bank !== bankSignature || !Array.isArray(saved.grades) || saved.grades.length !== 3) return empty;
    let incomplete = false;
    for (const grade of saved.grades) {
      if (grade === null) incomplete = true;
      else if (incomplete || !Number.isInteger(grade) || grade < 70 || grade > 100 || grade % 10 !== 0) return empty;
    }
    return saved.grades;
  } catch {
    return empty;
  }
}
