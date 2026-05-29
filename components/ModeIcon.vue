<script setup lang="ts">
import { markRaw } from 'vue'
import FlagSvg     from '~/assets/icons/modes/flag.svg?component'
import MapSvg      from '~/assets/icons/modes/map.svg?component'
import CartSvg     from '~/assets/icons/modes/cart.svg?component'
import CompassSvg  from '~/assets/icons/modes/compass.svg?component'
import CapitalSvg  from '~/assets/icons/modes/capital.svg?component'
import RegionSvg   from '~/assets/icons/modes/region.svg?component'
import ProvinceSvg from '~/assets/icons/modes/province.svg?component'
import LanguageSvg from '~/assets/icons/modes/language.svg?component'
import ShapeSvg    from '~/assets/icons/modes/shape.svg?component'

defineProps<{ kind: 'flag' | 'map' | 'cart' | 'compass' | 'shape' | 'capital' | 'region' | 'language' | 'province' }>()

const icons = {
  flag:     markRaw(FlagSvg),
  map:      markRaw(MapSvg),
  cart:     markRaw(CartSvg),
  compass:  markRaw(CompassSvg),
  capital:  markRaw(CapitalSvg),
  region:   markRaw(RegionSvg),
  province: markRaw(ProvinceSvg),
  language: markRaw(LanguageSvg),
  shape:    markRaw(ShapeSvg),
} as const
</script>

<template>
  <component :is="icons[kind]" class="mode-icon" aria-hidden="true" />
</template>
