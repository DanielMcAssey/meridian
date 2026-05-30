<script setup lang="ts">
import type { Country } from '~/types/game'

useSeoMeta({
  title: 'The Atlas',
  description: 'Browse all countries in Meridian — regions, tiers, and game availability.',
})

const atlas  = useAtlasStore()
const route  = useRoute()
const router = useRouter()

// ── Helpers ───────────────────────────────────────────────────────────────────
const TIER_LABELS = ['', 'Flagship', 'Well-known', 'Familiar', 'Obscure'] as const

// ── Filters ───────────────────────────────────────────────────────────────────
const search       = ref('')
const regionFilter = ref('all')
const tierFilter   = ref(0)

const regionOptions = computed(() => [
  { id: 'all', label: 'All regions' },
  ...Array.from(new Set(atlas.countries.map((c) => c.region))).sort().map((r) => ({ id: r, label: r })),
])

const tierOptions = [
  { id: 0, label: 'All tiers' },
  ...([1, 2, 3, 4] as const).map((t) => ({ id: t, label: TIER_LABELS[t] })),
]

const filtered = computed(() => {
  let list = atlas.countries
  if (regionFilter.value !== 'all')
    list = list.filter((c) => c.region === regionFilter.value)
  if (tierFilter.value > 0)
    list = list.filter((c) => c.tier === tierFilter.value)
  const q = search.value.trim().toLowerCase()
  if (q)
    list = list.filter((c) =>
      c.name.toLowerCase().includes(q) || c.capital.toLowerCase().includes(q),
    )
  return [...list].sort((a, b) => a.name.localeCompare(b.name))
})

// ── Detail panel ──────────────────────────────────────────────────────────────
const selected = ref<Country | null>(null)

function openDetail(c: Country) {
  selected.value = c
  router.replace({ query: { c: c.code } })
}

function closeDetail() {
  selected.value = null
  router.replace({ query: {} })
}

// Sync modal state from URL — runs after atlas loads (watch) and on direct load (immediate)
watch(
  () => atlas.ready,
  (ready) => {
    if (!ready) return
    const code = route.query.c
    if (typeof code === 'string') {
      const match = atlas.countries.find((c) => c.code === code)
      if (match) selected.value = match
    }
  },
  { immediate: true },
)

// ── Permalink copy ────────────────────────────────────────────────────────────
const linkCopied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

function copyLink() {
  if (!selected.value) return
  const url = `${window.location.origin}/knowledge?c=${selected.value.code}`
  navigator.clipboard.writeText(url).then(() => {
    linkCopied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { linkCopied.value = false }, 2000)
  })
}

onUnmounted(() => { if (copyTimer) clearTimeout(copyTimer) })

