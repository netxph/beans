export function parseQuestionsYaml(source) {
  const database = {};
  let questions;
  let question;

  for (const line of source.split(/\r?\n/)) {
    let match;
    if (!line.trim()) continue;
    if ((match = line.match(/^(\w+):$/))) database[match[1]] = questions = [];
    else if ((match = line.match(/^  - question: (.+)$/))) questions.push(question = { question: JSON.parse(match[1]), choices: [] });
    else if (line === '    choices:') continue;
    else if ((match = line.match(/^      - (.+)$/))) question.choices.push(JSON.parse(match[1]));
    else if ((match = line.match(/^    answer: (.+)$/))) question.answer = JSON.parse(match[1]);
    else throw new Error(`invalid YAML line: ${line}`);
  }

  return database;
}

export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function shuffledQuestion(question, random = Math.random) {
  return { ...question, choices: shuffle(question.choices, random) };
}

export function wrongAnswer(question, chosen) {
  return chosen === question.answer ? null : { question: question.question, chosen, correct: question.answer };
}

const TOPICS = [
  ['Kidneys & Digestion', /kidney|nephron|urine|ureter|large intestine|digest|stomach|esophagus/i],
  ['Vitamins, Minerals & Nutrition', /vitamin|calcium|iron|iodine|zinc|nutrient|hemoglobin|thyroid|wound|diet|meal/i],
  ['Mineral Hardness', /mohs|talc|diamond|scratch|hardness/i],
  ['Sound & Hearing', /sound|decibel|hearing|ear protection|loud|quiet/i],
  ['Earth, Weather & Space', /earth|planet|moon|mercury|venus|mars|jupiter|saturn|season|equator|atmosphere|troposphere|weather|cloud|rotation|revolution/i],
  ['Water, Heat & Light', /ice|freez|water molecule|crystal|density|radiation|conduction|convection|heat|refraction|reflect|optical/i],
  ['Cells & Energy', /cell|mitochond|cellular respiration|organelle|chemical energy/i],
  ['Ecosystems & Relationships', /food chain|food web|predator|prey|consumer|producer|camouflage|mimicry|mutualism|commensalism|parasitism|competition|symbiotic|ecosystem/i],
  ['Animals & Life Cycles', /mammal|bird|reptile|amphibian|butterfl|caterpillar|chrysalis|larva|pupa|egg|dolphin|frog|turtle|feather/i],
  ['Living & Nonliving Things', /living|nonliving|aquarium|grow and needs|air pump|robot|rock and gravel/i],
  ['Plants & Growth', /plant|root|leaf|leaves|stem|flower|xylem|phloem|stomata|soil|seedling|sugar/i],
];

export function studyTopics(wrongAnswers) {
  const counts = new Map();
  for (const answer of wrongAnswers) {
    const text = `${answer.question} ${answer.correct}`;
    const topic = TOPICS.find(([, pattern]) => pattern.test(text))?.[0] ?? 'General Science Review';
    counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).map(([topic, count]) => ({ topic, count }));
}

export function applyAnswer({ lionHp, enemyHp }, correct, enemyDamage) {
  return correct
    ? { lionHp, enemyHp: Math.max(0, enemyHp - 20) }
    : { lionHp: Math.max(0, lionHp - enemyDamage), enemyHp };
}
