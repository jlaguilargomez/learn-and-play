<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import type { GameDefinition, GameOption } from '../types/game'
import GameVisual from './GameVisual.vue'

const props = defineProps<{
  game: GameDefinition
  soundEnabled: boolean
}>()

const emit = defineEmits<{
  back: []
}>()

const target = ref<GameOption>(props.game.options[0])
const choices = ref<GameOption[]>([])
const answerState = ref<'idle' | 'right' | 'try-again'>('idle')
const selectedId = ref<string | null>(null)
const roundsCompleted = ref(0)
const celebration = ref(0)

const prompt = computed(() => `${props.game.instruction} ${target.value.label}`)
const feedback = computed(() => {
  if (answerState.value === 'right') return '¡Muy bien!'
  if (answerState.value === 'try-again') return 'Prueba otra vez'
  return prompt.value
})

function shuffled<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

function pickRound(avoidId?: string) {
  const pool = props.game.options.filter((option) => option.id !== avoidId)
  target.value = pool[Math.floor(Math.random() * pool.length)] ?? props.game.options[0]
  choices.value = shuffled([
    target.value,
    ...shuffled(props.game.options.filter((option) => option.id !== target.value.id)).slice(0, 2),
  ])
  answerState.value = 'idle'
  selectedId.value = null

  void nextTick(() => speak(prompt.value))
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

function answer(option: GameOption) {
  if (answerState.value === 'right') return
  selectedId.value = option.id

  if (option.id !== target.value.id) {
    answerState.value = 'try-again'
    speak('Prueba otra vez')
    window.setTimeout(() => {
      if (answerState.value === 'try-again') {
        answerState.value = 'idle'
        selectedId.value = null
      }
    }, 850)
    return
  }

  answerState.value = 'right'
  roundsCompleted.value += 1
  celebration.value += 1
  speak(`¡Muy bien! ${target.value.label}`)
  window.setTimeout(() => pickRound(target.value.id), 1200)
}

onMounted(() => pickRound())
</script>

<template>
  <main class="game-screen" :style="{ '--game-accent': game.accent }">
    <header class="game-header">
      <button class="round-button back-button" type="button" aria-label="Volver al menú" @click="emit('back')">
        <span aria-hidden="true">←</span>
      </button>
      <div>
        <span class="eyebrow">JUGAMOS CON</span>
        <h1>{{ game.title }}</h1>
      </div>
      <div class="progress-pips" aria-label="Aciertos">
        <i v-for="pip in 3" :key="pip" :class="{ filled: roundsCompleted % 3 >= pip || roundsCompleted > 0 && roundsCompleted % 3 === 0 }" />
      </div>
    </header>

    <section class="game-board" :class="`state-${answerState}`">
      <button class="prompt-card" type="button" aria-label="Repetir instrucción" @click="speak(prompt)">
        <span class="speaker" aria-hidden="true">♪</span>
        <strong>{{ feedback }}</strong>
      </button>

      <div class="choices">
        <button
          v-for="option in choices"
          :key="option.id"
          class="choice-card"
          :class="{
            selected: selectedId === option.id,
            correct: answerState === 'right' && option.id === target.id,
            wrong: answerState === 'try-again' && selectedId === option.id,
          }"
          type="button"
          :aria-label="option.label"
          @click="answer(option)"
        >
          <GameVisual :option="option" :kind="game.kind" />
        </button>
      </div>

      <p class="grownup-note">Nombra cada opción en voz alta y deja que tu peque elija.</p>

      <div :key="celebration" class="confetti" aria-hidden="true">
        <i v-for="piece in 10" :key="piece" :style="{ '--i': piece }" />
      </div>
    </section>
  </main>
</template>

<style scoped>
.game-screen {
  width: min(100%, 64rem);
  min-height: min(100dvh, 54rem);
  margin: auto;
  padding: clamp(1rem, 3vw, 2rem);
}

.game-header {
  display: grid;
  grid-template-columns: 4.5rem 1fr 5rem;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.2rem;
}

.game-header h1 {
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

.progress-pips {
  display: flex;
  justify-content: flex-end;
  gap: 0.32rem;
}

.progress-pips i {
  width: 0.9rem;
  height: 0.9rem;
  border: 0.15rem solid #38342e;
  border-radius: 50%;
  background: #fff9e8;
}

.progress-pips i.filled {
  background: var(--game-accent);
}

.game-board {
  position: relative;
  overflow: hidden;
  min-height: 39rem;
  padding: clamp(1rem, 4vw, 2.4rem);
  border: 0.22rem solid #38342e;
  border-radius: 2rem;
  background: #b9d9ce;
  box-shadow: inset 0 0 0 0.7rem rgba(255, 255, 255, 0.35), 0 0.55rem 0 #38342e;
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

.choices {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(0.7rem, 2vw, 1.4rem);
  max-width: 54rem;
  margin: 0 auto;
}

.choice-card {
  min-width: 0;
  min-height: 14rem;
  padding: 1rem;
  border: 0.2rem solid #38342e;
  border-radius: 1.4rem;
  background: #fff9e8;
  box-shadow: 0 0.5rem 0 #38342e;
  transition: rotate 150ms ease, translate 150ms ease, background 150ms ease;
  touch-action: manipulation;
}

.choice-card:nth-child(2) {
  rotate: -1deg;
}

.choice-card:active {
  translate: 0 0.25rem;
  box-shadow: 0 0.25rem 0 #38342e;
}

.choice-card.correct {
  background: #eaf7c9;
  animation: happy-bounce 520ms ease;
}

.choice-card.wrong {
  background: #f8d7d1;
  animation: tiny-shake 300ms ease;
}

.grownup-note {
  margin: 2.4rem auto 0;
  color: #59544c;
  font-size: 0.9rem;
  text-align: center;
}

.confetti {
  position: absolute;
  inset: 50% 50%;
  pointer-events: none;
}

.state-right .confetti i {
  --angle: calc(var(--i) * 36deg);
  position: absolute;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 0.15rem;
  background: hsl(calc(var(--i) * 36) 72% 55%);
  animation: pop 700ms ease-out both;
  transform: rotate(var(--angle)) translateY(-2rem);
}

@keyframes happy-bounce {
  35% { transform: translateY(-0.8rem) rotate(2deg); }
  70% { transform: translateY(0.15rem) rotate(-1deg); }
}

@keyframes tiny-shake {
  25% { transform: translateX(-0.35rem); }
  75% { transform: translateX(0.35rem); }
}

@keyframes pop {
  to {
    opacity: 0;
    transform: rotate(var(--angle)) translateY(-13rem);
  }
}

@media (max-width: 680px) {
  .game-screen {
    padding: 0.8rem;
  }

  .game-header {
    grid-template-columns: 3.4rem 1fr 3.5rem;
    gap: 0.65rem;
  }

  .round-button {
    width: 3.2rem;
    height: 3.2rem;
  }

  .game-board {
    min-height: calc(100dvh - 6rem);
    padding: 1.3rem 0.8rem;
    border-radius: 1.5rem;
  }

  .prompt-card {
    margin-bottom: 1.5rem;
  }

  .choices {
    grid-template-columns: 1fr;
    max-width: 21rem;
  }

  .choice-card {
    min-height: 8.1rem;
  }

  .grownup-note {
    margin-top: 1.8rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .choice-card,
  .confetti i {
    animation: none !important;
    transition: none;
  }
}
</style>
