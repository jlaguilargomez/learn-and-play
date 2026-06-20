<script setup lang="ts">
import { computed, ref } from 'vue'
import ChoiceGame from './components/ChoiceGame.vue'
import PairGame from './components/PairGame.vue'
import { choiceGames, gameCategories, pairGames } from './data/games'
import type { GameCategoryId, GameDefinition, PairGameDefinition } from './types/game'

const activeChoiceGame = ref<GameDefinition | null>(null)
const activePairGame = ref<PairGameDefinition | null>(null)
const activeCategory = ref<GameCategoryId>('choose')
const soundEnabled = ref(true)

const visibleGames = computed(() => (activeCategory.value === 'choose' ? choiceGames : pairGames))

function openGame(game: GameDefinition | PairGameDefinition) {
  if (activeCategory.value === 'choose') {
    activeChoiceGame.value = game as GameDefinition
  } else {
    activePairGame.value = game as PairGameDefinition
  }
}

function closeGame() {
  activeChoiceGame.value = null
  activePairGame.value = null
}
</script>

<template>
  <div class="app-shell">
    <ChoiceGame
      v-if="activeChoiceGame"
      :game="activeChoiceGame"
      :sound-enabled="soundEnabled"
      @back="closeGame"
    />

    <PairGame
      v-else-if="activePairGame"
      :game="activePairGame"
      :sound-enabled="soundEnabled"
      @back="closeGame"
    />

    <main v-else class="home-screen">
      <header class="topbar">
        <div class="brand" aria-label="Peque Aprende">
          <span class="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div>
            <span>PEQUE</span>
            <strong>APRENDE</strong>
          </div>
        </div>

        <button
          class="sound-button"
          type="button"
          :aria-label="soundEnabled ? 'Desactivar voz' : 'Activar voz'"
          :aria-pressed="soundEnabled"
          @click="soundEnabled = !soundEnabled"
        >
          <span aria-hidden="true">{{ soundEnabled ? '♪' : '×' }}</span>
          {{ soundEnabled ? 'VOZ' : 'SIN VOZ' }}
        </button>
      </header>

      <section class="welcome">
        <div class="welcome-copy">
          <span class="kicker">HOLA, PEQUE</span>
          <h1>¿A qué jugamos?</h1>
          <p>Elige una tarjeta grande. Jugamos despacito, una cosa cada vez.</p>
        </div>
        <div class="retro-friend" aria-hidden="true">
          <span class="antenna" />
          <div class="face">
            <i />
            <i />
            <b>⌣</b>
          </div>
        </div>
      </section>

      <nav class="category-list" aria-label="Categorías de juegos">
        <button
          v-for="category in gameCategories"
          :key="category.id"
          class="category-card"
          :class="{ active: activeCategory === category.id }"
          type="button"
          :style="{ '--category-accent': category.accent }"
          :aria-pressed="activeCategory === category.id"
          @click="activeCategory = category.id"
        >
          <span class="category-icon" aria-hidden="true">{{ category.icon }}</span>
          <span>
            <strong>{{ category.title }}</strong>
            <small>{{ category.description }}</small>
          </span>
        </button>
      </nav>

      <section class="game-list" aria-label="Minijuegos">
        <button
          v-for="(game, index) in visibleGames"
          :key="game.id"
          class="game-card"
          type="button"
          :style="{ '--accent': game.accent, '--tilt': `${index % 2 ? 1 : -1}deg` }"
          @click="openGame(game)"
        >
          <span class="game-number">0{{ index + 1 }}</span>
          <span class="game-icon" aria-hidden="true">{{ game.icon }}</span>
          <span class="game-name">{{ game.shortTitle }}</span>
          <span class="play-icon" aria-hidden="true">▶</span>
        </button>
      </section>

      <footer>
        <span>●</span>
        Juega junto a una persona mayor
        <span>●</span>
      </footer>
    </main>
  </div>
</template>
