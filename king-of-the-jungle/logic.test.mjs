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
      easy: 50,
      average: 50,
      difficult: 58,
      clincher: 20,
    });
    const questions = Object.values(database).flat();
    expect(new Set(questions.map(({ question }) => question)).size).toBe(178);
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
    }
    expect(new Set(questions.map(({ topic }) => topic)).size).toBeGreaterThanOrEqual(10);
    for (const [question, answer] of [
      ['A caterpillar is a young butterfly. What is this stage called?', 'Larva'],
      ['Which plant tissue carries water and minerals from roots toward leaves?', 'Xylem'],
      ['At normal sea-level air pressure, what is the boiling point of pure water?', '100°C'],
      ['Between which two planets is the main asteroid belt?', 'Mars and Jupiter'],
      ['What process inside cells releases usable energy from food?', 'Cellular respiration'],
      ['A toy car travels 12 meters in 4 seconds. What is its average speed?', '3 meters per second'],
      ['Boiling water makes an invisible gas and a visible white cloud above the pot. What is the visible white cloud mainly made of?', 'Tiny liquid water droplets'],
      ['What adaptation allows an organism to blend visually into its surroundings to hide from predators?', 'Camouflage'],
      ['An orchid grows on a tree for support without harming or helping the tree. What relationship does this illustrate?', 'Commensalism'],
      ['How does heat energy travel through the vacuum of space from the Sun to Earth?', 'Radiation'],
      ['Which digestive organ absorbs remaining water and salts from undigested material as it forms stool?', 'Large intestine'],
      ['Which organelle in an animal cell produces most of its usable chemical energy during aerobic cellular respiration?', 'Mitochondrion'],
      ["In which layer of Earth's atmosphere does almost all weather, including rain and storms, occur?", 'Troposphere'],
      ['Which planet rotates fastest on its axis, completing a rotation in less than 10 hours?', 'Jupiter'],
      ['Why does water expand and become less dense when it freezes into ordinary ice?', 'Water molecules form an open crystalline structure'],
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
