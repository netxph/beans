import { applyAnswer, parseQuestionsYaml, shuffle, shuffledQuestion } from './logic.mjs';

const LEVELS = [
  { key: 'easy', label: 'Easy', name: 'Monkey', emoji: '🐒', damage: 10 },
  { key: 'average', label: 'Average', name: 'Crocodile', emoji: '🐊', damage: 15 },
  { key: 'difficult', label: 'Difficult', name: 'Tiger', emoji: '🐯', damage: 20 },
];

const $ = (id) => document.getElementById(id);
const ui = {
  intro: $('intro'), battle: $('battle'), ending: $('ending'), start: $('startBtn'),
  loadError: $('loadError'), levelLabel: $('levelLabel'), steps: [...document.querySelectorAll('.step')],
  enemyName: $('enemyName'), enemySprite: $('enemySprite'), enemyHp: $('enemyHp'), enemyHpText: $('enemyHpText'),
  lionSprite: $('lionSprite'), lionHp: $('lionHp'), lionHpText: $('lionHpText'),
  feedback: $('feedback'), question: $('question'), choices: $('choices'),
  overlay: $('levelOverlay'), overlayEmoji: $('overlayEmoji'), overlayTitle: $('overlayTitle'), overlayText: $('overlayText'),
  continue: $('continueBtn'), endingEmoji: $('endingEmoji'), endingTitle: $('endingTitle'), endingText: $('endingText'), again: $('againBtn'),
};

let database;
let game;

function show(visible, ...hidden) {
  visible.classList.remove('hidden');
  hidden.forEach((element) => element.classList.add('hidden'));
}

function validateDatabase(data) {
  return LEVELS.every(({ key }) => Array.isArray(data[key]) && data[key].every((item) =>
    typeof item.question === 'string' && item.choices?.length === 4 && item.choices.includes(item.answer)
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
  game = { level: 0, lionHp: 100, enemyHp: 100, deck: [], current: null, locked: false, answered: 0, correct: 0 };
  show(ui.battle, ui.intro, ui.ending, ui.overlay);
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
  const correct = choice === game.current.answer;
  if (correct) game.correct++;

  const result = applyAnswer(game, correct, LEVELS[game.level].damage);
  game.lionHp = result.lionHp;
  game.enemyHp = result.enemyHp;
  updateHealth();

  [...ui.choices.children].forEach((button) => {
    button.disabled = true;
    if (button.dataset.choice === game.current.answer) button.classList.add('correct');
    else if (button.dataset.choice === choice) button.classList.add('wrong');
  });

  if (correct) {
    ui.feedback.textContent = `Correct! Your roar deals 20 damage to ${LEVELS[game.level].name}.`;
    animate(ui.lionSprite, 'attack-left');
    animate(ui.enemySprite, 'hurt');
  } else {
    ui.feedback.textContent = `Not quite — the answer is ${game.current.answer}. You take ${LEVELS[game.level].damage} damage.`;
    animate(ui.enemySprite, 'attack-right');
    animate(ui.lionSprite, 'hurt');
  }

  setTimeout(resolveTurn, 900);
}

function resolveTurn() {
  if (game.lionHp === 0) return endGame(false);
  if (game.enemyHp === 0) {
    if (game.level === LEVELS.length - 1) return endGame(true);
    const next = LEVELS[game.level + 1];
    ui.overlayEmoji.textContent = next.emoji;
    ui.overlayTitle.textContent = `${LEVELS[game.level].name} defeated!`;
    ui.overlayText.textContent = `${game.lionHp} HP remains. Next: ${next.name} with ${next.label.toLowerCase()} questions and ${next.damage} damage per wrong answer.`;
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
  show(ui.ending, ui.battle, ui.overlay, ui.intro);
  ui.endingEmoji.textContent = won ? '👑' : '🌧️';
  ui.endingTitle.textContent = won ? 'You are King of the Jungle!' : 'The jungle wins this round';
  ui.endingText.textContent = won
    ? `The lion defeated all three challengers with ${game.lionHp} HP left. You answered ${game.correct} of ${game.answered} questions correctly.`
    : `You reached ${LEVELS[game.level].name} and answered ${game.correct} of ${game.answered} questions correctly. Try the climb again!`;
  ui.again.focus();
}

function updateHealth() {
  setHealth(ui.lionHp, ui.lionHpText, game.lionHp);
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
ui.again.addEventListener('click', startGame);

loadDatabase();
