import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { applyAnswer, parseQuestionsYaml, shuffledQuestion, studyTopics, wrongAnswer } from './logic.mjs';

const question = {
  question: 'Which planet is our home?',
  choices: ['Earth', 'Mars', 'Venus', 'Jupiter'],
  answer: 'Earth',
  topic: 'Earth, Weather & Space',
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
    expect(questions.every(({ topic }) => typeof topic === 'string' && topic.trim())).toBe(true);
    expect(questions.every(({ question }) => !/^(What does “|Which choice gives the most accurate meaning of “|Which science term matches this definition: )/.test(question))).toBe(true);
    expect(questions.find(({ question }) => question === 'Plant parts that use light to make food.')).toMatchObject({
      choices: ['Leaves', 'Stem', 'Flower', 'Xylem'], answer: 'Leaves', topic: 'Plants & Growth',
    });
    const marco = (item) => item.question.startsWith('Marco cuts his knee');
    expect(database.easy.some(marco)).toBe(false);
    expect(database.average.some(marco)).toBe(true);
    expect(database.difficult.some(({ question }) => question.startsWith('A class sees this result:'))).toBe(false);
    expect(database.difficult[0].question).toBe('A wilted plant becomes firm after its roots receive water. Which explanation uses the evidence best?');
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
    expect(question.choices).toEqual(['Earth', 'Mars', 'Venus', 'Jupiter']);
  });

  test('only wrong answers are saved for review', () => {
    expect(wrongAnswer(question, 'Earth')).toBeNull();
    expect(wrongAnswer(question, 'Mars')).toEqual({ question: question.question, chosen: 'Mars', correct: 'Earth', topic: question.topic });
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
