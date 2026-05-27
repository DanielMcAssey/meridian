# Meridian — A Geographical Pastime

A geography quiz game of flags, map pins, and country outlines. Test your knowledge across 179 countries at four difficulty levels, with an optional countdown timer and a persistent global leaderboard.

> **Built with Claude** — this project is a first foray into using Claude AI to design and build a complete application, from architecture through to deployment.

---

## Game modes

| Mode | Description |
|---|---|
| **Flag** | Identify a country from its flag |
| **Pin Drop** | Identify a country highlighted on the world map |
| **Cartographer** | Identify a country from its outline |
| **Mixed** | All three types in rotation |

## Difficulty

| Level | Pool |
|---|---|
| Easy | ~70 flagship countries (tier 1) |
| Medium | ~125 well-known countries (tier 1–2) |
| Hard | ~157 countries (tier 1–3) |
| Expert | All 179 countries |

Distractors are always drawn from the same region as the answer, so they're plausible rather than random.

## Scoring

A correct answer scores **100 points**. With the timer enabled, up to **50 bonus points** are awarded based on how quickly you answered. Scores are submitted to a global leaderboard; submissions made while offline are queued and automatically sent when connectivity returns.

---

## Stack

- **[Nuxt 3](https://nuxt.dev)** — Vue 3 framework (client-side rendered game, Nitro server for the API)
- **[Pinia](https://pinia.vuejs.org)** — game state (atlas data, active session)
- **[TanStack Query](https://tanstack.com/query)** — leaderboard fetching and offline-resilient score submission
- **[Tailwind CSS v4](https://tailwindcss.com)** — styling with a custom design token system
- **[node:sqlite](https://nodejs.org/api/sqlite.html)** — Node 24 built-in SQLite for the leaderboard (no ORM)
- **PWA** — fully offline-capable; all flags, map data, and bundles are precached

## Running locally

```bash
npm install
npm run dev
```

## Building for production

```bash
npm run build
npm run preview   # run the production output locally
```

## Docker

The Docker image expects a pre-built `.output/` directory. Mount a volume at `/data` for the SQLite leaderboard database:

```bash
docker run -p 3000:3000 -v meridian-data:/data ghcr.io/danielmcassey/meridian
```

---

*Designed and built with [Claude](https://claude.ai) by [Daniel McAssey](https://github.com/DanielMcAssey).*
