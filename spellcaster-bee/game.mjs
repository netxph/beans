import { LEVELS, parseWordsYaml, createRound, selectBubble, removeLetter, spelledWord, submitSpell, nextWord, readProgress } from './logic.mjs';

const ids = 'intro introTitle reviewBtn review reviewTitle reviewDeck reviewCount reviewPrevBtn reviewNextBtn reviewHomeBtn lesson levelTitle rankBadge levelCards loading loadError speechWarning storageWarning questionCount mistakes wordProgress listenBtn workshop slots slotHint undoBtn selectionStatus bubbleArea bubbles submitBtn feedback feedbackTitle feedbackText nextBtn diploma diplomaTitle wizardTitle diplomaGrade diplomaScore graduateBtn diplomaHomeBtn supreme supremeTitle courseGrades courseGrade supremeHomeBtn';
const ui = Object.fromEntries(ids.split(' ').map((id) => [id, document.getElementById(id)]));
const STORAGE_KEY = 'spellcaster-bee.graduation.v1';
const speech = window.speechSynthesis;
const speechAvailable = !!speech && typeof window.SpeechSynthesisUtterance === 'function';
// shortcut: browsers expose no gender, so recognize named male voices; add a picker for ambiguous device voices.
const MALE_VOICE_NAME = /\b(male|alex|aaron|fred|tom|daniel|david|mark|george|guy|ryan|james|oliver|andrew|brian|christopher|eric|evan|arthur|rishi)\b/i;
let bank;
let bankSignature;
let grades = [null, null, null];
let levelIndex = 0;
let round;
let speechId = 0;
let speechTimer;
let activeUtterance;

function showScreen(name) {
  for (const screen of ['intro', 'review', 'lesson', 'diploma', 'supreme']) ui[screen].hidden = screen !== name;
  window.scrollTo(0, 0);
  ui[name === 'lesson' ? 'levelTitle' : `${name}Title`].focus({ preventScroll: true });
}

function speechWarning(message) {
  ui.speechWarning.textContent = message;
  ui.speechWarning.hidden = !message;
}

function englishVoice() {
  const voices = speech?.getVoices() ?? [];
  const english = voices.filter((voice) => /^en(?:[-_]|$)/i.test(voice.lang));
  const male = english.filter((voice) => MALE_VOICE_NAME.test(voice.name ?? ''));
  const candidates = male.length ? male : english;
  const british = candidates.filter((voice) => /^en[-_]GB$/i.test(voice.lang));
  return british.find((voice) => voice.localService) ?? british[0] ?? candidates.find((voice) => voice.localService) ?? candidates[0];
}

function stopSpeech() {
  speechId++;
  clearTimeout(speechTimer);
  speech?.cancel();
  activeUtterance = null;
}

function speakWord() {
  if (!round || round.phase !== 'spelling' || ui.lesson.hidden || !speechAvailable) return;
  stopSpeech();
  speechWarning('');
  const voice = englishVoice();
  if (speech.getVoices().length && !voice) return;
  const id = speechId;
  activeUtterance = new window.SpeechSynthesisUtterance(round.words[round.index]);
  activeUtterance.lang = voice?.lang ?? 'en-GB';
  if (voice) activeUtterance.voice = voice;
  activeUtterance.rate = 0.78;
  activeUtterance.pitch = 1;
  activeUtterance.onstart = () => {
    if (id !== speechId) return;
    clearTimeout(speechTimer);
    speechWarning('');
  };
  activeUtterance.onend = () => {
    if (id !== speechId) return;
    clearTimeout(speechTimer);
    activeUtterance = null;
  };
  activeUtterance.onerror = (event) => {
    if (id !== speechId) return;
    clearTimeout(speechTimer);
    activeUtterance = null;
    if (['voice-unavailable', 'language-unavailable', 'synthesis-unavailable'].includes(event.error)) {
      speechWarning('');
      return;
    }
    speechWarning('The master’s voice could not play. Check the volume and device English voice settings, then tap “Hear word again”. Some voices need an internet connection.');
  };
  speechTimer = setTimeout(() => {
    if (id === speechId && voice) speechWarning('The master’s voice hasn’t started. Check the volume, tap “Hear word again”, or enable an English voice in device settings.');
  }, 8000);
  try {
    speech.speak(activeUtterance);
  } catch {
    clearTimeout(speechTimer);
    speechWarning('Speech could not start. Tap “Hear word again”, or try a browser with an English voice installed.');
  }
}

