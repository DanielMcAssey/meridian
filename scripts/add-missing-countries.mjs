/**
 * Detects sovereign countries in datasources/country-data.csv that are absent
 * from data.json and adds a minimal skeleton entry for each one. Existing
 * countries are never modified — only new rows are inserted.
 *
 * Geographic coordinates (lat/lng, svgCx/svgCy, path) are approximated from
 * the country's continent centre and flagged in the output. Run flatten-maps.mjs
 * and download the flag SVG separately to complete each new entry.
 *
 * Usage: node scripts/add-missing-countries.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join }                           from 'node:path'

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

function extractLangCodes(field, langDefs) {
  if (!field) return []
  return [...new Set(
    field.split(',')
      .map(l => l.split('-')[0].trim().toLowerCase())
      .filter(l => l.length === 2 && langDefs[l]),
  )]
}

// ── Continent → game region ─────────────────────────────────────────────────

const CONTINENT_TO_REGION = {
  AF: 'Africa',
  AS: 'Asia',
  EU: 'Europe',
  NA: 'Americas',
  SA: 'Americas',
  OC: 'Oceania',
}

// Approximate lat/lng centroid per continent for placeholder coordinates.
const CONTINENT_APPROX = {
  AF: { lat:   5, lng:  20 },
  AS: { lat:  30, lng:  90 },
  EU: { lat:  50, lng:  15 },
  NA: { lat:  20, lng: -90 },
  SA: { lat: -15, lng: -60 },
  OC: { lat: -20, lng: 150 },
}

// Linear approximation of SVG map coordinates from lat/lng.
// Derived by regression against all existing country centroids in data.json.
// x ≈ 2.390·lng + 406.1  |  y ≈ −3.0·lat + 529
function approxSvgCoords(lat, lng) {
  return {
    svgCx: Math.round((2.390 * lng + 406.1) * 10) / 10,
    svgCy: Math.round((-3.0  * lat + 529.0) * 10) / 10,
  }
}

// Tiny polygon centred on (cx, cy) — same style as other small-island entries.
function tinyPath(cx, cy) {
  const x0 = (cx - 0.22).toFixed(3)
  const y0 = (cy - 1.38).toFixed(3)
  return `M${x0},${y0}l-0.76,1.62l0.92,1.23l1.14,-1.0L${x0},${y0}L${x0},${y0}z`
}

// ── Load datasources ────────────────────────────────────────────────────────

const langDefs = JSON.parse(readFileSync(LANG_PATH, 'utf8'))
const csvRows  = parseCsv(readFileSync(CSV_PATH, 'utf8'))
const data     = JSON.parse(readFileSync(DATA_PATH, 'utf8'))

const existing = new Set(data.countries.map(c => c.code))

let added = 0
const needsAssets = []

for (const row of csvRows) {
  const code = row['ISO3166-1-Alpha-2']?.toLowerCase()
  if (!code || code.length !== 2) continue
  if (row['is_independent'] !== 'Yes') continue
  if (existing.has(code)) continue

  const continent = row['Continent'] ?? ''
  const region    = CONTINENT_TO_REGION[continent] ?? 'Unknown'
  const approx    = CONTINENT_APPROX[continent] ?? { lat: 0, lng: 0 }
  const { svgCx, svgCy } = approxSvgCoords(approx.lat, approx.lng)

  const rawName = row['CLDR display name'] || row['official_name_en'] || code.toUpperCase()
  const capital = row['Capital'] || ''
  const langs   = extractLangCodes(row['Languages'], langDefs)

  data.countries.push({
    code,
    name:         rawName,
    lat:          approx.lat,
    lng:          approx.lng,
    svgCx,
    svgCy,
    region,
    tier:         4,
    flag:         `flags/${code}.svg`,
    path:         tinyPath(svgCx, svgCy),
    capital,
    shape:        `maps/${code}.svg`,
    lang:         langs[0] ?? 'en',
    langs:        langs.length ? langs : ['en'],
    subdivisions: [],
  })

  added++
  existing.add(code)

  const missingFlag  = !existsSync(join(ROOT, 'public', 'flags', `${code}.svg`))
  const missingShape = !existsSync(join(ROOT, 'public', 'maps',  `${code}.svg`))
  if (missingFlag || missingShape) {
    needsAssets.push({ code, missingFlag, missingShape })
  }
}

writeFileSync(DATA_PATH, JSON.stringify(data), 'utf8')
console.log(`Added ${added} countries (${data.countries.length} total).`)

if (needsAssets.length) {
  console.warn('\nThe following new countries need assets:')
  for (const { code, missingFlag, missingShape } of needsAssets) {
    const what = [missingFlag && 'flag SVG', missingShape && 'silhouette SVG'].filter(Boolean)
    console.warn(`  ${code}: missing ${what.join(', ')}`)
  }
  console.warn('\nDownload flags from:')
  console.warn('  https://github.com/hampusborgos/country-flags/tree/main/svg')
}
