import { defineStore, skipHydrate } from 'pinia'
import { computed, ref } from 'vue'
import type { Country, Currency, Subdivision } from '~/types/game'

interface AtlasData {
  viewBox: string
  countries: Array<
    Country & {
      flag:          string
      path:          string
      shape:         string | null
      hasMapPath:    boolean
      altRegions?:   string[]
      langs?:        string[]
      subdivisions?: Subdivision[]
      wikipedia?:    string
      currency?:     Currency
      population?:   number
      area?:         number
    }
  >
}

export const useAtlasStore = defineStore('atlas', () => {
  // skipHydrate: all atlas data is loaded client-side via atlas.load() in onMounted.
  // Marking these refs skips Pinia's SSR serialisation entirely, which avoids a
  // crash in Pinia's shouldHydrate() when Vue Router or @pinia/nuxt intern objects
  // with null-prototype (Object.create(null)) appear in the devalue traversal.
  const countries      = skipHydrate(ref<Country[]>([]))
  const countryPaths   = skipHydrate(ref<Record<string, string>>({}))
  const flagPaths      = skipHydrate(ref<Record<string, string>>({}))
  const shapePaths     = skipHydrate(ref<Record<string, string>>({}))
  const languageNames  = skipHydrate(ref<Record<string, string>>({}))
  const viewBox        = skipHydrate(ref(''))
  const ready          = skipHydrate(ref(false))
  const error          = skipHydrate(ref<string | null>(null))

  const byCode         = skipHydrate(computed<Record<string, Country>>(() => {
    const m: Record<string, Country> = {}
    for (const c of countries.value) m[c.code] = c
    return m
  }))

  async function load() {
    if (ready.value) return
    error.value = null
    try {
      const [data, langs] = await Promise.all([
        $fetch<AtlasData>('/data.json'),
        $fetch<Record<string, string>>('/languages.json'),
      ])
      languageNames.value = langs

      viewBox.value = data.viewBox

      countries.value = data.countries.map((c) => ({
        code:    c.code,
        name:    c.name,
        capital: c.capital,
        lat:     c.lat,
        lng:     c.lng,
        svgCx:   c.svgCx,
        svgCy:   c.svgCy,
        region:  c.region,
        altRegions: c.altRegions,
        tier:    c.tier,
        langs:        c.langs ?? [],
        subdivisions: c.subdivisions ?? [],
        hasShape:     !!c.shape,
        hasMapPath:   c.hasMapPath,
        wikipedia:  c.wikipedia,
        currency:   c.currency,
        population: c.population,
        area:       c.area,
      }))

      const paths:  Record<string, string> = {}
      const flags:  Record<string, string> = {}
      const shapes: Record<string, string> = {}
      for (const c of data.countries) {
        if (c.hasMapPath) paths[c.code] = c.path
        // data.json stores relative paths — prefix "/" to resolve from public/
        flags[c.code] = `/${c.flag}`
        if (c.shape) shapes[c.code] = `/${c.shape}`
      }
      countryPaths.value = paths
      flagPaths.value    = flags
      shapePaths.value   = shapes

      ready.value = true
    } catch (e) {
      error.value = String(e)
      console.error('[atlas] Failed to load data.json', e)
    }
  }

  return { countries, byCode, countryPaths, flagPaths, shapePaths, languageNames, viewBox, ready, error, load }
})