function storageWarning() {
  ui.storageWarning.textContent = 'Diplomas can’t be saved on this device right now. You can still play, but progress will be lost when you close the game.';
  ui.storageWarning.hidden = false;
}

function renderAcademy() {
  const nextLevel = grades.findIndex((grade) => grade === null);
  ui.levelCards.replaceChildren(...LEVELS.map((level, index) => {
    const locked = index > 0 && grades[index - 1] === null;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `level-card${index === nextLevel ? ' recommended' : ''}`;
    button.disabled = locked || !speechAvailable;
    button.innerHTML = '<span class="level-icon" aria-hidden="true"></span><span class="level-copy"><strong></strong><small></small></span><span class="level-state"></span>';
    button.children[0].textContent = locked ? '🔒' : grades[index] !== null ? '📜' : '✦';
    button.children[1].children[0].textContent = `${level.label} class`;
    button.children[1].children[1].textContent = level.title;
    button.children[2].textContent = locked ? 'Locked' : grades[index] !== null ? `${grades[index]}% · Replay` : 'Start →';
    button.addEventListener('click', () => startLevel(index));
    return button;
  }));
  ui.loading.hidden = nextLevel !== -1;
  ui.loading.textContent = '👑 Supreme Spellcaster — all three diplomas earned!';
}

async function loadBank() {
  try {
    const response = await fetch('./words.yaml');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    bank = parseWordsYaml(await response.text());
    bankSignature = JSON.stringify(bank);
    ui.reviewBtn.disabled = false;
    try {
      grades = readProgress(window.localStorage.getItem(STORAGE_KEY), bankSignature);
    } catch {
      storageWarning();
    }
    renderAcademy();
  } catch (error) {
    ui.loading.hidden = true;
    ui.loadError.textContent = `The spell book couldn’t open: ${error.message} Check spellcaster-bee/words.yaml and reload.`;
    ui.loadError.hidden = false;
  }
}

function openReview() {
  if (!bank || ui.intro.hidden) return;
  stopSpeech();
  const words = Object.values(bank).flat().sort();
  const pageCount = Math.ceil(words.length / 10);
  ui.reviewDeck.replaceChildren(...Array.from({ length: pageCount }, (_, index) => {
    const start = index * 10;
    const pageWords = words.slice(start, start + 10);
    const card = document.createElement('article');
    card.className = 'review-card';
    card.setAttribute('role', 'group');
    card.setAttribute('aria-roledescription', 'slide');
    card.setAttribute('aria-label', `Page ${index + 1} of ${pageCount}`);
    const heading = document.createElement('p');
    heading.className = 'eyebrow';
    heading.textContent = `Words ${start + 1}–${start + pageWords.length}`;
    const list = document.createElement('ul');
    list.className = 'review-list';
    list.replaceChildren(...pageWords.map((word) => {
      const item = document.createElement('li');
      item.className = 'review-word';
      item.style.setProperty('--word-length', word.length);
      item.textContent = word;
      return item;
    }));
    card.append(heading, list);
    return card;
  }));
  showScreen('review');
  ui.reviewDeck.scrollTo({ left: 0, behavior: 'instant' });
  updateReview();
}

function updateReview() {
  if (ui.review.hidden) return;
  const count = ui.reviewDeck.children.length;
  const position = Math.max(0, Math.min(count - 1, Math.round(ui.reviewDeck.scrollLeft / ui.reviewDeck.clientWidth)));
  const label = `Page ${position + 1} / ${count}`;
  if (ui.reviewCount.textContent !== label) ui.reviewCount.textContent = label;
  ui.reviewPrevBtn.disabled = position === 0;
  ui.reviewNextBtn.disabled = position === count - 1;
}

