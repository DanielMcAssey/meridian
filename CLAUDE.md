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

Achievement definitions live in **`config/achievements.ts`** as a static `ACHIEVEMENTS` array (not in the database). Each entry has `id`, `name`, `description`, `icon` (emoji), and `category`. Add new achievements there and update the checking logic in `server/utils/checkAchievements.ts`.

`DifficultyConfig` does **not** carry a static country-count estimate — counts are derived dynamically from atlas data via `pickPool(atlas.countries, difficulty).length` wherever they are displayed (index, menu).

## Architecture

Meridian is a **Nuxt 3** geography quiz game. All game pages are rendered **client-side only** (`definePageMeta({ ssr: false })`). The server side is a thin **Nitro** API covering leaderboard, user registration, account recovery, and public profiles.

### Page flow

```
/ (index) → /menu → /play → /results → /leaderboard
                                      ↘ /profile/[userId]  (public, opens in new tab)
/profile  (own profile / settings)
```

- `/` — name entry + difficulty picker for new users; also the re-registration landing for users whose localStorage was cleared
- `/menu` — player picks mode, difficulty, round count
- `/play` — active game loop; guards back to `/menu` if no session
- `/results` — score summary + leaderboard rank
- `/leaderboard` — all-time scores with mode/difficulty/rounds filters; country flag shown next to player names
- `/profile` — edit display name, bio, home country; view/copy recovery QR; achievements grid; danger zone
- `/profile/[userId]` — public read-only profile; shows bio, country flag, voyage stats, recent games, achievements grid

### Route middleware

Named middleware files live in `middleware/`. All are plain `.ts` (not `.client.ts`) — they run client-side only because all pages are `ssr: false`.

| File | Used by | Condition |
|---|---|---|
| `require-name` | `/menu`, `/profile` | Redirects to `/` if no name |
| `require-session` | `/play` | Redirects to `/menu` if no active game |
| `require-finished` | `/results` | Redirects to `/menu` if game not finished |
| `redirect-if-named` | `/` | Redirects to `/menu` if name **and** userId both set |

### State management

Three Pinia stores:

- **`useAtlasStore`** (`stores/atlas.ts`) — loads `public/data.json` once on first access. Holds the country list, SVG paths (`countryPaths`), flag paths (`flagPaths`), and silhouette paths (`shapePaths`). `countryPaths` only includes countries where `hasMapPath: true` — stub-path countries are omitted so they never render on the world map. The atlas is shared across all game pages.
- **`useSessionStore`** (`stores/session.ts`) — tracks the in-progress game: round list, current index, results, final score, and leaderboard rank. `markFinished()` tallies score and sets `lbPending = true`; `setRank()` is called later by the leaderboard mutation's `onSuccess` handler. `newAchievements` holds any achievements unlocked by the last submission; `setNewAchievements()` / `clearNewAchievements()` are called by the mutation and the results page respectively.
- **`useProfileStore`** (`stores/profile.ts`) — exposes `name` (`geo.player.name`) and `userId` (`geo.user.id`) from localStorage. `setName()` sanitizes before storing. `deleteProfile()` clears all `geo.*` localStorage keys.

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

### Achievements

20 achievements are defined statically in `config/achievements.ts` (`ACHIEVEMENTS` array, `ACHIEVEMENT_MAP` for O(1) lookup). Categories: `milestone`, `accuracy`, `score`, `difficulty`, `mode`, `career`, `combined`.

**Server flow**: after every score insert + stats upsert in `POST /api/leaderboard`, `checkAchievements()` (`server/utils/checkAchievements.ts`) is called as a pure function — it receives the submission, the updated stats, a `Set` of already-unlocked IDs, and all of the user's score rows, and returns IDs of newly earned achievements. New unlocks are inserted into `user_achievements` and the enriched definitions are returned in the POST response as `newAchievements[]`.

**Client flow**: `useLeaderboardMutation`'s `onSuccess` calls `session.setNewAchievements(data.newAchievements)`. The results page drains the queue via `<AchievementToast>` (`components/AchievementToast.vue`) — a fixed bottom-right toast that shows one achievement at a time, auto-dismissing after 4 s with a 300 ms gap between entries.

**Profile display**: both `/profile` and `/profile/[userId]` show all 20 achievements in a 2-column grid. Unearned achievements are rendered at `opacity-35`; earned ones show their unlock date. The profile GET endpoint (`server/api/profile/[userId].get.ts`) joins `user_achievements` and enriches each row from `ACHIEVEMENT_MAP`.

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

