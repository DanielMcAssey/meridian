/**
 * Downloads the ISO 3166-2 subdivisions CSV and stamps each country in
 * data.json with a `subdivisions` array of { name, cat } objects representing
 * its top-level administrative divisions.
 *
 * Usage: node scripts/add-subdivisions.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

const ROOT      = resolve(import.meta.dirname, '..')
const DATA_PATH = join(ROOT, 'public', 'data.json')

console.log('Fetching subdivisions.csv …')
const csvText = await fetch(
  'https://raw.githubusercontent.com/ipregistry/iso3166/refs/heads/main/subdivisions.csv'
).then((r) => r.text())

// ── Parse CSV ───────────────────────────────────────────────────────────────
// Header: #country_code_alpha2,subdivision_code_iso3166-2,subdivision_name,
//          language_code,parent_subdivision,category,localVariant
//
// Strategy per subdivision_code:
//   1. localVariant (non-empty)  — usually the familiar English name
//   2. row where language_code === 'en'
//   3. first row encountered
//
// Only keep top-level subdivisions (parent_subdivision empty).

// Map: subdivisionCode → { cc, name, cat }
const best = new Map()

for (const raw of csvText.split('\n')) {
  const line = raw.trim()
  if (!line || line.startsWith('#')) continue

  const [cc, code, name, lang, parent, cat, localVariant] = line.split(',')
  if (!cc || !code || !name) continue
  if (parent && parent.trim()) continue  // skip child subdivisions

  const key = code.trim()
  const entry = {
    cc:   cc.trim().toLowerCase(),
    name: name.trim(),
    cat:  (cat ?? '').trim().toUpperCase() || 'REGION',
  }
  const lv = (localVariant ?? '').trim()
  const lc = (lang ?? '').trim()

  if (!best.has(key)) {
    // First time seeing this code — store as initial best
    best.set(key, { ...entry, priority: 0 })
  }

  const cur = best.get(key)
  // Priority: localVariant (2) > en (1) > first (0)
  if (lv && cur.priority < 2) {
    best.set(key, { ...entry, name: lv, priority: 2 })
  } else if (lc === 'en' && cur.priority < 1) {
    best.set(key, { ...entry, priority: 1 })
  }
}

// ── Group by country code ───────────────────────────────────────────────────
const byCountry = new Map()   // 'us' → [{name, cat}, ...]
for (const { cc, name, cat } of best.values()) {
  if (!byCountry.has(cc)) byCountry.set(cc, [])
  byCountry.get(cc).push({ name, cat })
}

// ── Stamp data.json ─────────────────────────────────────────────────────────
const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'))
let stamped = 0
let missing = []
for (const c of data.countries) {
  const subs = byCountry.get(c.code)
  if (subs && subs.length) {
    c.subdivisions = subs
    stamped++
  } else {
    delete c.subdivisions
    missing.push(c.code)
  }
}
writeFileSync(DATA_PATH, JSON.stringify(data), 'utf8')
console.log(`Stamped ${stamped}/${data.countries.length} countries with subdivisions.`)
if (missing.length) console.warn('No subdivisions found for:', missing.join(', '))
