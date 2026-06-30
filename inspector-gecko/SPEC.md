# Inspector Gecko – Spec

## Purpose
A Grade-2-level Wikipedia-powered "Guess Who?" quiz game. Inspector Gecko presents
mystery cases about famous historical figures. Players read redacted clues and pick
the correct person from 4 choices. Real Wikipedia extracts are fetched at runtime to
generate fresh clues each session.

---

## Primary Files
- `inspector-gecko/index.html` — self-contained game (vanilla JS + Tailwind CDN)
- `inspector-gecko/people-seed.json` — seed data for famous people (name, category, known_for)

---

## Game Structure

### Session
- Each game = **5 cases** (rounds), category-balanced from the people pool.
- Cases are selected by shuffling the seed pool, fetching Wikipedia data for each pick,
  then balancing across categories via `pickCategoryBalancedCases()`.
- If Wikipedia fetches fail or return insufficient data, falls back to the built-in
  `CASE_REGISTRY` (hardcoded clue sets for well-known figures).

### Round Flow
1. Show **Clue #1** automatically (first clue always visible).
2. Player may reveal up to 2 additional clues before guessing (costs points each time).
3. Player selects one of **4 multiple-choice options** (1 correct + 3 distractors from
   same session, shuffled).
4. Correct → score added, Wikipedia reveal screen shown.
5. Wrong → all remaining clues auto-revealed, score penalty applied, answer highlighted.
6. After 5 cases → Final score screen with detective rank badge.

---

## Scoring

### Per-Round Points
| Action                  | Effect on `pointsEarnedThisRound` |
|-------------------------|-----------------------------------|
| Start of round          | 10 pts (maximum)                  |
| Reveal extra clue       | −2 pts (minimum floor: 5 pts)     |
| Wrong guess             | −3 pts (minimum floor: 2 pts), clues fully revealed |

Points are banked (`score += pointsEarnedThisRound`) only on a **correct** guess.
A wrong guess still allows the round to continue to the reveal screen, but no points
are awarded for that case.

### Max score: 50 pts (10 × 5 cases, no clues revealed, no wrong guesses)

### Final Rank Badges
| Score   | Badge                  | Icon |
|---------|------------------------|------|
| ≥ 45    | Chief Golden Lizard    | 🏆   |
| 30 – 44 | Super Sleuth Silver    | 🥈   |
| < 30    | Junior Detective Bronze| 🥉   |

---

## Clue Generation

### Wikipedia Integration
- Fetches the Wikipedia REST API summary endpoint:
  `https://en.wikipedia.org/api/rest_v1/page/summary/{name}`
- Extracts the `extract` field, splits into sentences, filters out:
  - Sentences < 30 characters
  - Sentences containing the person's name (to avoid spoilers)
- Assigns clues from different sentence positions (deeper sentences first as Clue #1
  to avoid obvious opening lines).
- Clues are truncated to 180 characters max.

### Name Redaction
- Person's full name and common substrings are replaced with a pronoun in all clue text.
- Pronoun is auto-detected from Wikipedia text (`he/him`, `she/her`, `they/them`).
- Regex-based redaction with word-boundary matching.

### Seed Clues (Fallback)
- `CASE_REGISTRY` contains 10+ hardcoded cases with 3 pre-written first-person clues
  each (e.g. Neil Armstrong, Harriet Tubman, Leonardo da Vinci).
- Used when Wikipedia fetch fails or returns insufficient sentences.

---

## People Seed (`people-seed.json`)

### Categories
| Category    | Description                        |
|-------------|-------------------------------------|
| Scientist   | Physics, biology, chemistry figures |
| Inventor    | Engineering and technology pioneers |
| Leader      | Political and social leaders        |
| Philosopher | Thinkers and writers                |
| Sports Icon | Athletes                            |

### Pool size: ~50+ people
- Category-balanced selection: picks try to include at least one person per category.
- Shuffled each session for variety.

---

## Multiple Choice Options
- `getRoundOptions(quiz)` builds 4 options: the correct person + 3 others from the
  current session's selected cases.
- Options are shuffled before display.
- On wrong guess, the correct answer button turns green; the wrong pick turns red + shakes.

---

## HUD & UI

### Header (always visible)
- Game title + gecko mascot icon
- 🔊 Sound toggle (mute/unmute)
- Case progress: `Case N / 5`

### Game Card
Single centered card (`max-w-2xl`) that transitions between screens:
- **Loading screen** — spinner while Wikipedia data is fetched
- **Round screen** — clues, reveal buttons, answer choices
- **Wikipedia Reveal screen** — shows fetched Wikipedia summary + image thumbnail,
  correct/incorrect feedback, "Next Case" button
- **Final Score screen** — total score, rank badge, session stats, play-again button

### Confetti
- Canvas-based confetti burst on correct guess (particles with random colors, velocity,
  rotation, and fade-out).

---

## Audio (Web Audio API)

| Event    | Sound                                        |
|----------|----------------------------------------------|
| Correct  | Ascending major arpeggio (C–E–G, sine)       |
| Wrong    | Low descending buzz (sawtooth)               |
| Reveal   | Soft notification chime                      |
| Mute     | All audio suppressed via `isMuted` flag      |

---

## Accessibility & UX
- Target audience: Grade 2 (approx. age 7–8).
- Fredoka font for friendly readability.
- Large tap targets for answer buttons.
- Shake animation on wrong answer buttons.
- Bouncy gecko mascot animation in idle states.
- Notification modal for contextual tips (dismissible).

---

## Network & Offline Behavior
- Requires internet for Wikipedia clue enrichment.
- Gracefully falls back to `CASE_REGISTRY` if fetch fails or returns < 2 usable sentences.
- All UI assets loaded via CDN (Tailwind, Google Fonts) — requires internet to render correctly.
