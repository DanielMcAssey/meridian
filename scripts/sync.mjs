/**
 * Master sync script — runs all data scripts in the correct order so that
 * data.json and public/languages.json stay in sync with the datasources directory.
 *
 * Order:
 *   1. add-missing-countries  — insert any new sovereign states from CSV
 *   2. categorize-countries   — stamp type (country/territory) + categorised flag
 *                               paths from attribution.json; insert any missing
 *                               countries and territories
 *   3. add-alt-regions        — stamp altRegions on transcontinental countries
 *   4. add-capitals           — stamp capital cities from CSV
 *   5. add-languages          — stamp langs arrays + regenerate public/languages.json
 *   6. add-subdivisions       — fetch ISO 3166-2 data and stamp subdivisions
 *                               (requires network; pass --no-subdivisions to skip)
 *
 * Usage:
 *   node scripts/sync.mjs
 *   node scripts/sync.mjs --no-subdivisions
 */

import { spawnSync } from 'node:child_process'
import { resolve }   from 'node:path'

const dir             = import.meta.dirname
const noSubdivisions  = process.argv.includes('--no-subdivisions')

const scripts = [
  'add-missing-countries.mjs',
  'categorize-countries.mjs',
  'add-alt-regions.mjs',
  'add-capitals.mjs',
  'add-languages.mjs',
  'add-wikidata.mjs',
  ...(!noSubdivisions ? ['add-subdivisions.mjs'] : []),
]

for (const script of scripts) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`▶ ${script}`)
  console.log('─'.repeat(60))

  const result = spawnSync('node', [resolve(dir, script)], { stdio: 'inherit' })
  if (result.status !== 0) {
    console.error(`\n✗ ${script} exited with status ${result.status}`)
    process.exit(result.status ?? 1)
  }
}

console.log(`\n${'─'.repeat(60)}`)
console.log('✓ Sync complete.')
