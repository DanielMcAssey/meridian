import { defineStore, skipHydrate } from 'pinia'
import { ref } from 'vue'
import type { Country, Subdivision } from '~/types/game'

interface AtlasData {
  viewBox: string
  countries: Array<
    Country & {
      flag:          string
      path:          string
      shape?:        string
      langs?:        string[]
      subdivisions?: Subdivision[]
    }
  >
}

export const useAtlasStore = defineStore('atlas', () => {
  // skipHydrate: all atlas data is loaded client-side via atlas.load() in onMounted.
  // Marking these refs skips Pinia's SSR serialisation entirely, which avoids a
  // crash in Pinia's shouldHydrate() when Vue Router or @pinia/nuxt intern objects
  // with null-prototype (Object.create(null)) appear in the devalue traversal.
  const countries    = skipHydrate(ref<Country[]>([]))
  const countryPaths = skipHydrate(ref<Record<string, string>>({}))
  const flagPaths    = skipHydrate(ref<Record<string, string>>({}))
  const shapePaths   = skipHydrate(ref<Record<string, string>>({}))
  const viewBox      = skipHydrate(ref(''))
  const ready        = skipHydrate(ref(false))
  const error        = skipHydrate(ref<string | null>(null))

  async function load() {
    if (ready.value) return
    try {
      const data = await $fetch<AtlasData>('/data.json')

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
        tier:    c.tier,
        langs:        c.langs ?? [],
        subdivisions: c.subdivisions ?? [],
      }))

      const paths:  Record<string, string> = {}
      const flags:  Record<string, string> = {}
      const shapes: Record<string, string> = {}
      for (const c of data.countries) {
        paths[c.code] = c.path
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

  return { countries, countryPaths, flagPaths, shapePaths, viewBox, ready, error, load }
})
