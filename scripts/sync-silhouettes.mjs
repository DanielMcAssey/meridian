/**
 * Downloads silhouette SVGs from djaiss/mapsicon for every country in data.json
 * and updates the shape field accordingly.
 *
 * - Hit:  saves public/maps/{code}.svg and sets shape = "maps/{code}.svg"
 * - Miss: sets shape = null  (country is excluded from silhouette rounds)
 *
 * Already-downloaded files are skipped unless --force is passed.
 *
 * Usage:
 *   node scripts/sync-silhouettes.mjs
 *   node scripts/sync-silhouettes.mjs --force
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join }                           from 'node:path'

const ROOT      = resolve(import.meta.dirname, '..')
const MAPS_DIR  = join(ROOT, 'public', 'maps')
const DATA_PATH = join(ROOT, 'public', 'data.json')
const BASE_URL  = 'https://raw.githubusercontent.com/djaiss/mapsicon/master/all'
const FORCE     = process.argv.includes('--force')

function cleanSvg(raw) {
  return raw
    .replace(/<\?xml[^?]*\?>\s*/g, '')
    .replace(/<!DOCTYPE[^>]*(\[[\s\S]*?\])?\s*>\s*/g, '')
    .replace(/<metadata>[\s\S]*?<\/metadata>\s*/g, '')
    .replace(/(<svg[^>]*?)\s+width="[^"]*"/,  '$1')
    .replace(/(<svg[^>]*?)\s+height="[^"]*"/, '$1')
    .trim()
}

const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'))
let downloaded = 0, cached = 0, notFound = 0, failed = 0

for (const country of data.countries) {
  const dest = join(MAPS_DIR, `${country.code}.svg`)

  if (!FORCE && existsSync(dest)) {
    country.shape = `maps/${country.code}.svg`
    cached++
    continue
  }

  const url = `${BASE_URL}/${country.code}/vector.svg`
  try {
    const res = await fetch(url)

    if (res.status === 404) {
      country.shape = null
      notFound++
      console.log(`  ✗ ${country.code}  (not in mapsicon)`)
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    writeFileSync(dest, cleanSvg(await res.text()), 'utf8')
    country.shape = `maps/${country.code}.svg`
    downloaded++
    console.log(`  ✓ ${country.code}`)

    await new Promise(r => setTimeout(r, 50))  // be polite to GitHub CDN
  } catch (err) {
    country.shape = null
    failed++
    console.log(`  ✗ ${country.code}  (${err.message})`)
  }
}

writeFileSync(DATA_PATH, JSON.stringify(data), 'utf8')

const withShape = data.countries.filter(c => c.shape).length
console.log(`\nDownloaded: ${downloaded}  Cached: ${cached}  Not found: ${notFound}  Errors: ${failed}`)
console.log(`Silhouettes available: ${withShape}/${data.countries.length} countries`)
