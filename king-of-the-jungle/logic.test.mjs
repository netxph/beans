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

  test('keeps the schema, grade 3 science topics, and 50 items per difficulty', async () => {
    const database = parseQuestionsYaml(await readFile(new URL('./questions.yaml', import.meta.url), 'utf8'));
    expect(Object.keys(database)).toEqual(['easy', 'average', 'difficult', 'clincher']);
    for (const questions of Object.values(database)) expect(questions).toHaveLength(50);

    const validTopics = ['Living Things', 'Matter', 'Force, Motion, and Energy', 'Earth and Space'];
    const questions = Object.values(database).flat();
    expect(questions).toHaveLength(200);
    expect(new Set(questions.map(({ question }) => question)).size).toBe(200);

    for (const item of questions) {
      expect(Object.keys(item).sort()).toEqual(['answer', 'choices', 'explanation', 'question', 'topic']);
      expect(typeof item.question).toBe('string');
      expect(item.question.trim()).not.toBe('');
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices).size).toBe(4);
      expect(item.choices.every((choice) => typeof choice === 'string' && choice.trim())).toBe(true);
      expect(item.choices).toContain(item.answer);
      expect(validTopics).toContain(item.topic);
      expect(typeof item.explanation).toBe('string');
      expect(item.explanation.trim()).not.toBe('');

      for (const random of [() => 0, () => 0.5, () => 0.999]) {
        const shuffled = shuffledQuestion(item, random);
        expect(shuffled.choices).not.toBe(item.choices);
        expect([...shuffled.choices].sort()).toEqual([...item.choices].sort());
        expect(shuffled.choices).toContain(shuffled.answer);
        expect(shuffled.answer).toBe(item.answer);
      }
    }

    for (const topic of validTopics) {
      expect(questions.filter((item) => item.topic === topic).length).toBeGreaterThanOrEqual(40);
    }
  });
});

describe('battle logic', () => {
  test('correct answers hurt only the enemy', () => {
    expect(applyAnswer({ playerHp: 80, enemyHp: 100 }, true, 15)).toEqual({ playerHp: 80, enemyHp: 90 });
  });

  test('a powered hit doubles damage and clamps enemy health at zero', () => {
    expect(applyAnswer({ playerHp: 80, enemyHp: 100 }, true, 15, 20)).toEqual({ playerHp: 80, enemyHp: 80 });
    expect(applyAnswer({ playerHp: 80, enemyHp: 10 }, true, 15, 20)).toEqual({ playerHp: 80, enemyHp: 0 });
    expect(applyAnswer({ playerHp: 80, enemyHp: 100 }, false, 15, 20)).toEqual({ playerHp: 65, enemyHp: 100 });
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
