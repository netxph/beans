import { applyAnswer, parseQuestionsYaml, shuffle, shuffledQuestion, studyTopics, wrongAnswer } from './logic.mjs';

const LEVELS = [
  { key: 'easy', label: 'Easy', name: 'Monkey', emoji: '🐒', damage: 20, background: 'jungle' },
  { key: 'average', label: 'Average', name: 'Alligator', emoji: '🐊', damage: 30, background: 'pond' },
  { key: 'difficult', label: 'Difficult', name: 'Hyena', emoji: '🐺', damage: 40, background: 'desert' },
  { key: 'clincher', label: 'Clincher', name: 'Eagle', emoji: '🦅', damage: 50, background: 'sky' },
];

const $ = (id) => document.getElementById(id);
const ui = {
  intro: $('intro'), battle: $('battle'), arena: document.querySelector('.arena'), ending: $('ending'), start: $('startBtn'),
  loadError: $('loadError'), levelLabel: $('levelLabel'), steps: [...document.querySelectorAll('.step')],
  enemyName: $('enemyName'), enemySprite: $('enemySprite'), enemyHp: $('enemyHp'), enemyHpText: $('enemyHpText'),
  animals: [...document.querySelectorAll('input[name="animal"]')], introAnimal: $('introAnimal'), battleTitle: $('battleTitle'),
  playerName: $('playerName'), playerSprite: $('playerSprite'), playerHp: $('playerHp'), playerHpText: $('playerHpText'),
  feedback: $('feedback'), question: $('question'), choices: $('choices'),
  overlay: $('levelOverlay'), overlayEmoji: $('overlayEmoji'), overlayTitle: $('overlayTitle'), overlayText: $('overlayText'),
  continue: $('continueBtn'), endingEmoji: $('endingEmoji'), endingTitle: $('endingTitle'), endingText: $('endingText'), studySummary: $('studySummary'),
  review: $('review'), reviewButton: $('reviewBtn'), reviewSummary: $('reviewSummary'), reviewList: $('reviewList'), reviewBack: $('reviewBackBtn'), again: $('againBtn'),
};

let database;
let game;

function show(visible, ...hidden) {
  visible.classList.remove('hidden');
  hidden.forEach((element) => element.classList.add('hidden'));
}

function validateDatabase(data) {
  return LEVELS.every(({ key }) => Array.isArray(data[key]) && data[key].every((item) =>
    typeof item.question === 'string' && typeof item.topic === 'string' && item.topic.trim() &&
    typeof item.explanation === 'string' && item.explanation.trim() && item.choices?.length === 4 && item.choices.includes(item.answer)
  ));
}

async function loadDatabase() {
  try {
    const response = await fetch('./questions.yaml');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = parseQuestionsYaml(await response.text());
    if (!validateDatabase(data)) throw new Error('invalid question format');
    database = data;
    ui.start.disabled = false;
    ui.start.textContent = 'Enter the Jungle';
  } catch (error) {
    ui.start.textContent = 'Questions unavailable';
    ui.loadError.textContent = `Could not load the question bank (${error.message}).`;
    ui.loadError.classList.remove('hidden');
  }
}

function startGame() {
  const selected = ui.animals.find((animal) => animal.checked);
  game = { animal: { name: selected.value, emoji: selected.dataset.emoji }, level: 0, playerHp: 100, enemyHp: 100, deck: [], current: null, locked: false, answered: 0, correct: 0, wrong: [] };
  ui.playerName.textContent = `YOU · ${game.animal.name.toUpperCase()}`;
  ui.playerSprite.textContent = game.animal.emoji;
  ui.battleTitle.textContent = `${game.animal.emoji} KING OF THE JUNGLE`;
  show(ui.battle, ui.intro, ui.ending, ui.review, ui.overlay);
  startLevel();
}

function startLevel() {
  const level = LEVELS[game.level];
  game.enemyHp = 100;
  game.deck = shuffle(database[level.key]);
  game.locked = false;
  ui.levelLabel.textContent = `Level ${game.level + 1} · ${level.label} · ${level.damage} enemy damage`;
  ui.enemyName.textContent = level.name;
  ui.enemySprite.textContent = level.emoji;
  ui.arena.dataset.background = level.background;
  ui.steps.forEach((step, index) => {
    step.classList.toggle('active', index === game.level);
    step.classList.toggle('done', index < game.level);
  });
  updateHealth();
  nextQuestion();
}

function nextQuestion() {
  if (!game.deck.length) game.deck = shuffle(database[LEVELS[game.level].key]);
  game.current = shuffledQuestion(game.deck.pop());
  game.locked = false;
  ui.feedback.textContent = 'Choose the best answer.';
  ui.question.textContent = game.current.question;
  ui.choices.replaceChildren(...game.current.choices.map((choice, index) => {
    const button = document.createElement('button');
    button.className = 'choice';
    button.type = 'button';
    button.dataset.choice = choice;
    button.innerHTML = `<span class="key">${index + 1}</span><span></span>`;
    button.lastElementChild.textContent = choice;
    button.addEventListener('click', () => answer(choice));
    return button;
  }));
  ui.choices.firstElementChild?.focus({ preventScroll: true });
}

