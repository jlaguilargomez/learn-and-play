import { vi } from 'vitest'

export function makeVoice(
  name: string,
  lang: string,
  options: Partial<SpeechSynthesisVoice> = {},
): SpeechSynthesisVoice {
  return {
    default: false,
    lang,
    localService: false,
    name,
    voiceURI: name,
    ...options,
  }
}

export function installSpeechMock(voices: SpeechSynthesisVoice[] = []) {
  const listeners = new Map<string, EventListener>()
  const synthesis = {
    cancel: vi.fn(),
    getVoices: vi.fn(() => voices),
    speak: vi.fn((utterance: SpeechSynthesisUtterance) => {
      queueMicrotask(() => utterance.onend?.(new Event('end') as SpeechSynthesisEvent))
    }),
    addEventListener: vi.fn((event: string, listener: EventListener) => listeners.set(event, listener)),
    removeEventListener: vi.fn(),
    dispatchVoicesChanged() {
      listeners.get('voiceschanged')?.(new Event('voiceschanged'))
    },
    setVoices(nextVoices: SpeechSynthesisVoice[]) {
      voices = nextVoices
    },
  }

  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: synthesis,
  })

  return synthesis
}
