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

Single static file containing every country with: ISO code, display name, lat/lng, SVG centroid (`svgCx`/`svgCy`), world-map SVG path, flag path, region, and `tier` (1–4). Tier controls the difficulty pool — easy=tier≤1, medium=tier≤2, hard=tier≤3, expert=all.

Round generation lives in `utils/rounds.ts`: `buildRounds()` picks answers from the filtered pool, generates same-region distractors, and cycles round types for `mixed` mode.

### Round types

- **`flag`** (`FlagRound`) — identify country from its flag (4-option grid)
- **`pin`** (`PinDropRound`) — identify country highlighted on the SVG world map
- **`cart`** (`CartographerRound`) — identify country from its outline/shape
- **`mixed`** — cycles `flag → pin → cart` by round index

### Scoring

Base 100 pts for a correct answer. If the timer is enabled, up to 50 bonus points are added proportionally to remaining time: `round((remaining / timerSecs) * 50)`. Wrong answers or timeouts score 0.

### Leaderboard (server + offline)

- **Server**: Nitro API at `GET/POST /api/leaderboard`. Uses Node 24's built-in `node:sqlite` (no ORM, no external SQLite package). The DB is initialised by `server/plugins/database.ts` and stored at `NUXT_DB_PATH` (default `./data/leaderboard.db`). Access it via `getDb()` from `server/utils/db.ts`.
- **Client**: TanStack Query mutation in `useLeaderboardMutation`. The mutation is registered with a default `mutationFn` in `plugins/tanstack-query.client.ts` so it can be replayed after a page reload. Paused (offline) mutations are persisted to `localStorage` under key `geo.tq-cache` and automatically retried on reconnect.

### Settings persistence

`useLocalStorage` (`composables/useLocalStorage.ts`) is a custom reactive localStorage binding with a module-level singleton registry — all components sharing a key get the same `Ref`. `useGameSettings` wraps the player's difficulty, round count, timer, theme, and accent preferences using this composable. localStorage keys are prefixed `geo.*`.

### Styling

Tailwind CSS v4 (via `@tailwindcss/vite`). Custom CSS variables in `assets/styles/main.css` drive the accent colour system (`--accent`, `--color-ok`, `--color-bad`, etc.) and the `ink`/`paper`/`rule` design tokens used throughout templates.

### PWA

Configured in `nuxt.config.ts` via `@vite-pwa/nuxt`. All SVGs (179 country flags), JS/CSS bundles, and `data.json` are precached so the game works fully offline. The leaderboard API uses a `NetworkFirst` runtime strategy with a 4-second timeout.

### Docker

The Dockerfile expects `.output/` to already exist (built by CI before the image build). Mount a named volume at `/data` for the SQLite database. Override the DB path with `NUXT_DB_PATH`.
