/**
 * Fetches country data from the WikiData API and stamps each country in data.json
 * with: wikipedia URL, currency (name/symbol/code), population, area, and langs.
 * langs are merged: CSV-derived langs (from add-languages.mjs) come first; Wikidata adds any
 * additional official-language codes known to all-languages.json.
 * public/languages.json is regenerated at the end to capture all langs now in data.json.
 *
 * Reads datasources/country-data.csv for WikiData Q-IDs.
 *
 * Usage: node scripts/add-wikidata.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, join }              from 'node:path'

const ROOT           = resolve(import.meta.dirname, '..')
const DATA_PATH      = join(ROOT, 'public',      'data.json')
const CSV_PATH       = join(ROOT, 'datasources', 'country-data.csv')
const LANG_DEFS_PATH = join(ROOT, 'datasources', 'all-languages.json')

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'
const BATCH_SIZE   = 50
const BATCH_DELAY  = 1100  // WikiData anonymous limit is ~1 req/sec

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

// ── Build code ↔ QID maps ────────────────────────────────────────────────────

const csvRows   = parseCsv(readFileSync(CSV_PATH, 'utf8'))
const codeToQid = new Map()
const qidToCode = new Map()

for (const row of csvRows) {
  const code       = row['ISO3166-1-Alpha-2']?.toLowerCase()
  const wikidataUrl = row['wikidata_id']?.trim()
  if (!code || !wikidataUrl) continue
  const match = wikidataUrl.match(/\/wiki\/(Q\d+)$/)
  if (match) {
    codeToQid.set(code, match[1])
    qidToCode.set(match[1], code)
  }
}

// ── Claim helpers ────────────────────────────────────────────────────────────

function getBestClaim(stmts) {
  if (!stmts?.length) return null
  const preferred = stmts.filter(s => s.rank === 'preferred')
  if (preferred.length) return preferred[0]
  const normal = stmts.filter(s => s.rank === 'normal')
  return normal[0] ?? null
}

function stringVal(claim) {
  const v = claim?.mainsnak?.datavalue?.value ?? null
  if (!v) return null
  // monolingual text values have { text, language } — unwrap to just the text
  if (typeof v === 'object' && 'text' in v) return v.text
  return v
}

function entityId(claim) {
  return claim?.mainsnak?.datavalue?.value?.id ?? null
}

function quantityVal(claim) {
  const v = claim?.mainsnak?.datavalue?.value
  if (!v?.amount) return null
  return Math.round(Math.abs(parseFloat(v.amount)))
}

function extractPopulation(claims) {
  const stmts = (claims?.P1082 ?? []).filter(s => s.rank !== 'deprecated')
  if (!stmts.length) return null
  // Sort: preferred rank first, then most recent by P585 (point in time) qualifier
  stmts.sort((a, b) => {
    if (a.rank === 'preferred' && b.rank !== 'preferred') return -1
    if (b.rank === 'preferred' && a.rank !== 'preferred') return 1
    const tA = a.qualifiers?.P585?.[0]?.datavalue?.value?.time ?? ''
    const tB = b.qualifiers?.P585?.[0]?.datavalue?.value?.time ?? ''
    return tB.localeCompare(tA)
  })
  return quantityVal({ mainsnak: stmts[0].mainsnak })
}

function extractArea(claims) {
  const stmts = claims?.P2046 ?? []
  if (!stmts.length) return null
  // Prefer km² values (Q712226)
  const kmStmts = stmts.filter(s =>
    s.mainsnak?.datavalue?.value?.unit?.endsWith('Q712226')
  )
  return quantityVal(getBestClaim(kmStmts.length ? kmStmts : stmts))
}

function extractLangQids(claims) {
  // P37 = official language; sort preferred rank first, then normal
  const stmts = (claims?.P37 ?? []).filter(s => s.rank !== 'deprecated')
  stmts.sort((a, b) => {
    if (a.rank === 'preferred' && b.rank !== 'preferred') return -1
    if (b.rank === 'preferred' && a.rank !== 'preferred') return 1
    return 0
  })
  return stmts.map(s => entityId({ mainsnak: s.mainsnak })).filter(Boolean)
}

// ── Network helpers ──────────────────────────────────────────────────────────

const HEADERS = { 'User-Agent': 'meridian-sync/1.0' }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
function progress(n, total, label) { process.stdout.write(`  ${n}/${total} ${label}\r`) }
function progressDone() { process.stdout.write('\n') }

async function fetchEntities(ids, props, extra = '') {
  const url = `${WIKIDATA_API}?action=wbgetentities&ids=${ids.join('|')}&props=${props}&format=json${extra}`
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url, { headers: HEADERS })
    const ct  = res.headers.get('content-type') ?? ''
    if (ct.includes('application/json')) return (await res.json()).entities ?? {}
    // Non-JSON response means rate-limited — back off with longer waits
    const wait = 5000 * attempt
    process.stdout.write(`\n  Rate limited, retrying in ${wait / 1000}s…`)
    await sleep(wait)
  }
  throw new Error('WikiData API rate limit exceeded after 5 retries')
}

// ── Load language definitions (used to filter WikiData lang codes) ────────────

const langDefs = JSON.parse(readFileSync(LANG_DEFS_PATH, 'utf8'))  // code → { name, native }

// ── Phase 1: country entities — claims + sitelinks ───────────────────────────

console.log('Phase 1: fetching country entity data…')
const qids         = [...codeToQid.values()]
const countryFacts = new Map()  // code → { wikipedia, currencyQid, population, area, langQids }

for (let i = 0; i < qids.length; i += BATCH_SIZE) {
  const batch    = qids.slice(i, i + BATCH_SIZE)
  const entities = await fetchEntities(batch, 'claims%7Csitelinks', '&sitefilter=enwiki')

  for (const [qid, entity] of Object.entries(entities)) {
    if (entity.missing != null) continue
    const code = qidToCode.get(qid)
    if (!code) continue

    const sl        = entity.sitelinks?.enwiki
    const wikipedia = sl?.url
      ?? (sl?.title ? `https://en.wikipedia.org/wiki/${encodeURIComponent(sl.title).replace(/%20/g, '_')}` : null)

    countryFacts.set(code, {
      wikipedia,
      currencyQid: entityId(getBestClaim(entity.claims?.P38)),
      population:  extractPopulation(entity.claims),
      area:        extractArea(entity.claims),
      langQids:    extractLangQids(entity.claims),
    })
  }

  progress(Math.min(i + BATCH_SIZE, qids.length), qids.length, 'entities')
  if (i + BATCH_SIZE < qids.length) await sleep(BATCH_DELAY)
}
progressDone()

// ── Phase 2: currency entities — labels + claims ─────────────────────────────

console.log('Phase 2: fetching currency data…')
const uniqueCurrencyQids = [...new Set(
  [...countryFacts.values()].map(d => d.currencyQid).filter(Boolean)
)]
const currencyMap = new Map()  // QID → { name, symbol?, code? }

for (let i = 0; i < uniqueCurrencyQids.length; i += BATCH_SIZE) {
  const batch    = uniqueCurrencyQids.slice(i, i + BATCH_SIZE)
  const entities = await fetchEntities(batch, 'labels%7Cclaims', '&languages=en')

  for (const [qid, entity] of Object.entries(entities)) {
    if (entity.missing != null) continue
    const name   = entity.labels?.en?.value
    const symbol = stringVal(getBestClaim(entity.claims?.P5061)) ?? undefined
    const code   = stringVal(getBestClaim(entity.claims?.P498))  ?? undefined
    if (name) currencyMap.set(qid, { name, ...(symbol && { symbol }), ...(code && { code }) })
  }

  progress(Math.min(i + BATCH_SIZE, uniqueCurrencyQids.length), uniqueCurrencyQids.length, 'currencies')
  if (i + BATCH_SIZE < uniqueCurrencyQids.length) await sleep(BATCH_DELAY)
}
progressDone()

// ── Phase 3: language entities — labels + P218 (ISO 639-1 code) ─────────────

console.log('Phase 3: fetching language data…')
const uniqueLangQids = [...new Set(
  [...countryFacts.values()].flatMap(d => d.langQids ?? [])
)]
const langEntityMap = new Map()  // QID → { isoCode, name }

for (let i = 0; i < uniqueLangQids.length; i += BATCH_SIZE) {
  const batch    = uniqueLangQids.slice(i, i + BATCH_SIZE)
  const entities = await fetchEntities(batch, 'labels%7Cclaims', '&languages=en')

  for (const [qid, entity] of Object.entries(entities)) {
    if (entity.missing != null) continue
    const name    = entity.labels?.en?.value
    const isoCode = stringVal(getBestClaim(entity.claims?.P218))?.toLowerCase()
    // Only keep languages with a valid 2-letter ISO 639-1 code
    if (isoCode?.length === 2 && name) langEntityMap.set(qid, { isoCode, name })
  }

  progress(Math.min(i + BATCH_SIZE, uniqueLangQids.length), uniqueLangQids.length, 'languages')
  if (i + BATCH_SIZE < uniqueLangQids.length) await sleep(BATCH_DELAY)
}
progressDone()

// ── Stamp data.json ──────────────────────────────────────────────────────────

const data    = JSON.parse(readFileSync(DATA_PATH, 'utf8'))
let stamped   = 0
const missing = []

for (const country of data.countries) {
  const facts = countryFacts.get(country.code)
  if (!facts) { missing.push(country.code); continue }

  if (facts.wikipedia)   country.wikipedia   = facts.wikipedia
  if (facts.population)  country.population  = facts.population
  if (facts.area)        country.area        = facts.area

  if (facts.currencyQid) {
    const currency = currencyMap.get(facts.currencyQid)
    if (currency) country.currency = currency
  }

  if (facts.langQids?.length) {
    const wikidataCodes = [...new Set(
      facts.langQids
        .map(qid => langEntityMap.get(qid)?.isoCode)
        .filter(code => code && langDefs[code])  // only codes known to all-languages.json
    )]
    if (wikidataCodes.length) {
      // Merge: CSV-derived langs (already in country.langs) come first; Wikidata adds any new ones.
      const existing = country.langs ?? []
      const existingSet = new Set(existing)
      const merged = [...existing, ...wikidataCodes.filter(c => !existingSet.has(c))]
      country.langs = merged
      country.lang  = merged[0]
    }
  }

  stamped++
}

writeFileSync(DATA_PATH, JSON.stringify(data), 'utf8')
console.log(`Stamped ${stamped}/${data.countries.length} countries.`)
if (missing.length) console.warn('No WikiData entry for:', missing.join(', '))

// Regenerate public/languages.json from all langs now present in data.json
const LANGS_OUT_PATH = join(ROOT, 'public', 'languages.json')
const usedCodes = new Set(data.countries.flatMap(c => c.langs ?? []))
const langMap   = Object.fromEntries(
  [...usedCodes].sort().map(code => [code, langDefs[code]?.name ?? code]),
)
writeFileSync(LANGS_OUT_PATH, JSON.stringify(langMap), 'utf8')
console.log(`Wrote public/languages.json with ${usedCodes.size} language entries.`)
