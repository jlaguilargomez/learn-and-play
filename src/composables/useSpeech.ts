import { onBeforeUnmount, watch } from 'vue'

type VoiceProvider = 'apple' | 'google' | 'microsoft' | 'other'

interface RankedVoice {
  provider: VoiceProvider
  score: number
  voice: SpeechSynthesisVoice
}

const WARM_FEMALE_VOICE_NAMES = [
  'monica',
  'mónica',
  'paulina',
  'marisol',
  'helena',
  'elvira',
  'sabina',
  'sofia',
  'sofía',
  'lucia',
  'lucía',
  'laura',
  'isabel',
  'google español',
  'google español de españa',
  'microsoft elvira',
  'microsoft helena',
  'microsoft sabina',
]

let cachedVoices: SpeechSynthesisVoice[] = []
let voicesInitialized = false
let voicesListenerAttached = false
let activeResolve: (() => void) | null = null
let activeUtterance: SpeechSynthesisUtterance | null = null

function normalizeLocale(locale: string) {
  return locale.toLowerCase().replace('_', '-')
}

function voiceProvider(name: string): VoiceProvider {
  const normalizedName = name.toLowerCase()
  if (normalizedName.includes('apple')) return 'apple'
  if (normalizedName.includes('google')) return 'google'
  if (normalizedName.includes('microsoft')) return 'microsoft'
  return 'other'
}

function isWarmFemaleVoice(name: string) {
  const normalizedName = name.toLowerCase()
  return WARM_FEMALE_VOICE_NAMES.some((candidate) => normalizedName.includes(candidate))
}

export function rankSpanishVoice(voice: SpeechSynthesisVoice): RankedVoice {
  const locale = normalizeLocale(voice.lang)
  const exactSpain = locale === 'es-es'
  const spanish = locale === 'es' || locale.startsWith('es-')
  const provider = voiceProvider(voice.name)

  let score = 0
  if (exactSpain) score += 1000
  else if (spanish) score += 300

  if (voice.localService) score += 120
  if (isWarmFemaleVoice(voice.name)) score += 80
  if (provider !== 'other') score += 20
  if (voice.default) score += 5

  return { provider, score, voice }
}

export function selectPreferredSpanishVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  const spanishVoices = voices.filter((voice) => {
    const locale = normalizeLocale(voice.lang)
    return locale === 'es' || locale.startsWith('es-')
  })

  return spanishVoices
    .map(rankSpanishVoice)
    .sort((left, right) => right.score - left.score || left.voice.name.localeCompare(right.voice.name))[0]
    ?.voice
}

export function normalizeSpeechText(text: string) {
  const normalized = text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')

  if (!normalized) return ''
  if (/[.!?…]$/.test(normalized)) return normalized
  return `${normalized}.`
}

function refreshVoices() {
  if (!('speechSynthesis' in window)) return
  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) {
    cachedVoices = voices
    voicesInitialized = true
  }
}

function ensureVoicesLoaded() {
  if (!('speechSynthesis' in window)) return
  refreshVoices()

  if (!voicesListenerAttached) {
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)
    voicesListenerAttached = true
  }
}

function resolveActiveSpeech() {
  const resolve = activeResolve
  activeResolve = null
  activeUtterance = null
  resolve?.()
}

export function stopSpeech() {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  resolveActiveSpeech()
}

export function useSpeech(isEnabled: () => boolean) {
  ensureVoicesLoaded()

  watch(isEnabled, (enabled) => {
    if (!enabled) stopSpeech()
  })

  onBeforeUnmount(stopSpeech)

  function speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!isEnabled() || !('speechSynthesis' in window)) {
        resolve()
        return
      }

      stopSpeech()
      if (!voicesInitialized) refreshVoices()

      const normalizedText = normalizeSpeechText(text)
      if (!normalizedText) {
        resolve()
        return
      }

      const utterance = new SpeechSynthesisUtterance(normalizedText)
      const voice = selectPreferredSpanishVoice(cachedVoices)
      if (voice) utterance.voice = voice
      utterance.lang = voice?.lang ?? 'es-ES'
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1

      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        if (activeUtterance === utterance) resolveActiveSpeech()
        else resolve()
      }

      activeResolve = resolve
      activeUtterance = utterance
      utterance.onend = finish
      utterance.onerror = finish
      window.speechSynthesis.speak(utterance)
    })
  }

  return {
    speak,
    stop: stopSpeech,
  }
}
