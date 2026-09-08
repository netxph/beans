import { expect, test } from 'bun:test';
import { borrowPlace, canCheckout, countCorrectOperations, createRound, digitsFor, scoreAnswer } from './logic.mjs';

test('creates five-item rounds with $300–$500 and non-multiple-of-five prices', () => {
  const round = createRound(() => 0);
  expect(round.money).toBe(300);
  expect(createRound(() => 0.999999).money).toBe(500);
  expect(round.items).toHaveLength(5);
  expect(new Set(round.items.map((item) => item.name)).size).toBe(5);
  expect(createRound(() => 0.123).items.every((item) => item.price % 5 !== 0)).toBe(true);
  expect(createRound(() => 0).items.every((item) => item.price % 5 !== 0)).toBe(true);
  expect(createRound(() => 0.999999).items.every((item) => item.price % 5 !== 0)).toBe(true);
});

test('checkout waits until no remaining item is affordable', () => {
  expect(canCheckout(25, [{ price: 40 }, { price: 60 }])).toBe(true);
  expect(canCheckout(40, [{ price: 40 }, { price: 60 }])).toBe(false);
  expect(canCheckout(100, [])).toBe(true);
});

test('scores exact answers', () => {
  expect(scoreAnswer('375', 400, 25)).toBe(true);
  expect(scoreAnswer('374', 400, 25)).toBe(false);
});

test('regroups one clicked column at a time', () => {
  const firstBorrow = borrowPlace(digitsFor(365), 'ones');
  expect(firstBorrow).toEqual({ hundreds: 3, tens: 5, ones: 15 });
  expect(borrowPlace(firstBorrow, 'tens')).toEqual({ hundreds: 2, tens: 15, ones: 15 });
});

test('scores receipt operations independently at checkout', () => {
  const receipt = [
    { available: 365, price: 67, answer: 298 },
    { available: 298, price: 80, answer: 219 },
    { available: 219, price: 19, answer: 200 }
  ];
  expect(countCorrectOperations(receipt)).toBe(2);
});