function moveReview(offset) {
  if (ui.review.hidden) return;
  const width = ui.reviewDeck.clientWidth;
  const position = Math.round(ui.reviewDeck.scrollLeft / width);
  ui.reviewDeck.scrollTo({ left: (position + offset) * width, behavior: 'instant' });
  updateReview();
}

function startLevel(index) {
  if (!bank || !speechAvailable || !LEVELS[index] || (index > 0 && grades[index - 1] === null)) return;
  levelIndex = index;
  round = createRound(bank[LEVELS[index].key]);
  ui.levelTitle.textContent = `${LEVELS[index].label} class`;
  ui.rankBadge.textContent = `CLASS ${index + 1}`;
  renderSpell();
  showScreen('lesson');
  speakWord();
}

function undoLetter(position) {
  if (!round || ui.lesson.hidden) return;
  const id = round.selected[position];
  const updated = removeLetter(round, position);
  if (updated === round) return;
  round = updated;
  renderSpell();
  ui.bubbles.children[id]?.focus({ preventScroll: true });
}

function renderSpell() {
  const spelling = round.phase === 'spelling';
  const size = round.words[round.index].length;
  ui.questionCount.textContent = `Word ${round.index + 1} / 10`;
  ui.mistakes.textContent = `Mistakes: ${round.mistakes} / 3`;
  ui.mistakes.classList.toggle('danger', round.mistakes >= 3);
  ui.wordProgress.value = round.index + Number(!spelling);
  ui.workshop.dataset.effect = spelling ? 'idle' : round.last.correct ? 'success' : 'explosion';
  ui.slotHint.textContent = spelling ? 'Your spell · Tap the last letter or Undo' : 'Your spelling spell';
  ui.slots.style.setProperty('--word-length', size);
  ui.undoBtn.hidden = !spelling;
  ui.undoBtn.disabled = !spelling || round.selected.length === 0;
  ui.selectionStatus.textContent = `${round.selected.length} of ${size} letters placed: ${[...spelledWord(round)].join(', ') || 'none'}.`;
  ui.slots.replaceChildren(...Array.from({ length: size }, (_, index) => {
    const filled = index < round.selected.length;
    const removable = spelling && filled && index === round.selected.length - 1;
    const letter = filled ? round.bubbles[round.selected[index]].letter : '';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `slot${filled ? ' filled' : ''}${removable ? ' removable' : ''}`;
    button.textContent = letter;
    button.disabled = !removable;
    button.setAttribute('aria-label', removable ? `Remove last letter, ${letter}` : `Letter ${index + 1}: ${letter || 'empty'}`);
    button.addEventListener('click', () => undoLetter(index));
    return button;
  }));
  ui.bubbles.replaceChildren(...round.bubbles.map(({ id, letter }) => {
    const used = round.selected.includes(id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `bubble${used ? ' used' : ''}`;
    button.textContent = letter;
    button.disabled = !spelling || used || round.selected.length === size;
    button.setAttribute('aria-label', `Add letter ${letter}`);
    button.addEventListener('click', () => {
      const updated = selectBubble(round, id);
      if (updated === round) return;
      round = updated;
      renderSpell();
      const next = [...ui.bubbles.children].find((bubble) => !bubble.disabled);
      (next ?? ui.submitBtn).focus({ preventScroll: true });
    });
    return button;
  }));
  ui.bubbleArea.hidden = !spelling;
  ui.submitBtn.hidden = !spelling;
  ui.submitBtn.disabled = !spelling || round.selected.length !== size;
  ui.listenBtn.disabled = !spelling;
  ui.feedback.hidden = spelling;
  ui.nextBtn.hidden = spelling;
  if (!spelling) {
    ui.feedback.dataset.correct = String(round.last.correct);
    ui.feedbackTitle.textContent = round.last.correct ? 'A perfectly spelled potion!' : 'Poof! Not quite this time.';
    ui.feedbackText.textContent = round.last.correct
      ? `“${round.last.word}” — you got it, Bee!`
      : `The word was “${round.last.word}”. You spelled “${round.last.answer}”. ${round.phase === 'failed' ? 'That’s 4 mistakes. Let’s practise this class again — your earlier diplomas are safe.' : 'Take a good look, then try the next spell!'}`;
    ui.nextBtn.textContent = round.phase === 'failed' ? `Try ${LEVELS[levelIndex].label.toLowerCase()} class again ↻`
      : round.phase === 'passed' ? 'Collect your diploma →' : 'Next word →';
  }
}

function recordGrade() {
  grades[levelIndex] = Math.max(grades[levelIndex] ?? 0, round.correct * 10);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ bank: bankSignature, grades }));
  } catch {
    storageWarning();
  }
}

