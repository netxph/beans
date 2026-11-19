# Spellcaster Bee

A touch-first spelling reviewer for Grade 2, inside the Beans Kids Arcade PWA. No build step, new runtime dependencies, accounts, or paid speech service.

## Play

From the repository root, run `bun start`, open the printed URL, and choose **Spellcaster Bee**. The direct arcade link is `/?game=spellcaster-bee`.

Before starting a class, tap **Review all words** to open the spell book. All 57 words are sorted alphabetically across **six swipeable cards: 10 words per card, with 7 on the last card**. Swipe left/right, use Previous/Next buttons, or press the keyboard’s arrow keys to browse. Words use large, single-line text that scales to fit mobile screens. Review includes locked classes and works without speech support. It does not start a quiz, speak words automatically, or change grades and diplomas.

1. The master says a word using the device’s English text-to-speech. Tap **Hear word again** to replay it without a penalty.
2. Tap letter bubbles to fill the cauldron’s spelling slots. Each bubble can be used once; repeated letters have separate bubbles. Four extra letter bubbles are mixed in.
3. Tap the **last placed letter** or **Undo last letter** to remove it and return its bubble. Earlier letters cannot be removed until the letters after them are undone.
4. Fill every slot and **Cast spelling spell**. A correct answer brews a golden potion; a wrong answer makes a friendly POOF and reveals the spelling. Tap to continue at your own pace.

Each class draws 10 shuffled, non-repeating questions from its difficulty’s word pool. A new attempt draws a fresh random selection; words can reappear across attempts. **0–3 mistakes passes; the fourth mistake fails immediately.** Retrying restarts only that class, with mistakes reset. A grade is the number correct out of 10: 7/10 = 70%.

Easy, Average, and Difficult award **Wizard Class 1, 2, and 3** diplomas. Completing all three awards **Supreme Spellcaster**. Diplomas and best class grades are saved in local storage on the same browser/device; an interrupted class restarts. Clearing site data removes diplomas. A storage error is shown without preventing play.

## Word bank and difficulty

[`words.yaml`](./words.yaml) contains all 56 supplied words plus **necessary**, for **57 unique words: 19 per difficulty**. Difficulty is relative to this list, not a formal Grade 2 rating:

- **Easy:** relatively familiar words with mostly predictable sounds, common endings, or simple doubled letters; for example, muffin, thirsty, blossom, and imagination.
- **Average:** more silent letters, doubled consonants, or easily confused vowels; for example, island, broccoli, separate, and occasional.
- **Difficult:** unusual borrowed spellings, less obvious silent letters, or multiple spelling traps; for example, colonel, pharaoh, yacht, rhythm, and rendezvous.

Word length alone does not determine difficulty: imagination is long but has familiar sound patterns, while yacht is short but has an unusual spelling. Each game course still asks 30 questions, so a single graduation does not mean every word in the larger bank has been tested.

## Change the words

Edit [`words.yaml`](./words.yaml). Keep **the same number of words in each difficulty**, with **at least 10 per pool**:

```yaml
easy:
  - muffin
  - "thirsty" # comments and plain, single-, or double-quoted words work
```

Keep the `easy`, `average`, and `difficult` headings, and use two spaces before each dash. Words must be unique across the course and contain **2–15 English letters**, with no spaces or punctuation. Uppercase input is normalized to lowercase. This intentionally supports simple YAML word lists, not general YAML features such as anchors or nested objects. Invalid lessons display a helpful error instead of starting.

After changing deployed files, **bump `CACHE_NAME` in `../sw.js`** so the cache-first PWA receives the new lesson. Reload the arcade and use its Update button if offered. A changed word bank starts a fresh set of diplomas; comment-only edits do not reset progress. Changing word banks does not preserve multiple courses.

## Speech and offline play

The arcade pre-caches the game, word bank, and shared shuffle module for offline use after its first successful online load. The master prefers a **male English voice**, with British English first and local voices preferred within an accent. Another English male voice is used without an accent warning if no recognizable British male voice is available. If no male voice can be identified, the game silently falls back to an available English voice instead of blocking play. Replay is initiated by a tap for mobile browser compatibility.

Browsers do not provide voice gender, so male selection is best-effort using recognizable voice names such as Alex, Daniel, Microsoft David, or Google UK English Male. A voice with an ambiguous name may not be recognized even if it sounds male. For that case, install a named male English voice that the browser exposes; lowering pitch is not used as a substitute for selecting a male voice.

Voice availability, pronunciation, volume, and whether speech works offline depend on the phone/tablet and browser. For offline narration, install an offline English voice in the device’s speech settings. Unsupported speech and unavailable voices do not display warnings. Actual playback failures can still show an error. Without browser speech support, classes are disabled. The game makes no speech-service requests itself, but a device-provided online voice may use its vendor’s service.

Spelling slots stay on one line for words up to 15 letters, shrinking with the available width on phones. Letter bubbles and the dedicated **Undo last letter** button keep touch targets of at least 44px, so undo does not require tapping a narrow slot. All actions use keyboard-focusable buttons, and animation respects `prefers-reduced-motion`. Smaller screens may scroll vertically.

## Check

Run `bun test` from the repository root. Tests cover alphabetical review pages and navigation, unchanged progress during review, lesson validation, duplicate letters, last-only undo, one-time grading, pass/fail boundaries, class retries, all graduations, saved progress, speech warnings, and offline asset inclusion. Speech playback itself still needs checking on the target device.
