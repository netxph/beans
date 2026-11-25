import { expect, test } from 'bun:test';
import { allowedMistakes, COUNTS, createGame, formatEntry, formatTime, handAngles, isOut } from './logic.mjs';

test('allows 30% mistakes, out on the next one', () => {
  expect(COUNTS.map(allowedMistakes)).toEqual([3, 6, 9]);
  expect(isOut(3, 10)).toBe(false);
  expect(isOut(4, 10)).toBe(true);
  expect(isOut(9, 30)).toBe(false);
  expect(isOut(10, 30)).toBe(true);
});

test('creates the chosen number of unique random clock faces, to the minute', () => {
  const minutes = new Set();
  for (let seed = 0; seed < 200; seed++) {
    let s = seed + 1;
    const random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (const count of COUNTS) {
      const game = createGame(count, random);
      expect(game).toHaveLength(count);
      expect(new Set(game.map((q) => q.answer)).size).toBe(count);
      expect(game.every((q) => /^(1[0-2]|[1-9]):[0-5][0-9]$/.test(q.answer))).toBe(true);
      game.forEach((q) => minutes.add(q.time.m));
    }
  }
  expect(minutes.size).toBe(60);
});

test('never repeats a clock even with a stuck random source', () => {
  expect(new Set(createGame(30, () => 0.5).map((q) => q.answer)).size).toBe(30);
});

test('typed numpad digits become a time once minutes are entered', () => {
  expect(formatEntry('')).toBe('');
  expect(formatEntry('4')).toBe('4');
  expect(formatEntry('430')).toBe('4:30');
  expect(formatEntry('1205')).toBe('12:05');
  expect(formatEntry('0430')).toBe('4:30');
  expect(formatEntry('0530')).toBe(formatTime({ h: 5, m: 30 }));
});

test('formats and angles the hands', () => {
  expect(formatTime({ h: 3, m: 5 })).toBe('3:05');
  expect(handAngles({ h: 3, m: 0 })).toEqual({ hour: 90, minute: 0 });
  expect(handAngles({ h: 12, m: 30 })).toEqual({ hour: 15, minute: 180 });
});
