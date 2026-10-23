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

  test('keeps the schema, PDF categories, answer keys, and at least 20 items per difficulty', async () => {
    const database = parseQuestionsYaml(await readFile(new URL('./questions.yaml', import.meta.url), 'utf8'));
    expect(Object.keys(database)).toEqual(['easy', 'average', 'difficult', 'clincher']);
    for (const questions of Object.values(database)) expect(questions.length).toBeGreaterThanOrEqual(20);

    // Correct-answer markers from the PDFs, in original question order (not the learner's selections).
    const sources = {
      ec: { topic: 'Elementary Chemistry', key: 'BCABAABBBACBCCCADACABCCABACBCB' },
      es: { topic: 'Earth Science', key: 'CDABCBDACBDBDACABDCBACBDCBADDC' },
      hr: { topic: 'Heat Round', key: 'BABABAAABCABABCBCCBCACCBCBBABA' },
      is: { topic: 'Integrated Science', key: 'ACDBACAAABABCABABBBBAACBBABABC' },
      ps: { topic: 'Physical Science', key: 'CACBBCABACDBBCBCCBCACBCACACBDC' },
    };
    const questions = Object.values(database).flat();
    expect(questions).toHaveLength(150);
    expect(new Set(questions.map(({ question }) => question)).size).toBe(150);
    const sourceIds = new Set();
    for (const item of questions) {
      expect(Object.keys(item).sort()).toEqual(['answer', 'choices', 'explanation', 'question', 'topic']);
      expect(typeof item.question).toBe('string');
      expect(item.question.trim()).not.toBe('');
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices).size).toBe(4);
      expect(item.choices.every((choice) => typeof choice === 'string' && choice.trim())).toBe(true);
      expect(item.choices).toContain(item.answer);
      const provenance = item.explanation.match(/^cm-(ec|es|hr|is|ps)\.pdf, question (\d+): (.+)$/);
      expect(provenance).not.toBeNull();
      const [, code, number, explanation] = provenance;
      expect(Number(number)).toBeGreaterThanOrEqual(1);
      expect(Number(number)).toBeLessThanOrEqual(30);
      expect(item.topic).toBe(sources[code].topic);
      expect(item.answer).toBe(item.choices['ABCD'.indexOf(sources[code].key[Number(number) - 1])]);
      expect(explanation.trim()).not.toBe('');
      sourceIds.add(`${code}:${number}`);
      expect(item.question).not.toMatch(/ClassMarker|https:\/\/|BRIANNE|For questions? \d/i);

      for (const random of [() => 0, () => 0.5, () => 0.999]) {
        const shuffled = shuffledQuestion(item, random);
        expect(shuffled.choices).not.toBe(item.choices);
        expect([...shuffled.choices].sort()).toEqual([...item.choices].sort());
        expect(shuffled.choices).toContain(shuffled.answer);
        expect(shuffled.answer).toBe(item.answer);
      }
    }
    expect(sourceIds.size).toBe(150);
    for (const { topic } of Object.values(sources)) {
      expect(questions.filter((item) => item.topic === topic)).toHaveLength(30);
    }

    const from = (code, number) => questions.find((item) => item.explanation.startsWith(`cm-${code}.pdf, question ${number}:`));
    expect(from('es', 7).question).toContain('Ana — A meteor burns up');
    expect(from('es', 7).question).toContain('Which student describes');
    expect(from('es', 9).question).toContain('Z — Auroras commonly occur.');
    expect(from('es', 22).question).toContain('X — A factory accidentally releases');
    expect(from('es', 26).question).toContain('A factory releases wastewater');
    expect(from('ps', 25).question).toContain('X — No — An apple falls toward Earth.');
    expect(from('hr', 6).question).toContain('Grass → Grasshopper → Frog → Hawk');
    expect(from('hr', 17).question).toContain('Aquarium picture labels:');
    expect(from('ps', 29).question).toEndWith('How far does it travel?');
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
