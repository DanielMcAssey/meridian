# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build → .output/
npm run preview      # Run the production build locally
npm run typecheck    # Vue/TS type-check (vue-tsc)
```

There are no automated tests. CI runs `typecheck` + `build` on PRs.

## Commit convention

Commits must follow Conventional Commits (enforced by commitlint). Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `style`. Subject must be lower-case. Releases are cut automatically by semantic-release on merge to `main`.

## Architecture

Meridian is a **Nuxt 3** geography quiz game. All game pages are rendered **client-side only** (`definePageMeta({ ssr: false })`). The server side is a thin **Nitro** API (leaderboard only).

### Page flow

```
/ (index) → /menu → /play → /results → /leaderboard
```

- `/menu` — player picks mode, difficulty, round count, enters name
- `/play` — active game loop; guards back to `/menu` if no session
- `/results` — score summary + leaderboard rank
- `/leaderboard` — all-time scores with mode/difficulty filters

### State management

Two Pinia stores:

- **`useAtlasStore`** (`stores/atlas.ts`) — loads `public/data.json` once on first access. Holds the country list, SVG paths (`countryPaths`), and flag paths (`flagPaths`). The atlas is shared across all game pages.
- **`useSessionStore`** (`stores/session.ts`) — tracks the in-progress game: round list, current index, results, final score, and leaderboard rank. `markFinished()` tallies score and sets `lbPending = true`; `setRank()` is called later by the leaderboard mutation's `onSuccess` handler.

### Game data (`public/data.json`)

Single static file containing every country with: ISO code, display name, capital city, lat/lng, SVG centroid (`svgCx`/`svgCy`), world-map SVG path, flag path, region, and `tier` (1–4). Tier controls the difficulty pool — easy=tier≤1, medium=tier≤2, hard=tier≤3, expert=all.

Round generation lives in `utils/rounds.ts`: `buildRounds()` picks answers from the filtered pool, generates distractors, and cycles round types for `mixed` mode. For `region` rounds, `pickRegionOptions()` ensures each of the 4 options represents a distinct continent.

### Round types

| Type | Component | Question | Options |
|---|---|---|---|
| `flag` | `FlagRound` | Identify country from its flag | 4 country names |
| `pin` | `PinDropRound` | Identify country shown on world map with pin | 4 country names |
| `cart` | `CartographerRound` | Click the named country on the world map | Click on SVG map |
| `shape` | `SilhouetteRound` | Identify country from its outline | 4 country names |
| `capital` | `CapitalRound` | Name the capital city of a country | 4 capital city names |
| `region` | `RegionRound` | Name the continent a country belongs to | 4 continent names (one per continent) |

The `mixed` / **Grand Tour** mode cycles through a difficulty-gated subset of the above types (see `MIXED_ROUND_TYPES` in `config/game.ts`). The continent check for `region` rounds uses `opt.region === answer.region` instead of `opt.code === answer.code` — this is handled in `pages/play.vue`'s `isCorrect` computed and `handleLock`.

### Mode difficulties and Grand Tour gating

Each standalone mode has an intrinsic difficulty (`modeDiff` in `ModeConfig`):

| Mode | `modeDiff` |
|---|---|
| Continental (`region`) | easy |
| Banner Game (`flag`) | medium |
| Pin Drop (`pin`) | medium |
| Cartographer (`cart`) | hard |
| Silhouette (`shape`) | expert |
| Capital Cities (`capital`) | expert |

Grand Tour (`mixed`) only includes round types up to the player's selected difficulty, defined in `MIXED_ROUND_TYPES` (`config/game.ts`):

| Difficulty | Round types included |
|---|---|
| Easy | `region` |
| Medium | `region`, `flag`, `pin` |
| Hard | `region`, `flag`, `pin`, `cart` |
| Expert | `region`, `flag`, `pin`, `cart`, `shape`, `capital` |

The menu card for Grand Tour shows dynamic sub-tags that update as the player changes difficulty.

### Feedback overlay

When a round is locked (answer picked or timer expired), a `RoundsFeedbackOverlay` component appears scoped to the **media section only** (flag image, world map, silhouette, or country name card). The answer buttons remain visible with their green/red state. Each round component receives `correct: boolean | null` and `points: number | null` props from `play.vue`; `null` means the round is not yet locked.

### Scoring

All scoring logic lives in **`utils/scoring.ts`** (auto-imported client-side; imported explicitly in server routes). A difficulty multiplier is applied on top of the base calculation:

| Difficulty | Multiplier | Base pts | Max pts (with timer) |
|---|---|---|---|
| Easy | ×1.0 | 100 | 150 |
| Medium | ×1.5 | 150 | 225 |
| Hard | ×2.0 | 200 | 300 |
| Expert | ×3.0 | 300 | 450 |

`calcPoints(timerEnabled, remaining, timerSecs, difficulty)` — used in `pages/play.vue`.  
`maxPointsPerRound(difficulty)` — used server-side for score plausibility checks.

### Leaderboard (server + offline)

- **Server**: Nitro API at `GET/POST /api/leaderboard`. Uses **Drizzle ORM** (`drizzle-orm@rc`) over Node 24's built-in `node:sqlite`. Schema is at `server/db/schema.ts`. The DB is initialised by `server/plugins/database.ts` (raw `CREATE TABLE IF NOT EXISTS` bootstrap, then Drizzle wraps it) and stored at `NUXT_DB_PATH` (default `./data/leaderboard.db`). Access it via `getDb()` from `server/utils/db.ts`, which returns a typed `NodeSQLiteDatabase<typeof schema>`.
- The POST endpoint validates `total` against allowed round counts, `correct ≤ total`, and `score ≤ correct × maxPointsPerRound(difficulty)` via Zod `.refine()` guards.
- Valid modes: `flag | pin | cart | shape | capital | region | mixed`.
- **Client**: TanStack Query mutation in `useLeaderboardMutation`. The mutation is registered with a default `mutationFn` in `plugins/tanstack-query.client.ts` so it can be replayed after a page reload. Paused (offline) mutations are persisted to `localStorage` under key `geo.tq-cache` and automatically retried on reconnect.

### Settings persistence

`useLocalStorage` (`composables/useLocalStorage.ts`) is a custom reactive localStorage binding with a module-level singleton registry — all components sharing a key get the same `Ref`. `useGameSettings` wraps the player's difficulty, round count, timer, theme, and accent preferences using this composable. localStorage keys are prefixed `geo.*`.

### Styling

Tailwind CSS v4 (via `@tailwindcss/vite`). Custom CSS variables in `assets/styles/main.css` drive the accent colour system (`--accent`, `--color-ok`, `--color-bad`, etc.) and the `ink`/`paper`/`rule` design tokens used throughout templates.

### Mobile compatibility

The app must work well on mobile devices. All UI changes should be tested at mobile viewport sizes (≤ 640 px). Key considerations:

- Use responsive Tailwind classes (`sm:`, `md:`) — design mobile-first
- Touch targets must be large enough (min 44×44 px)
- The SVG world map (`pin` and `cart` rounds) must be usable on small screens — avoid layouts that make the map too small to interact with
- Avoid hover-only interactions; any hover state should have an equivalent tap/focus state
- The 4-option answer buttons should stack or resize gracefully on narrow screens

### PWA

Configured in `nuxt.config.ts` via `@vite-pwa/nuxt`. All SVGs (179 country flags), JS/CSS bundles, and `data.json` are precached so the game works fully offline. The leaderboard API uses a `NetworkFirst` runtime strategy with a 4-second timeout.

### Docker

The Dockerfile expects `.output/` to already exist (built by CI before the image build). Mount a named volume at `/data` for the SQLite database. Override the DB path with `NUXT_DB_PATH`.
