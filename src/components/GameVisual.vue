<script setup lang="ts">
import type { GameKind, GameOption } from '../types/game'

defineProps<{
  option: GameOption
  kind: GameKind
}>()
</script>

<template>
  <div class="visual" :class="`visual--${kind}`" :aria-label="option.label">
    <div
      v-if="kind === 'shape'"
      class="shape"
      :class="`shape--${option.shape}`"
      :style="{ '--shape-color': option.color }"
    />

    <div
      v-else-if="kind === 'color'"
      class="color-swatch"
      :style="{ backgroundColor: option.color }"
    />

    <div v-else-if="kind === 'number'" class="number-group" :style="{ color: option.color }">
      <span class="number">{{ option.number }}</span>
      <div class="number-dots" aria-hidden="true">
        <i v-for="dot in option.number" :key="dot" />
      </div>
    </div>

    <div v-else class="animal" aria-hidden="true">{{ option.animal }}</div>
  </div>
</template>

<style scoped>
.visual {
  display: grid;
  min-height: 6.5rem;
  place-items: center;
  pointer-events: none;
}

.shape {
  --shape-color: #ef5d60;
  width: 5.4rem;
  height: 5.4rem;
  background: var(--shape-color);
  filter: drop-shadow(0 0.35rem 0 rgba(55, 48, 37, 0.14));
}

.shape--circle {
  border-radius: 50%;
}

.shape--square {
  border-radius: 0.45rem;
}

.shape--triangle {
  width: 0;
  height: 0;
  background: transparent;
  border-right: 3.3rem solid transparent;
  border-bottom: 5.8rem solid var(--shape-color);
  border-left: 3.3rem solid transparent;
}

.shape--star {
  clip-path: polygon(50% 0%, 61% 34%, 98% 35%, 68% 56%, 79% 92%, 50% 70%, 21% 92%, 32% 56%, 2% 35%, 39% 34%);
}

.color-swatch {
  width: 5.8rem;
  height: 5.8rem;
  border: 0.45rem solid white;
  border-radius: 50%;
  box-shadow: 0 0 0 0.18rem #38342e, 0 0.4rem 0 rgba(55, 48, 37, 0.14);
}

.number-group {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.number {
  font-family: var(--font-display);
  font-size: 5rem;
  line-height: 1;
  text-shadow: 0 0.3rem 0 rgba(55, 48, 37, 0.14);
}

.number-dots {
  display: grid;
  grid-template-columns: repeat(2, 0.9rem);
  gap: 0.35rem;
}

.number-dots i {
  width: 0.9rem;
  height: 0.9rem;
  background: currentColor;
  border-radius: 50%;
}

.animal {
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
  font-size: 6.4rem;
  line-height: 1;
  filter: drop-shadow(0 0.4rem 0 rgba(55, 48, 37, 0.16));
  transform: translateY(-0.1rem);
}

@media (max-width: 420px) {
  .visual {
    min-height: 5rem;
  }

  .shape {
    width: 4.4rem;
    height: 4.4rem;
  }

  .shape--triangle {
    width: 0;
    height: 0;
    border-right-width: 2.7rem;
    border-bottom-width: 4.8rem;
    border-left-width: 2.7rem;
  }

  .color-swatch {
    width: 4.7rem;
    height: 4.7rem;
  }

  .number {
    font-size: 4rem;
  }

  .animal {
    font-size: 5rem;
  }
}
</style>