function castSpell() {
  if (!round || ui.lesson.hidden) return;
  const updated = submitSpell(round);
  if (updated === round) return;
  stopSpeech();
  round = updated;
  if (round.phase === 'passed') recordGrade();
  renderSpell();
  ui.nextBtn.focus({ preventScroll: true });
}

function showDiploma() {
  ui.wizardTitle.textContent = LEVELS[levelIndex].title;
  ui.diplomaGrade.textContent = `${round.correct * 10}%`;
  ui.diplomaScore.textContent = `${round.correct} of 10 words correct · ${round.mistakes} ${round.mistakes === 1 ? 'mistake' : 'mistakes'}`;
  ui.graduateBtn.textContent = levelIndex === 2 ? 'Claim your Supreme Spellcaster title ✦' : `Enter ${LEVELS[levelIndex + 1].label.toLowerCase()} class →`;
  showScreen('diploma');
}

function showSupreme() {
  ui.courseGrades.replaceChildren(...LEVELS.map((level, index) => {
    const card = document.createElement('div');
    const label = document.createElement('span');
    label.textContent = level.label;
    const grade = document.createElement('strong');
    grade.textContent = `${grades[index]}%`;
    card.append(label, grade);
    return card;
  }));
  ui.courseGrade.textContent = `Best course grade: ${Math.round(grades.reduce((sum, grade) => sum + grade, 0) / 3)}%`;
  showScreen('supreme');
}

function returnHome() {
  stopSpeech();
  renderAcademy();
  showScreen('intro');
}

ui.reviewBtn.addEventListener('click', openReview);
ui.reviewPrevBtn.addEventListener('click', () => moveReview(-1));
ui.reviewNextBtn.addEventListener('click', () => moveReview(1));
ui.reviewHomeBtn.addEventListener('click', returnHome);
ui.reviewDeck.addEventListener('scroll', updateReview, { passive: true });
ui.review.addEventListener('keydown', (event) => {
  if (ui.review.hidden || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  moveReview(event.key === 'ArrowLeft' ? -1 : 1);
});
window.addEventListener('resize', updateReview);
ui.listenBtn.addEventListener('click', speakWord);
ui.undoBtn.addEventListener('click', () => { if (round) undoLetter(round.selected.length - 1); });
ui.submitBtn.addEventListener('click', castSpell);
ui.nextBtn.addEventListener('click', () => {
  if (ui.lesson.hidden || !round) return;
  if (round.phase === 'failed') startLevel(levelIndex);
  else if (round.phase === 'passed') showDiploma();
  else if (round.phase === 'feedback') {
    round = nextWord(round);
    renderSpell();
    ui.listenBtn.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    speakWord();
  }
});
ui.graduateBtn.addEventListener('click', () => {
  if (ui.diploma.hidden) return;
  if (levelIndex === 2) showSupreme();
  else startLevel(levelIndex + 1);
});
ui.diplomaHomeBtn.addEventListener('click', returnHome);
ui.supremeHomeBtn.addEventListener('click', returnHome);
window.addEventListener('pagehide', stopSpeech);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopSpeech(); });
loadBank();
