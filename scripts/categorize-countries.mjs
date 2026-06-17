/**
 * Uses datasources/attribution.json as the authority for the country/territory
 * split and for the canonical flag location. For every entry already in
 * public/data.json it:
 *   - stamps `type` ('country' | 'territory')
 *   - rewrites `flag` to the categorised path
 *     (flags/countries/<code>.svg  or  flags/territories/<code>.svg)
 *   - stamps `hasFlag` — false for territories that have no flag of their own
 *     and borrow a sovereign country's flag (attribution `usesFlag`, e.g.
 *     French Guiana → fr). Those entries are excluded from the banner game and
 *     their `flag` is pointed at the borrowed country's flag for display.
 *
 * It then inserts a minimal skeleton entry for every code present in
 * attribution.json but missing from data.json — both `countries` and
 * `territories`. New entries are enriched from datasources/country-data.csv
 * where a matching row exists; a small manual fallback covers the handful of
 * codes that have no CSV row. The remaining sync scripts (add-capitals,
 * add-languages, add-subdivisions, add-wikidata, and sync-silhouettes) fill in
 * the rest by code on subsequent runs.
 *
 * A few deprecated / duplicate ISO codes that appear in attribution.json are
 * skipped so they don't create duplicate playable entries:
 *   bu → Myanmar (already `mm`), tp → Timor-Leste (already `tl`),
 *   an → Netherlands Antilles (dissolved into cw / sx / bq).
 *
 * Usage: node scripts/categorize-countries.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join }                           from 'node:path'

const ROOT      = resolve(import.meta.dirname, '..')
const DATA_PATH = join(ROOT, 'public',      'data.json')
const ATTR_PATH = join(ROOT, 'datasources', 'attribution.json')
const LANG_PATH = join(ROOT, 'datasources', 'all-languages.json')
const CSV_PATH  = join(ROOT, 'datasources', 'country-data.csv')

// Deprecated / duplicate ISO codes — never inserted as standalone entries.
const SKIP_CODES = new Set(['bu', 'tp', 'an'])

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
  AN: 'Antarctica',
}

// Approximate lat/lng centroid per continent for placeholder coordinates.
const CONTINENT_APPROX = {
  AF: { lat:   5, lng:  20 },
  AS: { lat:  30, lng:  90 },
  EU: { lat:  50, lng:  15 },
  NA: { lat:  20, lng: -90 },
  SA: { lat: -15, lng: -60 },
  OC: { lat: -20, lng: 150 },
  AN: { lat: -75, lng:   0 },
}

// Codes with no CSV row — supply a continent (drives region + placeholder
// coords) plus best-effort capital/languages.
const FALLBACK = {
  xk: { continent: 'EU', capital: 'Pristina', langs: ['sq', 'sr'] },
  cp: { continent: 'OC', capital: '',         langs: ['fr'] },
  cq: { continent: 'EU', capital: '',         langs: ['en', 'fr'] },
  ac: { continent: 'AF', capital: 'Georgetown',                  langs: ['en'] },
  dg: { continent: 'AS', capital: '',         langs: ['en'] },
  ta: { continent: 'AF', capital: 'Edinburgh of the Seven Seas', langs: ['en'] },
}

// Linear approximation of SVG map coordinates from lat/lng.
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

// Strip the leading "public/" so the stored path resolves from the web root.
function webPath(localFile, code, type) {
  if (localFile) return localFile.replace(/^public[\\/]/, '').replace(/\\/g, '/')
  return `flags/${type === 'territory' ? 'territories' : 'countries'}/${code}.svg`
}

// Resolve the flag path + ownership flag for an entry. Territories whose
// attribution entry carries a `usesFlag` (a sovereign country's ISO code)
// have no flag of their own — point `flag` at the borrowed country's flag so
// it still displays, and mark `hasFlag: false` so it's excluded from banner
// rounds (see flagPool in utils/rounds.ts).
function flagInfo(attrEntry, code, type) {
  const usesFlag = attrEntry?.usesFlag || null
  if (usesFlag) return { flag: `flags/countries/${usesFlag}.svg`, hasFlag: false }
  return { flag: webPath(attrEntry?.localFile, code, type), hasFlag: true }
}

// ── Load datasources ────────────────────────────────────────────────────────

const langDefs = JSON.parse(readFileSync(LANG_PATH, 'utf8'))
const attr     = JSON.parse(readFileSync(ATTR_PATH, 'utf8'))
const csvRows  = parseCsv(readFileSync(CSV_PATH, 'utf8'))
const data     = JSON.parse(readFileSync(DATA_PATH, 'utf8'))

const csvByCode = new Map(
  csvRows
    .map(r => [String(r['ISO3166-1-Alpha-2'] ?? '').toLowerCase(), r])
    .filter(([code]) => code.length === 2),
)

// code → { type, entry } from attribution (countries take precedence if a code
// were to appear in both sections, which it should not).
const typeByCode = new Map()
for (const [code, entry] of Object.entries(attr.territories ?? {}))
  typeByCode.set(code, { type: 'territory', entry })
for (const [code, entry] of Object.entries(attr.countries ?? {}))
  typeByCode.set(code, { type: 'country', entry })

// ── 1. Stamp type + categorised flag path on existing entries ───────────────

const existing = new Set(data.countries.map(c => c.code))
let recategorised = 0

for (const country of data.countries) {
  const info = typeByCode.get(country.code)
  const type = info?.type ?? 'country'
  const { flag, hasFlag } = flagInfo(info?.entry, country.code, type)
  if (country.type !== type || country.flag !== flag || country.hasFlag !== hasFlag) recategorised++
  country.type    = type
  country.flag    = flag
  country.hasFlag = hasFlag
}

// ── 2. Insert skeletons for codes missing from data.json ────────────────────

function buildSkeleton(code, type, attrEntry) {
  const row      = csvByCode.get(code)
  const fallback = FALLBACK[code]

  const continent = row?.['Continent'] || fallback?.continent || ''
  const region    = CONTINENT_TO_REGION[continent] ?? 'Unknown'
  const approx    = CONTINENT_APPROX[continent]    ?? { lat: 0, lng: 0 }
  const { svgCx, svgCy } = approxSvgCoords(approx.lat, approx.lng)

  const name =
    attrEntry?.label ||
    row?.['CLDR display name'] || row?.['official_name_en'] || code.toUpperCase()
  const capital = row?.['Capital']?.trim() || fallback?.capital || ''
  const langs   = row ? extractLangCodes(row['Languages'], langDefs)
                      : (fallback?.langs ?? [])

  const hasShape = existsSync(join(ROOT, 'public', 'maps', `${code}.svg`))
  const { flag, hasFlag } = flagInfo(attrEntry, code, type)

  return {
    code,
    name,
    type,
    lat:          approx.lat,
    lng:          approx.lng,
    svgCx,
    svgCy,
    region,
    tier:         4,
    flag,
    path:         tinyPath(svgCx, svgCy),
    capital,
    shape:        hasShape ? `maps/${code}.svg` : null,
    lang:         langs[0] ?? 'en',
    langs:        langs.length ? langs : ['en'],
    subdivisions: [],
    hasShape,
    hasFlag,
    hasMapPath:   false,
  }
}

let addedCountries = 0, addedTerritories = 0
const needsAssets = []

for (const [code, { type, entry }] of typeByCode) {
  if (existing.has(code) || SKIP_CODES.has(code)) continue

  data.countries.push(buildSkeleton(code, type, entry))
  existing.add(code)
  if (type === 'territory') addedTerritories++
  else addedCountries++

  if (!existsSync(join(ROOT, 'public', 'maps', `${code}.svg`)))
    needsAssets.push(code)
}

// Keep the file deterministically ordered by code so diffs stay readable.
data.countries.sort((a, b) => a.code.localeCompare(b.code))

writeFileSync(DATA_PATH, JSON.stringify(data), 'utf8')

const countries   = data.countries.filter(c => c.type === 'country').length
const territories = data.countries.filter(c => c.type === 'territory').length
console.log(`Re-categorised/flag-fixed ${recategorised} existing entries.`)
console.log(`Added ${addedCountries} countries, ${addedTerritories} territories.`)
console.log(`Total: ${data.countries.length} entries (${countries} countries, ${territories} territories).`)

if (needsAssets.length) {
  console.warn(`\n${needsAssets.length} new entries have no silhouette SVG (maps/<code>.svg):`)
  console.warn(`  ${needsAssets.join(', ')}`)
  console.warn('Run `node scripts/sync-silhouettes.mjs` to fetch any that exist upstream.')
}
