/**
 * Adds 18 sovereign countries that were missing from data.json.
 * SVG paths are minimal placeholder polygons sized to match existing
 * small-island entries (Dominica, Seychelles, etc.) — the same style
 * already used for every country that is too small to render at this
 * world-map scale.
 *
 * Usage: node scripts/add-missing-countries.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

const ROOT      = resolve(import.meta.dirname, '..')
const DATA_PATH = join(ROOT, 'public', 'data.json')

// Tiny polygon centred on (cx, cy) — mirrors the Dominica / Seychelles pattern.
function tinyPath(cx, cy) {
  const x0 = (cx - 0.22).toFixed(3)
  const y0 = (cy - 1.38).toFixed(3)
  return `M${x0},${y0}l-0.76,1.62l0.92,1.23l1.14,-1.0L${x0},${y0}L${x0},${y0}z`
}

// SVG coordinate formula derived by linear regression against all existing
// country centroids:  x ≈ 2.390·lng + 406.1  |  y varies by latitude zone.
// Latitude calibration uses the nearest existing reference countries.
const COUNTRIES = [
  {
    code: 'ad', name: 'Andorra',
    lat: 42.5462, lng: 1.5218,
    svgCx: 409.7, svgCy: 418.4,
    region: 'Europe', tier: 4,
    capital: 'Andorra la Vella',
    lang: 'ca', langs: ['ca'],
  },
  {
    code: 'ag', name: 'Antigua and Barbuda',
    lat: 17.05, lng: -61.8,
    svgCx: 258.4, svgCy: 485.7,
    region: 'Americas', tier: 4,
    capital: "Saint John's",
    lang: 'en', langs: ['en'],
  },
  {
    code: 'bb', name: 'Barbados',
    lat: 13.1667, lng: -59.5333,
    svgCx: 263.8, svgCy: 497.2,
    region: 'Americas', tier: 3,
    capital: 'Bridgetown',
    lang: 'en', langs: ['en'],
  },
  {
    code: 'bh', name: 'Bahrain',
    lat: 26.0, lng: 50.55,
    svgCx: 526.9, svgCy: 459.2,
    region: 'Asia', tier: 3,
    capital: 'Manama',
    lang: 'ar', langs: ['ar'],
  },
  {
    code: 'fj', name: 'Fiji',
    lat: -17.7134, lng: 178.065,
    svgCx: 831.5, svgCy: 591.1,
    region: 'Oceania', tier: 3,
    capital: 'Suva',
    lang: 'en', langs: ['en', 'fj'],
  },
  {
    code: 'fm', name: 'Micronesia',
    lat: 6.8874, lng: 158.215,
    svgCx: 784.2, svgCy: 513.9,
    region: 'Oceania', tier: 4,
    capital: 'Palikir',
    lang: 'en', langs: ['en'],
  },
  {
    code: 'gd', name: 'Grenada',
    lat: 12.1165, lng: -61.679,
    svgCx: 258.7, svgCy: 500.3,
    region: 'Americas', tier: 4,
    capital: "Saint George's",
    lang: 'en', langs: ['en'],
  },
  {
    code: 'ki', name: 'Kiribati',
    lat: 1.8709, lng: 173.02,
    svgCx: 819.6, svgCy: 526.2,
    region: 'Oceania', tier: 4,
    capital: 'South Tarawa',
    lang: 'en', langs: ['en'],
  },
  {
    code: 'kn', name: 'Saint Kitts and Nevis',
    lat: 17.3578, lng: -62.783,
    svgCx: 256.0, svgCy: 484.8,
    region: 'Americas', tier: 4,
    capital: 'Basseterre',
    lang: 'en', langs: ['en'],
  },
  {
    code: 'li', name: 'Liechtenstein',
    lat: 47.166, lng: 9.5554,
    svgCx: 428.9, svgCy: 404.2,
    region: 'Europe', tier: 3,
    capital: 'Vaduz',
    lang: 'de', langs: ['de'],
  },
  {
    code: 'mc', name: 'Monaco',
    lat: 43.7384, lng: 7.4246,
    svgCx: 423.8, svgCy: 414.7,
    region: 'Europe', tier: 3,
    capital: 'Monaco',
    lang: 'fr', langs: ['fr'],
  },
  {
    code: 'mh', name: 'Marshall Islands',
    lat: 7.1315, lng: 171.184,
    svgCx: 815.2, svgCy: 513.3,
    region: 'Oceania', tier: 4,
    capital: 'Majuro',
    lang: 'en', langs: ['en', 'mh'],
  },
  {
    code: 'nr', name: 'Nauru',
    lat: -0.5228, lng: 166.932,
    svgCx: 805.0, svgCy: 532.0,
    region: 'Oceania', tier: 4,
    capital: 'Yaren',
    lang: 'en', langs: ['en', 'na'],
  },
  {
    code: 'pw', name: 'Palau',
    lat: 7.5149, lng: 134.582,
    svgCx: 727.8, svgCy: 512.4,
    region: 'Oceania', tier: 4,
    capital: 'Ngerulmud',
    lang: 'en', langs: ['en'],
  },
  {
    code: 'sm', name: 'San Marino',
    lat: 43.9424, lng: 12.458,
    svgCx: 435.9, svgCy: 414.1,
    region: 'Europe', tier: 3,
    capital: 'San Marino',
    lang: 'it', langs: ['it'],
  },
  {
    code: 'tl', name: 'Timor-Leste',
    lat: -8.8742, lng: 125.7275,
    svgCx: 706.6, svgCy: 554.0,
    region: 'Asia', tier: 4,
    capital: 'Dili',
    lang: 'pt', langs: ['pt'],
  },
  {
    code: 'to', name: 'Tonga',
    lat: -21.1789, lng: -175.1982,
    svgCx: -12.6, svgCy: 604.9,
    region: 'Oceania', tier: 4,
    capital: 'Nukuʻalofa',
    lang: 'to', langs: ['to', 'en'],
  },
  {
    code: 'tv', name: 'Tuvalu',
    lat: -7.1095, lng: 179.194,
    svgCx: 834.3, svgCy: 549.9,
    region: 'Oceania', tier: 4,
    capital: 'Funafuti',
    lang: 'en', langs: ['en'],
  },
]

const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'))

const existingCodes = new Set(data.countries.map((c) => c.code))
let added = 0

for (const c of COUNTRIES) {
  if (existingCodes.has(c.code)) {
    console.log(`Skipping ${c.code} — already exists`)
    continue
  }
  data.countries.push({
    code:         c.code,
    name:         c.name,
    lat:          c.lat,
    lng:          c.lng,
    svgCx:        c.svgCx,
    svgCy:        c.svgCy,
    region:       c.region,
    tier:         c.tier,
    flag:         `flags/${c.code}.svg`,
    path:         tinyPath(c.svgCx, c.svgCy),
    capital:      c.capital,
    shape:        `maps/${c.code}.svg`,
    lang:         c.lang,
    langs:        c.langs,
    subdivisions: [],
  })
  added++
}

writeFileSync(DATA_PATH, JSON.stringify(data), 'utf8')
console.log(`Added ${added} countries to data.json (${data.countries.length} total).`)
