import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { applyAnswer, parseQuestionsYaml, shuffledQuestion, studyTopics, wrongAnswer } from './logic.mjs';

const question = {
  question: 'Which planet is our home?',
  choices: ['Earth', 'Mars', 'Venus', 'Jupiter'],
  answer: 'Earth',
  topic: 'Earth, Weather & Space',
  explanation: 'Earth is the planet where people live. It has liquid water and air that support life.',
};

describe('question database', () => {
  test('parses the YAML question format', () => {
    expect(parseQuestionsYaml(`easy:
  - question: "Which planet is our home?"
    choices:
      - "Earth"
      - "Mars"
      - "Venus"
      - "Jupiter"
    answer: "Earth"
    topic: "Earth, Weather & Space"
    explanation: "Earth is the planet where people live. It has liquid water and air that support life."
`)).toEqual({ easy: [question] });
  });

  test('contains every round at the requested size', async () => {
    const database = parseQuestionsYaml(await readFile(new URL('./questions.yaml', import.meta.url), 'utf8'));
    expect(Object.fromEntries(Object.entries(database).map(([level, questions]) => [level, questions.length]))).toEqual({
      easy: 100,
      average: 100,
      difficult: 100,
      clincher: 50,
    });
    const questions = Object.values(database).flat();
    expect(new Set(questions.map(({ question }) => question)).size).toBe(350);
    for (const item of questions) {
      expect(Object.keys(item).sort()).toEqual(['answer', 'choices', 'explanation', 'question', 'topic']);
      expect(typeof item.question).toBe('string');
      expect(item.question.trim()).not.toBe('');
      expect(typeof item.topic).toBe('string');
      expect(item.topic.trim()).not.toBe('');
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices).size).toBe(4);
      expect(item.choices.every((choice) => typeof choice === 'string' && choice.trim())).toBe(true);
      expect(item.choices).toContain(item.answer);
      expect(typeof item.explanation).toBe('string');
      expect(item.explanation.trim()).not.toBe('');
      expect(item.explanation).not.toBe(item.answer);
      const text = [item.question, ...item.choices, item.explanation].join(' ');
      // Vitamin names such as B12 are names, not numerical recall questions.
      expect(text.replace(/\bB\d+\b/g, '')).not.toMatch(/\d|[=×÷°]/);
    }
    for (const level of Object.values(database)) {
      expect([...new Set(level.map(({ topic }) => topic))].sort()).toEqual([
        'Animals & Life Cycles', 'Cells & Energy', 'Earth, Weather & Space',
        'Ecosystems & Relationships', 'Forces & Motion', 'Kidneys & Digestion',
        'Light & Sound', 'Matter & Materials', 'Minerals & Hardness',
        'Plants & Growth', 'Vitamins & Minerals',
      ]);
    }
    for (const [question, answer] of [
      ['Which animal is a mammal?', 'Dolphin'],
      ['Which plant tissue carries water and minerals from the roots up to the leaves?', 'Xylem'],
      ['Marco cuts his knee while playing. Which nutrient pair helps his body repair tissues and heal the wound?', 'Vitamin C and zinc'],
      ['Toy cars A and B travel along the same track. A reaches the finish before B. Which statement is correct?', 'Car A has a greater average speed.'],
      ['Which soft mineral is commonly used to make plaster?', 'Gypsum'],
      ['Which term means an object keeps the same speed during a trip?', 'Constant speed'],
    ]) {
      expect(questions.find((item) => item.question === question)?.answer).toBe(answer);
    }
  });
});

describe('battle logic', () => {
  test('correct answers hurt only the enemy', () => {
    expect(applyAnswer({ playerHp: 80, enemyHp: 100 }, true, 15)).toEqual({ playerHp: 80, enemyHp: 80 });
  });

  test('wrong answers hurt only the player without dropping below zero', () => {
    expect(applyAnswer({ playerHp: 10, enemyHp: 60 }, false, 15)).toEqual({ playerHp: 0, enemyHp: 60 });
  });

  test('choices are shuffled without changing the source question', () => {
    const result = shuffledQuestion(question, () => 0);
    expect(result.choices).toEqual(['Mars', 'Venus', 'Jupiter', 'Earth']);
    expect(result.answer).toBe('Earth');
    expect(result.explanation).toBe(question.explanation);
    expect(question.choices).toEqual(['Earth', 'Mars', 'Venus', 'Jupiter']);
  });

  test('only wrong answers are saved for review', () => {
    expect(wrongAnswer(question, 'Earth')).toBeNull();
    expect(wrongAnswer(question, 'Mars')).toEqual({ question: question.question, chosen: 'Mars', correct: 'Earth', topic: question.topic, explanation: question.explanation });
  });

  test('summarizes study topics from wrong answers', () => {
    expect(studyTopics([
      { question: 'What does xylem carry?', topic: 'Plants & Growth' },
      { question: 'Why did the plant wilt?', topic: 'Plants & Growth' },
      { question: 'In this food chain, what does the frog eat?', topic: 'Ecosystems & Relationships' },
    ])).toEqual([
      { topic: 'Plants & Growth', count: 2 },
      { topic: 'Ecosystems & Relationships', count: 1 },
    ]);
  });
});
