<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { GameOption, PairGameDefinition } from '../types/game'
import GameVisual from './GameVisual.vue'

interface PairCard {
  cardId: string
  pairId: string
  option: GameOption
}

const props = defineProps<{
  game: PairGameDefinition
  soundEnabled: boolean
}>()

const emit = defineEmits<{
  back: []
}>()

const cards = ref<PairCard[]>([])
const selectedCards = ref<string[]>([])
const matchedPairs = ref<string[]>([])
const state = ref<'idle' | 'match' | 'try-again' | 'complete'>('idle')
const isChecking = ref(false)

const feedback = computed(() => {
  if (state.value === 'match') return '¡Son iguales!'
  if (state.value === 'try-again') return 'Busca otra pareja'
  if (state.value === 'complete') return '¡Todas las parejas!'
  if (selectedCards.value.length === 1) return 'Ahora busca su pareja'
  return 'Busca dos iguales'
})

function shuffled<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

function speak(text: string) {
  if (!props.soundEnabled || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'es-ES'
  utterance.rate = 0.85
  utterance.pitch = 1.15
  window.speechSynthesis.speak(utterance)
}

function startRound() {
  const selectedOptions = shuffled(props.game.options).slice(0, props.game.pairCount)
  cards.value = shuffled(
    selectedOptions.flatMap((option) => [
      { cardId: `${option.id}-a`, pairId: option.id, option },
      { cardId: `${option.id}-b`, pairId: option.id, option },
    ]),
  )
  selectedCards.value = []
  matchedPairs.value = []
  state.value = 'idle'
  isChecking.value = false
  void nextTick(() => speak('Busca dos iguales'))
}

function isSelected(card: PairCard) {
  return selectedCards.value.includes(card.cardId)
}

function isMatched(card: PairCard) {
  return matchedPairs.value.includes(card.pairId)
}

function selectCard(card: PairCard) {
  if (isChecking.value || isMatched(card) || isSelected(card)) return

  selectedCards.value.push(card.cardId)
  if (selectedCards.value.length === 1) {
    state.value = 'idle'
    speak('Busca su pareja')
    return
  }

  isChecking.value = true
  const [firstId, secondId] = selectedCards.value
  const first = cards.value.find((candidate) => candidate.cardId === firstId)
  const second = cards.value.find((candidate) => candidate.cardId === secondId)

  if (first && second && first.pairId === second.pairId) {
    matchedPairs.value.push(first.pairId)
    state.value = matchedPairs.value.length === props.game.pairCount ? 'complete' : 'match'
    speak(state.value === 'complete' ? '¡Muy bien! Todas las parejas' : '¡Son iguales!')

    window.setTimeout(() => {
      selectedCards.value = []
      isChecking.value = false
      if (state.value === 'complete') {
        window.setTimeout(startRound, 900)
      } else {
        state.value = 'idle'
      }
    }, 700)
    return
  }

  state.value = 'try-again'
  speak('Busca otra pareja')
  window.setTimeout(() => {
    selectedCards.value = []
    state.value = 'idle'
    isChecking.value = false
  }, 850)
}

onMounted(startRound)
onBeforeUnmount(() => window.speechSynthesis?.cancel())
</script>

<template>
  <main class="pair-screen" :style="{ '--game-accent': game.accent }">
    <header class="pair-header">
      <button class="round-button" type="button" aria-label="Volver al menú" @click="emit('back')">
        <span aria-hidden="true">←</span>
      </button>
      <div>
        <span class="eyebrow">BUSCAMOS</span>
        <h1>{{ game.title }}</h1>
      </div>
      <div class="pair-progress" :aria-label="`${matchedPairs.length} parejas encontradas`">
        <i v-for="pip in game.pairCount" :key="pip" :class="{ filled: matchedPairs.length >= pip }">♥</i>
      </div>
    </header>

    <section class="pair-board" :class="`state-${state}`">
      <button class="prompt-card" type="button" aria-label="Repetir instrucción" @click="speak(feedback)">
        <span class="speaker" aria-hidden="true">♪</span>
        <strong>{{ feedback }}</strong>
      </button>

      <div class="pair-grid">
        <button
          v-for="card in cards"
          :key="card.cardId"
          class="pair-card"
          :class="{
            selected: isSelected(card),
            matched: isMatched(card),
            wrong: state === 'try-again' && isSelected(card),
          }"
          type="button"
          :aria-label="`${card.option.label}${isMatched(card) ? ', pareja encontrada' : ''}`"
          :disabled="isMatched(card)"
          @click="selectCard(card)"
        >
          <GameVisual :option="card.option" :kind="game.kind" />
          <span v-if="isMatched(card)" class="match-mark" aria-hidden="true">✓</span>
        </button>
      </div>

      <p class="grownup-note">Toca una tarjeta y después otra que sea igual.</p>
    </section>
  </main>
