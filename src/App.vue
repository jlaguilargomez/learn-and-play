<script setup lang="ts">
import { ref } from 'vue'
import ChoiceGame from './components/ChoiceGame.vue'
import { games } from './data/games'
import type { GameDefinition } from './types/game'

const activeGame = ref<GameDefinition | null>(null)
const soundEnabled = ref(true)

function openGame(game: GameDefinition) {
  activeGame.value = game
}
</script>

<template>
  <div class="app-shell">
    <ChoiceGame
      v-if="activeGame"
      :game="activeGame"
      :sound-enabled="soundEnabled"
      @back="activeGame = null"
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

      <section class="game-list" aria-label="Minijuegos">
        <button
          v-for="(game, index) in games"
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
