/**
 * Flattens public/maps/tmp/{code}/vector.svg → public/maps/{code}.svg
 * and stamps each country in data.json with a `shape` field pointing to it.
 *
 * Usage: node scripts/flatten-maps.mjs
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT      = resolve(import.meta.dirname, '..')
const TMP_DIR   = join(ROOT, 'public', 'maps', 'tmp')
const MAPS_DIR  = join(ROOT, 'public', 'maps')
const DATA_PATH = join(ROOT, 'public', 'data.json')

function cleanSvg(raw) {
  return raw
    .replace(/<\?xml[^?]*\?>\s*/g, '')               // remove XML declaration
    .replace(/<!DOCTYPE[^>]*(\[[\s\S]*?\])?\s*>\s*/g, '') // remove DOCTYPE
    .replace(/<metadata>[\s\S]*?<\/metadata>\s*/g, '') // remove metadata block
    .replace(/(<svg[^>]*?)\s+width="[^"]*"/, '$1')   // strip fixed width
    .replace(/(<svg[^>]*?)\s+height="[^"]*"/, '$1')  // strip fixed height
    .trim()
}

// ── 1. Copy & clean SVGs ────────────────────────────────────────────────────
const codes = readdirSync(TMP_DIR)
let copied = 0
for (const code of codes) {
  const src = join(TMP_DIR, code, 'vector.svg')
  const dst = join(MAPS_DIR, `${code}.svg`)
  if (existsSync(src)) {
    writeFileSync(dst, cleanSvg(readFileSync(src, 'utf8')), 'utf8')
    copied++
  }
}
console.log(`Wrote ${copied} SVGs → public/maps/{code}.svg`)

// ── 2. Stamp data.json with shape paths ────────────────────────────────────
const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'))
let updated = 0
for (const country of data.countries) {
  if (existsSync(join(MAPS_DIR, `${country.code}.svg`))) {
    country.shape = `maps/${country.code}.svg`
    updated++
  } else {
    delete country.shape
  }
}
writeFileSync(DATA_PATH, JSON.stringify(data), 'utf8')
console.log(`Stamped ${updated}/${data.countries.length} countries in data.json`)