function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closeDetail() }
onMounted(()   => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

// Uses CSS custom-property expressions so colours adapt to dark mode.
const TIER_DOT_STYLE = [
  '',
  'background: var(--color-ok)',
  'background: var(--accent)',
  'background: color-mix(in oklab, var(--color-bad) 40%, var(--accent) 60%)',
  'background: var(--color-bad)',
]
const TIER_BADGE_STYLE = [
  '',
  'background: var(--color-ok-soft);  color: var(--color-ok)',
  'background: var(--accent-soft);    color: var(--accent-deep)',
  'background: color-mix(in oklab, var(--color-bad-soft) 40%, var(--accent-soft) 60%); color: color-mix(in oklab, var(--color-bad) 40%, var(--accent-deep) 60%)',
  'background: var(--color-bad-soft); color: var(--color-bad)',
]

function langName(code: string): string {
  return atlas.languageNames[code] ?? code.toUpperCase()
}

function subdivisionCatPlural(cat: string): string {
  const words = cat.toLowerCase().split(' ')
  const last = words[words.length - 1]!
  if (/[^aeiou]y$/.test(last))      words[words.length - 1] = last.slice(0, -1) + 'ies'
  else if (/(sh|ch|x)$/.test(last)) words[words.length - 1] = last + 'es'
  else if (!/s$/.test(last))        words[words.length - 1] = last + 's'
  return words.join(' ')
}

const total = computed(() => atlas.countries.length)

// ── Tier legend tooltip ────────────────────────────────────────────────────────
const tierTooltipVisible   = ref(false)
const tierTooltipAnchor    = ref<HTMLElement | null>(null)
const tierTooltipStyle     = ref('')
const tierTooltipClickOpen = ref(false)  // true when opened by tap/click, not hover

function showTierTooltip() {
  if (!tierTooltipAnchor.value) return
  const r = tierTooltipAnchor.value.getBoundingClientRect()
  // Position above the icon, right-aligned to the anchor
  tierTooltipStyle.value = `top:${r.top - 8}px;left:${r.right}px;transform:translate(-100%,-100%)`
  tierTooltipVisible.value = true
}

function hideTierTooltip() {
  // Don't close on mouseleave if the user tapped to open it — they need a
  // second tap (or a tap elsewhere) to dismiss on touch devices.
  if (tierTooltipClickOpen.value) return
  tierTooltipVisible.value = false
}

function toggleTierTooltip() {
  if (tierTooltipClickOpen.value) {
    tierTooltipClickOpen.value = false
    tierTooltipVisible.value   = false
  } else {
    tierTooltipClickOpen.value = true
    showTierTooltip()
  }
}

// Close the click-opened tooltip when the user taps anywhere else.
function closeTierTooltip() {
  tierTooltipClickOpen.value = false
  tierTooltipVisible.value   = false
}

onMounted(()   => document.addEventListener('click', closeTierTooltip))
onUnmounted(() => document.removeEventListener('click', closeTierTooltip))
</script>

<template>
  <main class="screen">
    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <div class="mb-8 max-w-2xl">
      <span class="eyebrow block mb-3">Reference · Vol. I</span>
      <h1 class="font-serif font-normal text-[clamp(32px,5vw,52px)] tracking-[-0.02em] leading-[1.05] mb-3">
        The Knowledge
      </h1>
      <p class="text-ink-2 text-[15px] leading-relaxed">
        Browse all {{ total }} countries — flags, outlines, capitals, languages, and more.
        Click any entry to study the details.
      </p>
    </div>

    <!-- ── Filters ────────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 mb-6">
      <!-- Search -->
      <div class="relative max-w-sm">
        <svg
          class="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
          viewBox="0 0 16 16" width="15" height="15"
          fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
        >
          <circle cx="6.5" cy="6.5" r="4" />
          <path d="M11 11l3 3" />
        </svg>
        <input
          v-model="search"
          type="search"
          placeholder="Search by country or capital…"
          class="w-full pl-9 pr-4 py-2.5 bg-paper border border-rule rounded-xl
                 text-[14px] placeholder:text-ink-3 text-ink
                 focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <!-- Region + Tier pill groups -->
      <div class="flex flex-wrap gap-5 items-start">
        <FilterPillGroup
          label="Region"
          :options="regionOptions"
          :model-value="regionFilter"
          @update:model-value="regionFilter = $event as string"
        />
        <FilterPillGroup
          label="Tier"
          :options="tierOptions"
          :model-value="tierFilter"
          @update:model-value="tierFilter = $event as number"
        />
      </div>
    </div>

    <!-- Result count -->
    <p class="eyebrow mb-5">
      {{ filtered.length }} {{ filtered.length === 1 ? 'country' : 'countries' }}
      <span v-if="filtered.length < total" class="opacity-60">· filtered</span>
    </p>

    <!-- ── Country grid ────────────────────────────────────────────────────── -->
    <div
      v-if="filtered.length"
      class="grid gap-3"
      style="grid-template-columns: repeat(auto-fill, minmax(120px, 1fr))"
    >
      <button
        v-for="country in filtered"
        :key="country.code"
        class="group relative flex flex-col bg-paper border border-rule rounded-xl overflow-hidden
               text-left transition-[border-color,box-shadow,transform] duration-150
               hover:border-accent hover:shadow-md active:scale-[0.97] focus-visible:outline-none
               focus-visible:ring-2 focus-visible:ring-accent"
        style="animation: card-in 0.25s ease both"
        @click="openDetail(country)"
      >
        <!-- Flag -->
        <div class="relative w-full overflow-hidden bg-bg-tint" style="aspect-ratio:3/2">
          <FlagImage
            :code="country.code"
            :alt="country.name"
            class="w-full h-full object-cover"
          />
        </div>

        <!-- Name + region -->
        <div class="px-2.5 py-2 flex flex-col gap-0.5">
          <span class="text-[12.5px] font-medium leading-snug text-ink line-clamp-2">
            {{ country.name }}
          </span>
          <span class="font-mono text-[10px] tracking-[0.07em] uppercase text-ink-3">
            {{ country.region }}
          </span>
        </div>

        <!-- Tier dot -->
        <span
          class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-1 ring-paper/50"
          :style="TIER_DOT_STYLE[country.tier]"
          :title="TIER_LABELS[country.tier]"
        />
      </button>
    </div>

    <!-- Empty state -->
    <div v-else class="py-24 text-center">
      <p class="font-serif italic text-2xl text-ink-2 mb-1">No countries found</p>
      <p class="text-sm text-ink-3">Try adjusting your search or filters.</p>
    </div>
  </main>

  <!-- ── Detail modal ────────────────────────────────────────────────────────── -->
  <Teleport to="body">
    <!-- Backdrop fades on its own so the blur doesn't animate with the panel -->
    <Transition
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
    >
      <div
        v-if="selected"
        class="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
        aria-hidden="true"
        @click="closeDetail"
      />
    </Transition>

    <!-- Panel slides/fades independently of the backdrop -->
    <Transition
      enter-from-class="translate-y-6 opacity-0 sm:translate-y-0 sm:scale-[0.96]"
      leave-to-class="translate-y-6 opacity-0 sm:translate-y-0 sm:scale-[0.96]"
      enter-active-class="transition-[transform,opacity] duration-200 ease-out"
      leave-active-class="transition-[transform,opacity] duration-150 ease-in"
    >
      <div
        v-if="selected"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        :aria-label="selected.name"
      >
        <div
          class="pointer-events-auto relative w-full sm:max-w-2xl bg-paper rounded-t-2xl sm:rounded-2xl
                 border border-rule shadow-lg flex flex-col"
          style="max-height: 90dvh"
        >
            <!-- Sticky header -->
            <div class="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-rule shrink-0">
              <div class="min-w-0">
                <span class="eyebrow block mb-0.5">{{ selected.region }}</span>
                <h2 class="font-serif font-normal text-[clamp(22px,4vw,30px)] tracking-[-0.015em] leading-tight">
                  {{ selected.name }}
                </h2>
              </div>
              <div class="flex items-center gap-2 shrink-0 mt-0.5">
                <!-- Copy link -->
                <button
                  class="w-9 h-9 flex items-center justify-center rounded-full
                         border border-rule text-ink-3
                         hover:border-rule-2 hover:text-ink transition-colors"
                  :aria-label="linkCopied ? 'Link copied' : 'Copy permalink'"
                  :title="linkCopied ? 'Copied!' : 'Copy permalink'"
                  @click="copyLink"
                >
                  <Transition
                    enter-from-class="opacity-0 scale-75"
                    leave-to-class="opacity-0 scale-75"
                    enter-active-class="transition-[opacity,transform] duration-150"
                    leave-active-class="transition-[opacity,transform] duration-100"
                    mode="out-in"
                  >
                    <!-- Checkmark when copied -->
                    <svg v-if="linkCopied" key="check" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="text-ok">
                      <path d="M3 8l3.5 3.5L13 4" />
                    </svg>
                    <!-- Link icon -->
                    <svg v-else key="link" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L7 4" />
                      <path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5L9 12" />
                    </svg>
                  </Transition>
                </button>

                <!-- Close -->
                <button
                  class="w-9 h-9 flex items-center justify-center rounded-full
                         border border-rule text-ink-3
                         hover:border-rule-2 hover:text-ink transition-colors"
                  aria-label="Close"
                  @click="closeDetail"
                >
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                    <path d="M3 3l10 10M13 3L3 13" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Scrollable body -->
            <div class="overflow-y-auto p-5 flex flex-col sm:flex-row gap-6">

              <!-- Visuals -->
              <div class="flex sm:flex-col gap-3 sm:w-48 shrink-0">
                <!-- Flag -->
                <div
                  class="flex-1 sm:flex-none border border-rule rounded-xl overflow-hidden bg-bg-tint"
                  style="aspect-ratio:3/2"
                >
                  <FlagImage
                    :code="selected.code"
                    :alt="`Flag of ${selected.name}`"
                    class="w-full h-full object-cover"
                  />
                </div>

                <!-- Silhouette -->
                <div
                  v-if="selected.hasShape"
                  class="flex-1 sm:flex-none flex items-center justify-center
                            bg-bg-tint border border-rule rounded-xl p-4"
                  style="min-height: 7rem"
                >
                  <CountrySilhouette
                    :src="atlas.shapePaths[selected.code]"
                    :path="atlas.countryPaths[selected.code] ?? ''"
                    :alt="`Outline of ${selected.name}`"
                    class="max-w-full max-h-28 object-contain"
                    style="width:100%; height:7rem"
                  />
                </div>
              </div>

              <!-- Info -->
              <div class="flex flex-col gap-5 flex-1 min-w-0">

                <!-- Key facts grid -->
                <dl class="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <dt class="eyebrow mb-1">Capital</dt>
                    <dd class="text-[14px] font-medium text-ink">{{ selected.capital }}</dd>
                  </div>
                  <div>
                    <dt class="eyebrow mb-1">Continent</dt>
                    <dd class="text-[14px] font-medium text-ink">{{ selected.region }}</dd>
                  </div>
                  <div>
                    <dt class="eyebrow mb-1">ISO Code</dt>
                    <dd class="font-mono text-[13px] uppercase tracking-[0.1em] text-ink">{{ selected.code }}</dd>
                  </div>
                  <div>
                    <dt class="eyebrow mb-1 flex items-center gap-1">
                      Country Pool
                      <span
                        ref="tierTooltipAnchor"
                        class="inline-flex items-center cursor-pointer"
                        @mouseenter="showTierTooltip"
                        @mouseleave="hideTierTooltip"
                        @focusin="showTierTooltip"
                        @focusout="hideTierTooltip"
                        @click.stop="toggleTierTooltip"
                      >
                        <svg class="text-ink-3" viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-describedby="tier-legend-tooltip">
                          <circle cx="7" cy="7" r="6" />
                          <path d="M7 6.5v3" />
                          <circle cx="7" cy="4.25" r="0.6" fill="currentColor" stroke="none" />
                        </svg>
                      </span>
                    </dt>
                    <dd>
                      <span
                        class="inline-block text-[11px] font-mono tracking-[0.06em] px-2.5 py-0.5 rounded-full"
                        :style="TIER_BADGE_STYLE[selected.tier]"
                      >{{ TIER_LABELS[selected.tier] }}</span>
                    </dd>
                  </div>
                </dl>

                <!-- Languages -->
                <div v-if="selected.langs?.length">
                  <h3 class="eyebrow mb-2">Official Languages</h3>
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="lang in selected.langs"
                      :key="lang"
                      class="text-[12.5px] bg-bg-tint border border-rule rounded-full px-3 py-1 text-ink"
                    >{{ langName(lang) }}</span>
                  </div>
                </div>

                <!-- Subdivisions -->
                <div v-if="selected.subdivisions?.length">
                  <h3 class="eyebrow mb-2">
                    {{ subdivisionCatPlural(selected.subdivisions?.[0]?.cat ?? '') }}
                    <span class="opacity-50 ml-1">({{ selected.subdivisions.length }})</span>
                  </h3>
                  <p class="text-[13px] text-ink-2 leading-relaxed">
                    <template v-for="(sub, i) in selected.subdivisions" :key="sub.name">
                      {{ sub.name }}<span v-if="i < selected.subdivisions.length - 1" class="text-ink-3"> · </span>
                    </template>
                  </p>
                </div>

              </div>
            </div>
          </div>
      </div>
    </Transition>

    <!-- Tier legend tooltip — teleported so it escapes the modal's overflow-y-auto container -->
    <Transition
      enter-from-class="opacity-0 scale-95"
      leave-to-class="opacity-0 scale-95"
      enter-active-class="transition-[opacity,transform] duration-150 origin-bottom-right"
      leave-active-class="transition-[opacity,transform] duration-100 origin-bottom-right"
    >
      <div
        v-if="tierTooltipVisible"
        id="tier-legend-tooltip"
        role="tooltip"
        class="fixed z-[70] pointer-events-none w-52
               bg-ink text-bg rounded-xl px-3 py-2.5 shadow-xl
               text-[11px] font-mono tracking-[0.03em]"
        :style="tierTooltipStyle"
      >
        <span class="flex flex-col gap-1">
          <span class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background: var(--color-ok)" />
            <span><span class="opacity-50">1 ·</span> Flagship &mdash; major world nations</span>
          </span>
          <span class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background: var(--accent)" />
            <span><span class="opacity-50">2 ·</span> Well-known &mdash; widely recognised</span>
          </span>
          <span class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background: color-mix(in oklab, var(--color-bad) 40%, var(--accent) 60%)" />
            <span><span class="opacity-50">3 ·</span> Familiar &mdash; moderately known</span>
          </span>
          <span class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background: var(--color-bad)" />
            <span><span class="opacity-50">4 ·</span> Obscure &mdash; rare &amp; remote</span>
          </span>
        </span>
      </div>
    </Transition>
  </Teleport>
</template>
