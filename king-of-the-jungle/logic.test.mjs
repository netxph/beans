import { describe, expect, test } from 'bun:test';
import { applyAnswer, shuffledQuestion } from './logic.mjs';

const question = {
  question: 'Which planet is our home?',
  choices: ['Earth', 'Mars', 'Venus', 'Jupiter'],
  answer: 'Earth',
};

describe('battle logic', () => {
  test('correct answers hurt only the enemy', () => {
    expect(applyAnswer({ lionHp: 80, enemyHp: 100 }, true, 15)).toEqual({ lionHp: 80, enemyHp: 80 });
  });

  test('wrong answers hurt only the lion without dropping below zero', () => {
    expect(applyAnswer({ lionHp: 10, enemyHp: 60 }, false, 15)).toEqual({ lionHp: 0, enemyHp: 60 });
  });

  test('choices are shuffled without changing the source question', () => {
    const result = shuffledQuestion(question, () => 0);
    expect(result.choices).toEqual(['Mars', 'Venus', 'Jupiter', 'Earth']);
    expect(result.answer).toBe('Earth');
    expect(question.choices).toEqual(['Earth', 'Mars', 'Venus', 'Jupiter']);
  });
});
