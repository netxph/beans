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
