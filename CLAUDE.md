# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build → .output/
npm run preview      # Run the production build locally
npm run typecheck    # Vue/TS type-check (vue-tsc)
npm run db:generate  # Generate a new Drizzle migration + rebuild list.ts
```

There are no automated tests. CI runs `typecheck` + `build` on PRs.

## Commit convention

Commits must follow Conventional Commits (enforced by commitlint). Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `style`. Subject must be lower-case. Releases are cut automatically by semantic-release on merge to `main`.

## Configuration

All tunable constants belong in **`config/game.ts`** — never hardcoded inline in components, pages, or server routes. This includes scoring values, difficulty settings, round counts, timer durations, mode definitions, and any other value that could reasonably need updating without a code search. When adding a new configurable value, export it from `config/game.ts` and import it at the use site.

`DifficultyConfig` does **not** carry a static country-count estimate — counts are derived dynamically from atlas data via `pickPool(atlas.countries, difficulty).length` wherever they are displayed (index, menu).

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

- **`useAtlasStore`** (`stores/atlas.ts`) — loads `public/data.json` once on first access. Holds the country list, SVG paths (`countryPaths`), flag paths (`flagPaths`), and silhouette paths (`shapePaths`). `countryPaths` only includes countries where `hasMapPath: true` — stub-path countries are omitted so they never render on the world map. The atlas is shared across all game pages.
- **`useSessionStore`** (`stores/session.ts`) — tracks the in-progress game: round list, current index, results, final score, and leaderboard rank. `markFinished()` tallies score and sets `lbPending = true`; `setRank()` is called later by the leaderboard mutation's `onSuccess` handler.

### Game data (`public/data.json`)

Single static file containing every country with: ISO code, display name, capital city, lat/lng, SVG centroid (`svgCx`/`svgCy`), world-map SVG path (`path`), flag path (`flag`), silhouette path (`shape`), region, `tier` (1–4), `langs` (ISO 639-1 codes of official languages), `subdivisions` (top-level admin divisions with `name` and `cat`), and `hasMapPath` / `hasShape` booleans.

- **`hasShape`** — `true` when a dedicated silhouette SVG exists (`maps/<code>.svg`). Derived from `shape != null`.
- **`hasMapPath`** — `false` for the ~20 microstates/island nations whose world-map `path` is a tiny invisible stub triangle (e.g. Vatican City, Monaco, Andorra). These countries are excluded from `countryPaths` in the atlas store and from the answer pool for `pin` and `cart` rounds.

Tier controls the difficulty pool — easy=tier≤1, medium=tier≤2, hard=tier≤3, expert=tier≥2 (excludes tier-1 easy countries). Country selection is also **weighted by tier** toward the selected difficulty via `DIFFICULTY_TIER_WEIGHTS` in `config/game.ts` — expert difficulty makes obscure (high-tier) countries more likely.

Round generation lives in `utils/rounds.ts`: `buildRounds()` picks answers via `weightedSample()`, generates distractors, and cycles round types for `mixed` mode. The same country cannot appear twice in a single run. For `region` rounds, `pickRegionOptions()` ensures each of the 4 options represents a distinct continent. Mode-specific answer pools: `shapePool` filters by `hasShape`, `mapPool` filters by `hasMapPath` (used for `pin` and `cart`), `langPool` by language data, `provincePool` by subdivisions. In `mixed` mode, if a selected country lacks the required data for its assigned round type, it falls back to `flag`.

### Round types

| Type | Component | Question | Options |
|---|---|---|---|
| `flag` | `FlagRound` | Identify country from its flag | 4 country names |
| `pin` | `PinDropRound` | Identify country shown on world map with pin | 4 country names |
| `cart` | `CartographerRound` | Click the named country on the world map | Click on SVG map |
| `shape` | `SilhouetteRound` | Identify country from its silhouette outline | 4 country names |
| `capital` | `CapitalRound` | Name the capital city of a country | 4 capital city names |
| `region` | `RegionRound` | Name the continent a country belongs to | 4 continent names (one per continent) |
| `language` | `LanguageRound` | Name an official language spoken in a country | 4 language name strings |
| `province` | `ProvinceRound` | Name which country a state/province/canton belongs to | 4 country names |

**Language rounds**: `Round.langOptions` holds 4 shuffled language name strings; `Round.answerLang` is the correct string. Distractors exclude all of the answer country's official languages. Correctness check: `opt === round.answerLang`. Fallback to `flag` if no valid language data.

**Province rounds**: `Round.subdivisionName` and `Round.subdivisionCat` hold the subdivision to identify. Options are standard `Country[]`. Fallback to `flag` if no subdivision data.

The `mixed` / **Grand Tour** mode cycles through a difficulty-gated subset of the above types (see `MIXED_ROUND_TYPES` in `config/game.ts`). The continent check for `region` rounds uses `opt.region === answer.region` instead of `opt.code === answer.code` — handled in `pages/play.vue`'s `isCorrect` computed and `handleLock`.

### Mode difficulties and Grand Tour gating

Each standalone mode has an intrinsic difficulty (`modeDiff` in `ModeConfig`). Modes are ordered by difficulty in `MODES`:

| Mode | `modeDiff` |
|---|---|
| Continental (`region`) | easy |
| Linguist (`language`) | easy |
| Banner Game (`flag`) | medium |
| Pin Drop (`pin`) | medium |
| Cartographer (`cart`) | hard |
| Capital Cities (`capital`) | hard |
| Silhouette (`shape`) | expert |
| Province (`province`) | expert |

Grand Tour (`mixed`) only includes round types up to the player's selected difficulty, defined in `MIXED_ROUND_TYPES` (`config/game.ts`):

| Difficulty | Round types included |
|---|---|
| Easy | `region` |
| Medium | `region`, `flag`, `pin` |
| Hard | `region`, `flag`, `pin`, `cart`, `capital` |
| Expert | `region`, `flag`, `pin`, `cart`, `capital`, `shape`, `language`, `province` |

The menu card for Grand Tour shows dynamic sub-tags that update as the player changes difficulty.

### Feedback overlay

When a round is locked (answer picked or timer expired), a `RoundsFeedbackOverlay` component appears scoped to the **media section only** (flag image, world map, silhouette, or country/subdivision name card). The answer buttons remain visible with their green/red state. Each round component receives `correct: boolean | null` and `points: number | null` props from `play.vue`; `null` means the round is not yet locked.

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

- **Server**: Nitro API at `GET/POST /api/leaderboard` and `GET /api/healthz`. Uses **Drizzle ORM** (`drizzle-orm@rc`) with **`@libsql/client`** (supports both local SQLite files and remote Turso). Schema is at `server/db/schema.ts` — two tables: `users` and `scores`. Local path: `NUXT_DB_PATH` (default `./data/leaderboard.db`); remote: `NUXT_TURSO_DATABASE_URL` + `NUXT_TURSO_AUTH_TOKEN`.
- **DB initialisation**: All init logic (client creation, WAL pragma, migration runner) lives in `server/utils/db.ts`. `getDb()` returns `Promise<DB>` and initialises lazily on first call, caching the promise on `globalThis.__meridianDbInit` so it survives Nitro HMR module re-evaluations without opening a second client. `server/plugins/database.ts` simply calls `await getDb()` to pre-warm the connection before the first request. Always `await getDb()` in handlers — never call it synchronously.
- **Drizzle migrations**: SQL files live in `server/db/migrations/<timestamp_name>/migration.sql`. To add a migration after a schema change, run `npm run db:generate` — this calls `drizzle-kit generate` and then `scripts/gen-migration-list.mjs`, which auto-generates `server/db/migrations/list.ts` from all SQL files in that directory. `list.ts` is also regenerated automatically by `npm run build` (via a `prebuild` hook). The plugin reads from `list.ts` — a plain TS module bundled by any build tool. `import.meta.glob` (Vite-only) and `useStorage('assets:db_migrations')` (returns `[]` in Nitro's Rollup bundle) are **not** used. Applied migrations are tracked in a `_meridian_migrations` SQLite table.
- The POST endpoint validates `total` against allowed round counts, `correct ≤ total`, and `score ≤ correct × maxPointsPerRound(difficulty)` via Zod `.refine()` guards.
- Valid modes: `flag | pin | cart | shape | capital | region | language | province | mixed`. Mode and difficulty enums are derived from `VALID_MODE_IDS` / `VALID_DIFFICULTY_IDS` in `config/game.ts` — Zod stays in sync with config automatically.
- The POST payload requires `userId` and `gameToken` (both UUIDs). `gameToken` is unique per game, checked for idempotency — duplicate submissions (offline retries, double-submit) skip the insert and return the existing rank. `userId` upserts a `users` row.
- **Client**: TanStack Query mutation in `useLeaderboardMutation`. The mutation is registered with a default `mutationFn` in `plugins/tanstack-query.client.ts` so it can be replayed after a page reload. Paused (offline) mutations are persisted to `localStorage` under key `geo.tq-cache` (`CACHE_BUSTER = 'v3'`) and automatically retried on reconnect.

### User identity

Each device gets a stable UUID generated once by `useUserId()` (`composables/useUserId.ts`) and stored under `geo.user.id` in localStorage. It is initialised in `app.vue`'s `onMounted` so all returning users are migrated on their first load. The UUID is sent with every leaderboard POST and used to highlight the player's own rows on the leaderboard (replacing the old fragile name-match approach).

### Settings persistence

`useLocalStorage` (`composables/useLocalStorage.ts`) is a custom reactive localStorage binding with a module-level singleton registry — all components sharing a key get the same `Ref`. `useGameSettings` wraps the player's difficulty, round count, and timer preferences. localStorage keys are prefixed `geo.*`.

### Styling

Tailwind CSS v4 (via `@tailwindcss/vite`). Custom CSS variables in `assets/styles/main.css` drive the accent colour system (`--accent`, `--color-ok`, `--color-bad`, etc.) and the `ink`/`paper`/`rule` design tokens used throughout templates. Silhouette SVGs loaded as `<img>` use `filter: invert(1)` in dark mode (the SVGs use solid black fill on transparent background).

### Mobile compatibility

The app must work well on mobile devices. All UI changes should be tested at mobile viewport sizes (≤ 640 px). Key considerations:

- Use responsive Tailwind classes (`sm:`, `md:`) — design mobile-first
- Touch targets must be large enough (min 44×44 px)
- The SVG world map (`pin` and `cart` rounds) must be usable on small screens — avoid layouts that make the map too small to interact with
- Avoid hover-only interactions; any hover state should have an equivalent tap/focus state
- The 4-option answer buttons should stack or resize gracefully on narrow screens

### PWA

Configured in `nuxt.config.ts` via `@vite-pwa/nuxt`. JS/CSS bundles, icons, and other Vite-bundled assets are precached via `workbox.globPatterns`. `@vite-pwa/nuxt` scopes that glob to the Vite output directory and misses `public/` sub-directories, so `data.json`, the 199 flag SVGs (`public/flags/`), and the 242 silhouette SVGs (`public/maps/`) are added explicitly via `additionalManifestEntries` — flags and maps using content hashes computed at config-evaluation time so Workbox re-downloads them only when they actually change. All assets are available offline immediately after SW install (not just on first encounter). The leaderboard API uses a `NetworkFirst` runtime strategy with a 4-second timeout.

### Docker

The Dockerfile expects `.output/` to already exist (built by CI before the image build). Mount a named volume at `/data` for the SQLite database. Override the DB path with `NUXT_DB_PATH`.
