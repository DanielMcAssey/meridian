/**
 * Stamps an `altRegions` array onto transcontinental countries in data.json.
 *
 * The `region` field holds a country's single primary continent (derived from a
 * single-value CSV in add-missing-countries.mjs). Some countries legitimately
 * span two continents (e.g. Cyprus — Europe & Asia). `altRegions` lists the
 * *extra* accepted continents on top of `region`, so region rounds can accept
 * either continent as correct while still showing only one option.
 *
 * This map is editorial — there is no authoritative multi-continent source.
 * Idempotent: each run reconciles `altRegions` to exactly match ALT_REGIONS,
 * adding, correcting, or removing the field as needed.
 *
 * Usage: node scripts/add-alt-regions.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, join }               from 'node:path'

const ROOT      = resolve(import.meta.dirname, '..')
const DATA_PATH = join(ROOT, 'public', 'data.json')

// ISO 3166-1 alpha-2 code → extra accepted continents (in addition to the
// country's primary `region`). Continents use the game's 5-region scheme:
// Africa / Americas / Asia / Europe / Oceania.
const ALT_REGIONS = {
  cy: ['Asia'],     // Cyprus     (primary Europe)
  ru: ['Asia'],     // Russia     (primary Europe)
  tr: ['Europe'],   // Turkey     (primary Asia)
  ge: ['Europe'],   // Georgia    (primary Asia)
  az: ['Europe'],   // Azerbaijan (primary Asia)
  am: ['Europe'],   // Armenia    (primary Asia)
  kz: ['Europe'],   // Kazakhstan (primary Asia)
  eg: ['Asia'],     // Egypt      (Sinai; primary Africa)
}

const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'))

let changed = 0
for (const c of data.countries) {
  const alt = ALT_REGIONS[c.code]
  if (alt) {
    // Drop any value that duplicates the primary region, just in case.
    const next = alt.filter((r) => r !== c.region)
    if (JSON.stringify(c.altRegions) !== JSON.stringify(next)) {
      c.altRegions = next
      changed++
    }
  } else if (c.altRegions !== undefined) {
    delete c.altRegions
    changed++
  }
}

writeFileSync(DATA_PATH, JSON.stringify(data), 'utf8')
console.log(`✓ add-alt-regions: reconciled ${Object.keys(ALT_REGIONS).length} entries, ${changed} changed.`)
