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

export function applyAnswer({ lionHp, enemyHp }, correct, enemyDamage) {
  return correct
    ? { lionHp, enemyHp: Math.max(0, enemyHp - 20) }
    : { lionHp: Math.max(0, lionHp - enemyDamage), enemyHp };
}
