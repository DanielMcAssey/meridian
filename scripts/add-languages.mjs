/**
 * Reads datasources/country-data.csv for country→language mappings and
 * datasources/all-languages.json for code→English name, then stamps each
 * country in data.json with a `langs` array and regenerates utils/languages.ts.
 *
 * Usage: node scripts/add-languages.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, join }              from 'node:path'

const ROOT      = resolve(import.meta.dirname, '..')
const DATA_PATH = join(ROOT, 'public',      'data.json')
const LANG_PATH = join(ROOT, 'datasources', 'all-languages.json')
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

// ── Extract ISO 639-1 codes from a Languages field ──────────────────────────
// e.g. "fa-AF,ps,uz-AF,tk" → ["fa", "ps", "uz", "tk"]
// Strips region tags, keeps only 2-letter ISO 639-1 codes.

function extractLangCodes(field) {
  if (!field) return []
  return [...new Set(
    field.split(',')
      .map(l => l.split('-')[0].trim().toLowerCase())
      .filter(l => l.length === 2),
  )]
}

// ── Load datasources ────────────────────────────────────────────────────────

const langDefs = JSON.parse(readFileSync(LANG_PATH, 'utf8'))  // code → { name, native }
const csvRows   = parseCsv(readFileSync(CSV_PATH, 'utf8'))

// Build: ISO 2-letter code (lower) → [lang codes present in all-languages.json]
const csvLangs = new Map()
for (const row of csvRows) {
  const code = row['ISO3166-1-Alpha-2']?.toLowerCase()
  if (!code) continue
  const codes = extractLangCodes(row['Languages']).filter(l => langDefs[l])
  if (codes.length) csvLangs.set(code, codes)
}

// ── Stamp data.json ─────────────────────────────────────────────────────────

const data    = JSON.parse(readFileSync(DATA_PATH, 'utf8'))
let stamped   = 0
const missing = []

for (const country of data.countries) {
  const codes = csvLangs.get(country.code)
  if (codes?.length) {
    country.langs = codes
    country.lang  = codes[0]
    stamped++
  } else {
    missing.push(country.code)
  }
}

writeFileSync(DATA_PATH, JSON.stringify(data), 'utf8')
console.log(`Stamped ${stamped}/${data.countries.length} countries with langs.`)
if (missing.length) console.warn('No langs found for:', missing.join(', '))

// ── Emit public/languages.json ───────────────────────────────────────────────

const usedCodes = new Set(data.countries.flatMap(c => c.langs ?? []))
const langMap   = Object.fromEntries(
  [...usedCodes].sort().map(code => [code, langDefs[code]?.name ?? code]),
)

writeFileSync(join(ROOT, 'public', 'languages.json'), JSON.stringify(langMap), 'utf8')
console.log(`Wrote public/languages.json with ${usedCodes.size} language entries.`)
