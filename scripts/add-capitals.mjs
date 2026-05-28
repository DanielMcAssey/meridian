/**
 * Reads datasources/country-data.csv and stamps each country in data.json
 * with a capital city name from the CSV's Capital field.
 *
 * Usage: node scripts/add-capitals.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, join }              from 'node:path'

const ROOT      = resolve(import.meta.dirname, '..')
const DATA_PATH = join(ROOT, 'public',      'data.json')
const CSV_PATH  = join(ROOT, 'datasources', 'country-data.csv')

// ── CSV parser ──────────────────────────────────────────────────────────────

function parseLine(line) {
  const out = []
  let cur = '', q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') q = false
      else cur += ch
    } else if (ch === '"') {
      q = true
    } else if (ch === ',') {
      out.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

function parseCsv(text) {
  const lines   = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const headers = parseLine(lines[0] ?? '')
  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const vals = parseLine(line)
      return Object.fromEntries(headers.map((h, i) => [h, vals[i]?.trim() ?? '']))
    })
}

// ── Build code → capital map ────────────────────────────────────────────────

const csvRows = parseCsv(readFileSync(CSV_PATH, 'utf8'))
const capitals = new Map()
for (const row of csvRows) {
  const code    = row['ISO3166-1-Alpha-2']?.toLowerCase()
  const capital = row['Capital']?.trim()
  if (code && capital) capitals.set(code, capital)
}

// ── Stamp data.json ─────────────────────────────────────────────────────────

const data    = JSON.parse(readFileSync(DATA_PATH, 'utf8'))
let stamped   = 0
const missing = []

for (const country of data.countries) {
  const capital = capitals.get(country.code)
  if (capital) {
    country.capital = capital
    stamped++
  } else {
    missing.push(country.code)
  }
}

writeFileSync(DATA_PATH, JSON.stringify(data), 'utf8')
console.log(`Stamped ${stamped}/${data.countries.length} countries with capitals.`)
if (missing.length) console.warn('No capital found for:', missing.join(', '))
