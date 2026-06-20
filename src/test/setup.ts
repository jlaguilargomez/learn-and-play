import { afterEach, vi } from 'vitest'
import { config } from '@vue/test-utils'

class MockSpeechSynthesisUtterance {
  lang = ''
  rate = 1
  pitch = 1
  volume = 1
  voice: SpeechSynthesisVoice | null = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(public text: string) {}
}

Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  configurable: true,
  value: MockSpeechSynthesisUtterance,
})
Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
  configurable: true,
  value: MockSpeechSynthesisUtterance,
})

config.global.stubs = {
  transition: false,
}

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})
