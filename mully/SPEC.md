# Mully Game Spec (Regeneration Blueprint)

## 1) Purpose
**Mully** is a kid-friendly multiplication mini-game with:
- quiz mode (timed, fixed number of cards)
- instant right/wrong feedback overlays
- post-game analytics + adaptive revision suggestions
- table explorer for 1–10 multiplication tables

The app is designed to run as a **self-contained web mini-game** inside a host container (e.g. iframe in repo `index.html`).

---

## 2) Current File Structure
- `mully/index.html` → runtime loader shell
- `mully/mully.jsx` → full React app logic + UI
- `mully/SPEC.md` → this spec

---

## 3) Runtime / Loading Architecture
`mully/index.html` is a browser-only loader (no bundler required):
1. Loads Tailwind CDN + Babel Standalone.
2. Fetches `./mully.jsx` as text.
3. Rewrites bare imports to pinned esm.sh URLs:
   - React 18.2.0
   - ReactDOM 18.2.0
   - lucide-react pinned with React dependency
4. Replaces `export default function App()` with `function App()`.
5. Babel-transforms JSX.
6. Creates Blob module and `import()`s it.
7. Mounts app with `createRoot(...).render(React.createElement(App))`.

### Non-functional requirement
Use a **single React instance** across all imports (to avoid React #31 mismatch errors).

---

## 4) UI Screen State Machine
Single `screen` state with 4 values:
- `WELCOME`
- `GAME`
- `RESULTS`
- `ALL_TABLES`

### Transitions
- WELCOME → GAME (`startNewGame()`)
- WELCOME → ALL_TABLES (Explore charts button)
- ALL_TABLES → WELCOME (Back button)
- GAME → RESULTS (after last question)
- RESULTS → GAME (Play again)
- RESULTS → WELCOME (Return)
- Any non-welcome screen → WELCOME (Home button in header)

---

## 5) Gameplay Rules
- Question bank is generated per session.
- Each question: random factors `1..10` and `correctAnswer = factorA * factorB`.
- Session lengths supported: `5, 10, 15, 20`.
- User answers via on-screen keypad or keyboard.
- Enter submits answer if not empty.
- Per question feedback:
  - Correct: +1 score, success overlay ~1.5s
  - Wrong: record in `missedQuestions`, show correction overlay ~2.0s
- On completion: timer stops, route to results.

---

## 6) State Model (from `mully.jsx`)
Core state variables:
- `screen: 'WELCOME' | 'GAME' | 'RESULTS' | 'ALL_TABLES'`
- `sessionLength: number` (default `10`)
- `questions: Array<{id,factorA,factorB,correctAnswer}>`
- `currentIndex: number`
- `userAnswer: string`
- `score: number`
- `timer: number` (seconds)
- `isTimerRunning: boolean`
- `missedQuestions: Array<{factorA,factorB,userAnswer,correctAnswer}>`
- `isMuted: boolean`
- `feedbackState: 'NONE' | 'CORRECT' | 'WRONG'`
- `feedbackEmoji: string`
- `feedbackText: string`
- `selectedFactorTable: number | null`
- `wrongShake: boolean`
- `correctBounce: boolean`

Refs:
- `timerRef` for interval cleanup.

---

## 7) Input Model
### On-screen keypad
Buttons: `0..9`, `BACK`, `CLEAR`, `ENTER`.

### Keyboard mapping (only during GAME + no feedback overlay)
- `0..9` → digit append
- `Backspace` → BACK
- `Enter` → ENTER
- `Escape`, `c`, `C` → CLEAR

### Input constraints
- Max 3 chars in answer field.

---

## 8) Timer Behavior
- Starts when new game begins.
- Increments every second via interval.
- Stops on results/home.
- Must always clear interval on effect cleanup.

---

## 9) Feedback / Analytics Logic
### Pace categories (based on avg sec per puzzle)
- `<= 5s`: Turbo Math Wizard
- `<= 12s`: Speedy Math Explorer
- `<= 18s`: Math Knight
- else: Steady Learner

### Suggested revision factors
- Count factor frequency from missed pairs (both factorA and factorB).
- Sort descending.
- Return top 3 factors.

### Mission banner progression
Uses `(currentIndex / sessionLength) * 100` to show stage messages.

---

## 10) Screen-by-Screen UX Requirements
## WELCOME
- Mascot hero area + intro text.
- Session length selector chips (5/10/15/20).
- Primary CTA: Start Quiz Mission.
- Secondary CTA: Explore Multiplication Charts.

## GAME
- Top stats: puzzle count + timer + progress bar + mission message.
- Main card: equation `A × B = ?` and answer display.
- Keypad grid for numeric entry.
- Blocking overlay on answer submission (correct/wrong).

## RESULTS
- Accuracy + time summary cards.
- Pace category card.
- Study guide section:
  - perfect-score state
  - or suggested factor chips
- Factor practice modal (10 rows table, highlights missed pairs).
- Buttons: Play Again / Return to Setup.

## ALL_TABLES
- Factor selector 1..10.
- Selected table list (1×..10×).
- Back to welcome + launch quiz CTA.

---

## 11) Audio Requirements
`playSound(type, isMuted)` uses Web Audio API oscillator only (no external assets).
Supported types:
- `click`
- `success`
- `error`
- `level_up`

If muted, audio does nothing.
If audio context fails, app should continue (console warn only).

---

## 12) Responsiveness Requirements
Current app uses full-device container and responsive layouts:
- Root: fullscreen (`w-screen h-dvh`) inside game frame
- WELCOME becomes 2-column on large screens
- GAME becomes 2-column (prompt card + keypad) on large screens
- Mobile remains stacked vertical

No fake phone frame, no notch/island, no footer.

---

## 13) Visual/Animation Requirements
Keep these CSS animations embedded in component style block:
- `shake`
- `spin-slow`
- `slideUp`

Used for wrong-answer shake, icon spins, modal entrance.

---

## 14) Known Intentional Design Choices
- Questions are random and may repeat combinations.
- No persistence of score/history across sessions.
- Table explorer is fixed to 1..10.
- Input is intentionally simple and kid-focused.

---

## 15) Regeneration Checklist (for future AI agents)
When regenerating, ensure:
1. 4-screen state machine exists and transitions match.
2. Timer starts/stops/cleans up correctly.
3. Keyboard + keypad parity is preserved.
4. Wrong answers are stored with full detail.
5. Results compute pace + suggested revision factors.
6. Practice modal highlights missed pairs correctly.
7. App is fullscreen and responsive on phone/tablet/desktop.
8. Loader pins React/ReactDOM/lucide to compatible versions.
9. Avoid rendering stray `{}` in JSX (causes React errors).
10. Preserve child-friendly copy tone and visual affordances.

---

## 16) Optional Future Enhancements (not required for parity)
- deterministic seeded question generation
- difficulty tiers (e.g., 1–5, 1–10, 1–12)
- persistent local stats/profile
- i18n content packs
- bundler-based production build (remove runtime Babel)
