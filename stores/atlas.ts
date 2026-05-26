import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Country } from '~/types/game'

interface AtlasData {
  viewBox: string
  countries: Array<
    Country & {
      flag: string
      path: string
    }
  >
}

export const useAtlasStore = defineStore('atlas', () => {
  const countries = ref<Country[]>([])
  const countryPaths = ref<Record<string, string>>({})
  const flagPaths = ref<Record<string, string>>({})
  const viewBox = ref('')
  const ready = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    if (ready.value) return
    try {
      const data = await $fetch<AtlasData>('/data.json')

      viewBox.value = data.viewBox

      countries.value = data.countries.map((c) => ({
        code: c.code,
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        svgCx: c.svgCx,
        svgCy: c.svgCy,
        region: c.region,
        tier: c.tier,
      }))

      const paths: Record<string, string> = {}
      const flags: Record<string, string> = {}
      for (const c of data.countries) {
        paths[c.code] = c.path
        // data.json has "flags/xx.svg" — prefix "/" so it resolves from public/
        flags[c.code] = `/${c.flag}`
      }
      countryPaths.value = paths
      flagPaths.value = flags

      ready.value = true
    } catch (e) {
      error.value = String(e)
      console.error('[atlas] Failed to load data.json', e)
    }
  }

  return { countries, countryPaths, flagPaths, viewBox, ready, error, load }
})