- **Server**: Nitro API at `GET/POST /api/leaderboard` and `GET /api/healthz`. Uses **Drizzle ORM** (`drizzle-orm@rc`) with **`@libsql/client`** (supports both local SQLite files and remote Turso). Schema is at `server/db/schema.ts` — three tables: `users`, `scores`, `user_stats`. Local path: `NUXT_DB_PATH` (default `./data/leaderboard.db`); remote: `NUXT_TURSO_DATABASE_URL` + `NUXT_TURSO_AUTH_TOKEN`.
- **Schema**: `users` holds `id`, `name`, `bio`, `country_code`, `recovery_code`, `first_seen`, `last_seen`, and brute-force lockout counters. `scores` holds game results with a `user_id` FK — it does **not** store `name` (name is fetched via `INNER JOIN users` so it always reflects the current display name). `user_stats` is a cached aggregate per user (total games, best score, favourite mode/difficulty) updated on every score submission. `user_achievements` is a join table (`user_id`, `achievement_id`, `unlocked_at`) — achievement definitions are static in `config/achievements.ts`, not stored in the DB.
- **DB initialisation**: All init logic (client creation, WAL pragma, migration runner) lives in `server/utils/db.ts`. `getDb()` returns `Promise<DB>` and initialises lazily on first call, caching the promise on `globalThis.__meridianDbInit` so it survives Nitro HMR module re-evaluations without opening a second client. `server/plugins/database.ts` simply calls `await getDb()` to pre-warm the connection before the first request. Always `await getDb()` in handlers — never call it synchronously.
- **Drizzle migrations**: SQL files live in `server/db/migrations/<timestamp_name>/migration.sql`. To add a migration after a schema change, run `npm run db:generate` — this calls `drizzle-kit generate` and then `scripts/gen-migration-list.mjs`, which auto-generates `server/db/migrations/list.ts` from all SQL files in that directory. `list.ts` is also regenerated automatically by `npm run build` (via a `prebuild` hook). Applied migrations are tracked in a `_meridian_migrations` SQLite table. Every migration directory should have both `migration.sql` and `snapshot.json` — a missing snapshot causes drizzle-kit to re-generate already-applied DDL on the next `db:generate` run.
- The POST endpoint validates `total` against allowed round counts, `correct ≤ total`, and `score ≤ correct × maxPointsPerRound(difficulty)` via Zod `.refine()` guards.
- Valid modes: `flag | pin | cart | shape | capital | region | language | province | mixed`. Mode and difficulty enums are derived from `VALID_MODE_IDS` / `VALID_DIFFICULTY_IDS` in `config/game.ts` — Zod stays in sync with config automatically.
- The POST payload requires `userId` and `gameToken` (both UUIDs). `gameToken` is unique per game, checked for idempotency — duplicate submissions (offline retries, double-submit) skip the insert and return the existing rank. `lastSeen` is updated on every submission; `name` is **not** updated here — name changes go through `POST /api/profile/update`.
- **Client**: TanStack Query mutation in `useLeaderboardMutation`. The mutation is registered with a default `mutationFn` in `plugins/tanstack-query.client.ts` so it can be replayed after a page reload. Paused (offline) mutations are persisted to `localStorage` under key `geo.tq-cache` and automatically retried on reconnect.

### User identity

User identity is **server-issued**. When a new player clicks "Set sail", `POST /api/account/register` creates a `users` row and returns `{ userId, recoveryCode }`. Both are stored in localStorage (`geo.user.id`, `geo.recovery.code`). `useUserId()` simply reads from localStorage — it never generates a UUID client-side.

**Account API endpoints:**
- `POST /api/account/register` — creates a new user; returns `userId` + `recoveryCode`. Called from the index page on first registration.
- `POST /api/account/init` — **migration only** for accounts created before server-side registration was introduced. Generates and returns a `recoveryCode` for a `userId` that already exists in the DB but has no code. `useInitRecoveryCode()` calls this on mount (no-op if code already present or user has no DB row).
- `POST /api/account/link` — verifies a `recoveryCode` for a given `userId`; used by `LinkAccountModal` to transfer an account to a new device.
- `POST /api/profile/update` — updates any combination of `name`, `bio`, and `country_code` on the `users` row (all fields optional); authenticated via `userId` + `recoveryCode`. Called by both the name-save and identity-save flows on the profile page.

**Recovery code authentication** is shared across `link` and `profile/update` via `server/utils/validateRecoveryCode.ts`. It uses timing-safe comparison and enforces a per-user brute-force lockout (10 failures → 1-hour lockout) tracked via `link_fail_count` / `link_locked_until` on the `users` row.

The `userId` is sent with every leaderboard POST and used to highlight the player's own rows on the leaderboard. The leaderboard also displays the user's `country_code` as a flag icon beside their name.

### Settings persistence

`useLocalStorage` (`composables/useLocalStorage.ts`) is a custom reactive localStorage binding with a module-level singleton registry — all components sharing a key get the same `Ref`. Values are read **synchronously** from localStorage during setup (not in `onMounted`) so they are available immediately in route middleware, which runs before any component lifecycle hooks. The `watch` persists every change back to localStorage. `useGameSettings` wraps the player's difficulty, round count, and timer preferences. localStorage keys are prefixed `geo.*`.

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

Configured in `nuxt.config.ts` via `@vite-pwa/nuxt`. All SVGs (country flags + silhouettes), JS/CSS bundles, and `data.json` are precached via `workbox.globPatterns` so the game works fully offline. The app shell at `"/"` is added via `additionalManifestEntries` with a build-timestamp revision so the SW re-fetches it on every deploy. The leaderboard API uses a `NetworkFirst` runtime strategy.

### Docker

The Dockerfile expects `.output/` to already exist (built by CI before the image build). Mount a named volume at `/data` for the SQLite database. Override the DB path with `NUXT_DB_PATH`.
