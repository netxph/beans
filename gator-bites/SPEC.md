# Gator Bites – Spec

## Purpose
A kids' music-education game that teaches reading piano notes on a treble clef staff.
A hungry alligator named Gator hides at the right bank of a river. Food (fish) float
from left to right on the staff lines/spaces. The player identifies each note and presses
the matching piano key at the moment the fish reaches Gator's snout.

---

## Primary Files
- `gator-bites/index.html` — self-contained game (canvas + vanilla JS + Tailwind CDN)

---

## Game Concept

### Staff / River
- The river **is** the treble clef staff.
- 5 horizontal staff lines are drawn across the river canvas.
- Notes span one octave: **C4 (ledger below) through C5 (space 3)**.
- Staff mapping (treble clef):

| Note | Staff Position      | staffStep |
|------|---------------------|-----------|
| C4   | Ledger line below   | −2        |
| D4   | Space below line 1  | −1        |
| E4   | Line 1 (bottom)     | 0         |
| F4   | Space 1             | 1         |
| G4   | Line 2              | 2         |
| A4   | Space 2             | 3         |
| B4   | Line 3              | 4         |
| C5   | Space 3             | 5         |

### Fish (Food)
- Fish spawn off-screen left and travel right at `foodSpeed()` px/s.
- Fish shape: slightly flattened oval (note-head style), tilted −15°.
- **Line notes** (staffStep even): a white horizontal stripe is drawn through the fish
  body at the exact staff-line Y, making the position unambiguous.
- **Space notes** (staffStep odd): fish floats cleanly between lines, no stripe.
- **C4** gets a short ledger-line segment drawn through it.
- Note letter is **not** displayed on the fish — position is the sole reading cue.
- Fish glow yellow when within the timing window of the bite line.
- Missed fish fade out (alpha decay) then are pruned from the array.

### Gator
- Static alligator head peeking from the right bank (facing left).
- Side-view: long sloping upper jaw, separate lower jaw, visible teeth (upper hang down,
  lower poke up — characteristic alligator trait), nostril bumps, vertical-slit pupils,
  scale bumps on skull.
- **Tracks** the fish nearest to the bite line: `gatorY` smoothly interpolates toward
  the approaching fish's Y position (`lerp factor 0.07` per frame).
- Gator body hidden behind a grass-green bank cover (`fillRect` from `BX` to `W`).

### Bite Line
- Dashed yellow vertical line at `BITE_X = min(W − 110, 570)`.
- Pulsing opacity animation.
- "SNAP!" label above.
- Timing window: `±max(26, 56 − (level−1)×4)` px around `BITE_X`.

### Piano Keyboard
- 8 HTML white keys: **C D E F G A B C** (C4–C5).
- Keyboard shortcuts: **A S D F G H J K**.
- Click/touch + keyboard input.
- Correct press: blue flash. Wrong press: red flash + shake.
- Plays actual triangle-wave note via Web Audio API on every key press.

---

## Scoring & Level Flow

### Hunger Meter
- Tracks `eaten / spawned` as a percentage (0–100%).
- 80% marker line shown on the meter bar.
- Updates after every eat/miss event.

### Level Progression
| Level | Fish count | Speed (px/s)      | Spawn gap (ms)       |
|-------|-----------|-------------------|----------------------|
| 1     | 10        | 70                | 2400                 |
| 2     | 15        | 98                | 2200                 |
| N     | 10+(N−1)×5| 70+(N−1)×28       | max(900, 2400−(N−1)×200) |

- Level ends when all `totalFish` have been spawned **and** all fish are settled
  (eaten or faded out). A 500 ms grace delay allows final splash particles to clear.
- **≥ 80% eaten** → Level up (level count +1, speed increases).
- **< 80% eaten** → Game over.
- Max 3 active (uneaten, un-missed) fish on screen at once; spawning pauses if at cap.

### HUD
- 🍖 Hunger meter + % label
- 🌊 Level number
- 🐟 `spawned / totalFish` fish counter

---

## River Artifacts (Decorative)
Drawn between `drawRiver()` and `drawStaff()` each frame, time-based (no game state):

| Artifact | Count | Behaviour |
|----------|-------|-----------|
| Bubbles  | 18    | Rise upward with sinusoidal horizontal drift; loop when reaching top |
| Seaweed  | 9     | Grow from bottom bank; sway via quadratic Bézier + time-based sine |
| Ripples  | 3     | Expanding flattened ellipse rings at staggered phases (period 3–5 s) |

---

## Note Guide (Cheat Sheet)
- Accessible via **📖 Note Guide** button on both the Start screen and Game Over screen.
- Opens as a modal overlay (z-index 50, above all other overlays).
- Close by clicking `×` or anywhere on the backdrop.
- Two side-by-side SVG panels:
  - **On a Line**: C4 (ledger), E, G, B — colored note heads with white stripe
  - **In a Space**: D, F, A, C5 — colored note heads, no stripe
  - Notes above game range (D5, F5 on lines; E5 in space) shown in gray.

---

## Audio (Web Audio API)
| Event     | Sound                                         |
|-----------|-----------------------------------------------|
| Key press | Triangle wave at correct note frequency       |
| Eat       | Sawtooth chomp (220→55 Hz, 0.2 s)            |
| Miss/Wrong| Square buzz (110→70 Hz, 0.25 s)              |
| Level Up  | Ascending sine arpeggio C–E–G–C (0.7 s)      |

---

## Layout & Rendering

### Canvas
- `position: absolute` within `#game-main` (which is full-width, `overflow: hidden`).
- `W = min(containerWidth, 700)` — capped to prevent overly long river on desktop.
- Canvas is CSS-centered: `left = (containerWidth − W) / 2`.
- `H` = full height of `#game-main`.
- Draw order per frame: Banks → River → Artifacts → Staff → Food → Particles → Gator.

### Responsive
- Piano key width: `46px` desktop, `37px` on screens ≤ 420px.
- `FOOD_R = round(LINE_GAP × 0.40)` — fish always fit within a staff space.
- `LINE_GAP = 28` px (wider than typical for legibility).

### Overlays (all `position: absolute; inset: 0` inside `#game-main`)
| ID                | Trigger                          |
|-------------------|----------------------------------|
| `#start-menu`     | Initial page load                |
| `#gameover-screen`| Level end with < 80% eaten       |
| `#levelup-screen` | Level end with ≥ 80% eaten       |
| `#cheat-modal`    | 📖 Note Guide button (z-index 50)|

---

## Known Constraints
- No sharps/flats — game uses white-key notes only (C D E F G A B C).
- `let` declarations for layout vars (`gatorY`, `rArtifacts`, `BITE_X`, etc.) must
  appear **before** `resize()` is called to avoid temporal dead zone errors.
- Offline-capable (no external data fetches); all assets are CDN-loaded at startup.
