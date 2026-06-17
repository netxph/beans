# Landing Page Spec (Beans Kids Arcade)

## Purpose
A kid-friendly landing page that lists available mini games as tappable app-like tiles, and launches the selected game in a fullscreen player view.

---

## Primary Files
- `index.html` — landing page + game player shell + styles + runtime behavior
- `manifest.webmanifest` — PWA manifest
- `sw.js` — service worker (offline/app-shell caching)
- `images/jungle.png` — landing background image
- `images/icon.svg` — app icon for PWA

---

## UX Requirements

### Landing Page
- Jungle-themed visual style using `images/jungle.png` as background.
- Dynamic viewport height support for mobile browser chrome changes.
- Small top metadata row (outside greeting card):
  - Left: `🦁 Beans Kids Arcade`
  - Right: GitHub icon linking to `https://github.com/netxph/beans`
- Greeting card text is minimal and single-line style:
  - `Hi 👋 Pick a game`
- Game list shown as left-aligned grid of compact square tiles (iPhone-like app grid behavior).
- Tile content prioritizes icon/art over text (large icon + short title only).
- Entire tile is clickable (no separate play button).
- Tile has tap animation/pop feedback.

### Game Player Mode
- Opens selected game in fullscreen iframe overlay.
- Landing page hidden during play.
- Top navigation in player is hidden by default.
- Top nav appears only when user hovers/touches top trigger strip.
- Top nav hides quickly after pointer/touch leaves.
- Top nav includes:
  - Back to Games
  - Fullscreen toggle
  - Current game title

---

## Data Model
In `index.html` script:

```js
const games = [
  {
    id: 'mully',
    title: 'Mully Multiplication',
    icon: MULY_BEAR_ICON,
    description: 'Practice multiplication with fun puzzles and colorful feedback!',
    src: './mully/index.html'
  }
];
```

### Game object contract
- `id` (string, unique) — URL query key + lookup key
- `title` (string) — tile title + player title
- `icon` (string, optional HTML/SVG snippet) — preferred tile icon
- `emoji` (string, optional) — fallback icon if `icon` not provided
- `src` (string) — game entrypoint URL
- `description` optional (currently not rendered in tile)

---

## Routing / URL Behavior
- Landing can open a game from query: `?game=<id>`
- On open game: update URL query to selected `id`
- On close game: reset URL to `./`

---

## Accessibility
- Each game tile rendered as focusable `role="button"` with keyboard activation:
  - Enter
  - Space
- GitHub link has `aria-label`.

---

## Visual / Layout Rules
- Use CSS variable `--app-vh` for dynamic viewport height.
- `html`, `body`, `#app`, `.home`, `.player` should bind to `--app-vh`.
- No horizontal scrollbars.
- Landing content scrolls vertically only when needed.
- Decorative jungle artifacts must not block interaction (`pointer-events: none`).

---

## Runtime Behavior
### Dynamic viewport height
- On load, set `--app-vh` from `window.innerHeight`.
- Update on `resize` and `orientationchange`.
- Use debounced handler (~120ms).

### Game opening
1. Locate game by `id`.
2. Set iframe src.
3. Set player title.
4. Show player overlay.
5. Hide landing view.
6. Push query in URL.

### Game closing
1. Hide player overlay.
2. Clear nav visible state.
3. Show landing view.
4. Reset iframe to `about:blank`.
5. Reset URL.

---

## PWA Requirements

### Manifest
`manifest.webmanifest` must include:
- `name`, `short_name`, `description`
- `start_url: "./"`
- `scope: "./"`
- `display: "standalone"`
- `theme_color`, `background_color`
- icon reference to `images/icon.svg` (purpose `any maskable`)

### HTML meta/links
`index.html` head includes:
- `theme-color`
- apple web app meta tags
- manifest link
- icon link

### Service worker
- Register `./sw.js` on window load.
- Cache app shell resources for offline use.
- Serve cached responses first for same-origin GET requests.

---

## Non-Goals (Current Scope)
- No server-side rendering.
- No authentication/profile state.
- No game auto-discovery from filesystem.
- No bundled build step required for landing shell.

---

## Regression Checklist
1. Landing opens with jungle background image.
2. Top row shows lion title and GitHub icon link.
3. Greeting card remains minimal.
4. Tiles are square, left-aligned, and whole tile is clickable.
5. `?game=mully` opens Mully directly.
6. Player nav only appears on top-edge interaction and hides quickly.
7. No bottom/horizontal stray scrollbars on mobile.
8. App is installable as PWA.
9. Service worker registers without console errors.
10. Back to Games returns to landing and clears iframe.