function answer(choice) {
  if (game.locked) return;
  game.locked = true;
  game.answered++;
  const wrong = wrongAnswer(game.current, choice);
  const correct = !wrong;
  if (correct) game.correct++;
  else game.wrong.push(wrong);

  const result = applyAnswer(game, correct, LEVELS[game.level].damage);
  game.playerHp = result.playerHp;
  game.enemyHp = result.enemyHp;
  updateHealth();

  [...ui.choices.children].forEach((button) => {
    button.disabled = true;
    if (button.dataset.choice === game.current.answer) button.classList.add('correct');
    else if (button.dataset.choice === choice) button.classList.add('wrong');
  });

  if (correct) {
    ui.feedback.textContent = `Correct! Your attack deals 20 damage to ${LEVELS[game.level].name}.`;
    animate(ui.playerSprite, 'attack-left');
    animate(ui.enemySprite, 'hurt');
  } else {
    ui.feedback.textContent = `Not quite — the answer is ${game.current.answer}. You take ${LEVELS[game.level].damage} damage.`;
    animate(ui.enemySprite, 'attack-right');
    animate(ui.playerSprite, 'hurt');
  }

  setTimeout(resolveTurn, 900);
}

function resolveTurn() {
  if (game.playerHp === 0) return endGame(false);
  if (game.enemyHp === 0) {
    if (game.level === LEVELS.length - 1) return endGame(true);
    const next = LEVELS[game.level + 1];
    ui.overlayEmoji.textContent = next.emoji;
    ui.overlayTitle.textContent = `${LEVELS[game.level].name} defeated!`;
    ui.overlayText.textContent = `${game.playerHp} HP remains. Next: ${next.name} with ${next.label.toLowerCase()} questions and ${next.damage} damage per wrong answer.`;
    ui.overlay.classList.remove('hidden');
    ui.continue.focus();
    return;
  }
  nextQuestion();
}

function continueBattle() {
  ui.overlay.classList.add('hidden');
  game.level++;
  startLevel();
}

function endGame(won) {
  show(ui.ending, ui.battle, ui.review, ui.overlay, ui.intro);
  ui.endingEmoji.textContent = won ? `${game.animal.emoji} 👑` : '🌧️';
  ui.endingTitle.textContent = won ? 'You are King of the Jungle!' : 'The jungle wins this round';
  ui.endingText.textContent = won
    ? `Your ${game.animal.name.toLowerCase()} defeated all four challengers with ${game.playerHp} HP left. You answered ${game.correct} of ${game.answered} questions correctly.`
    : `You reached ${LEVELS[game.level].name} and answered ${game.correct} of ${game.answered} questions correctly. Try the climb again!`;
  const topics = studyTopics(game.wrong);
  ui.studySummary.textContent = topics.length
    ? `Science topics to study: ${topics.map(({ topic, count }) => `${topic} (${count})`).join(', ')}.`
    : 'Science topics to study: none — perfect work!';
  ui.reviewButton.focus();
}

function showReview() {
  ui.reviewSummary.textContent = game.wrong.length
    ? `You missed ${game.wrong.length} of ${game.answered} questions.`
    : 'Perfect game — no wrong answers to review!';
  ui.reviewList.replaceChildren(...game.wrong.map((answer, index) => {
    const item = document.createElement('article');
    item.className = 'review-item';

    const question = document.createElement('strong');
    question.textContent = `${index + 1}. ${answer.question}`;
    const chosen = document.createElement('p');
    chosen.className = 'review-chosen';
    chosen.textContent = `Your answer: ${answer.chosen}`;
    const correct = document.createElement('p');
    correct.className = 'review-correct';
    correct.textContent = `Correct answer: ${answer.correct}`;

    const explanation = document.createElement('p');
    explanation.className = 'review-explanation';
    explanation.textContent = `Why: ${answer.explanation}`;

    item.append(question, chosen, correct, explanation);
    return item;
  }));
  show(ui.review, ui.ending);
  ui.reviewBack.focus();
}

function updateHealth() {
  setHealth(ui.playerHp, ui.playerHpText, game.playerHp);
  setHealth(ui.enemyHp, ui.enemyHpText, game.enemyHp);
}

function setHealth(bar, text, hp) {
  bar.style.width = `${hp}%`;
  bar.style.background = hp > 50 ? '#43c862' : hp > 20 ? '#f0bd36' : '#df473d';
  text.textContent = `${hp}/100`;
}

function animate(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  setTimeout(() => element.classList.remove(className), 500);
}

function chooseByKey(key) {
  if (ui.battle.classList.contains('hidden') || game?.locked) return;
  const index = Number(key) - 1;
  if (index >= 0 && index < 4) ui.choices.children[index]?.click();
}

document.addEventListener('keydown', (event) => chooseByKey(event.key));
window.addEventListener('message', (event) => {
  if (event.origin === location.origin && event.data?.type === 'beans-key') chooseByKey(event.data.key);
});
ui.start.addEventListener('click', startGame);
ui.continue.addEventListener('click', continueBattle);
ui.reviewButton.addEventListener('click', showReview);
ui.reviewBack.addEventListener('click', () => {
  show(ui.ending, ui.review);
  ui.reviewButton.focus();
});
ui.animals.forEach((animal) => animal.addEventListener('change', () => {
  ui.introAnimal.textContent = animal.dataset.emoji;
}));
ui.again.addEventListener('click', () => {
  show(ui.intro, ui.ending, ui.review, ui.battle, ui.overlay);
  ui.animals.find((animal) => animal.checked).focus();
});

loadDatabase();