</template>

<style scoped>
.pair-screen {
  width: min(100%, 64rem);
  min-height: min(100dvh, 54rem);
  margin: auto;
  padding: clamp(1rem, 3vw, 2rem);
}

.pair-header {
  display: grid;
  grid-template-columns: 4.5rem 1fr 8rem;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.2rem;
}

.pair-header h1 {
  margin: 0.1rem 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 5vw, 3rem);
  line-height: 1;
}

.eyebrow {
  color: #777063;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.round-button {
  display: grid;
  width: 4rem;
  height: 4rem;
  place-items: center;
  border: 0.18rem solid #38342e;
  border-radius: 50%;
  background: #fff9e8;
  box-shadow: 0 0.3rem 0 #38342e;
  color: #38342e;
  font-size: 2rem;
}

.round-button:active {
  translate: 0 0.2rem;
  box-shadow: 0 0.1rem 0 #38342e;
}

.pair-progress {
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
}

.pair-progress i {
  color: #fff9e8;
  font-size: 1.4rem;
  font-style: normal;
  -webkit-text-stroke: 0.1rem #38342e;
}

.pair-progress i.filled {
  color: var(--game-accent);
}

.pair-board {
  min-height: 39rem;
  padding: clamp(1rem, 4vw, 2.4rem);
  border: 0.22rem solid #38342e;
  border-radius: 2rem;
  background: #cdbed9;
  box-shadow: inset 0 0 0 0.7rem rgba(255, 255, 255, 0.32), 0 0.55rem 0 #38342e;
}

.prompt-card {
  display: flex;
  width: fit-content;
  min-height: 4.4rem;
  margin: 0 auto 2rem;
  padding: 0.8rem 1.4rem;
  align-items: center;
  gap: 0.8rem;
  border: 0.18rem solid #38342e;
  border-radius: 999px;
  background: #fff9e8;
  box-shadow: 0 0.25rem 0 #38342e;
  color: #38342e;
  font-size: clamp(1.1rem, 4vw, 1.5rem);
}

.speaker {
  display: grid;
  width: 2.2rem;
  height: 2.2rem;
  place-items: center;
  border-radius: 50%;
  background: var(--game-accent);
  color: white;
}

.pair-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(0.75rem, 2vw, 1.25rem);
  max-width: 48rem;
  margin: auto;
}

.pair-card {
  position: relative;
  min-height: 11rem;
  padding: 1rem;
  border: 0.2rem solid #38342e;
  border-radius: 1.4rem;
  background: #fff9e8;
  box-shadow: 0 0.45rem 0 #38342e;
  transition: translate 140ms ease, background 140ms ease, opacity 140ms ease;
}

.pair-card:active,
.pair-card.selected {
  translate: 0 0.2rem;
  background: #fff0b8;
  box-shadow: 0 0.2rem 0 #38342e;
}

.pair-card.matched {
  background: #eaf7c9;
  opacity: 0.72;
}

.pair-card.wrong {
  background: #f8d7d1;
  animation: tiny-shake 300ms ease;
}

.match-mark {
  position: absolute;
  top: 0.55rem;
  right: 0.65rem;
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border: 0.13rem solid #38342e;
  border-radius: 50%;
  background: #70a84f;
  color: white;
  font-weight: 900;
}

.grownup-note {
  margin: 2rem auto 0;
  color: #59544c;
  font-size: 0.9rem;
  text-align: center;
}

@keyframes tiny-shake {
  25% { transform: translateX(-0.35rem); }
  75% { transform: translateX(0.35rem); }
}

@media (max-width: 680px) {
  .pair-screen {
    padding: 0.8rem;
  }

  .pair-header {
    grid-template-columns: 3.4rem 1fr 5.6rem;
    gap: 0.65rem;
  }

  .round-button {
    width: 3.2rem;
    height: 3.2rem;
  }

  .pair-board {
    min-height: calc(100dvh - 6rem);
    padding: 1.3rem 0.8rem;
    border-radius: 1.5rem;
  }

  .prompt-card {
    margin-bottom: 1.4rem;
  }

  .pair-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-width: 25rem;
  }

  .pair-card {
    min-height: 8.5rem;
  }

  .pair-progress i {
    font-size: 1.1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pair-card {
    animation: none !important;
    transition: none;
  }
}
</style>
