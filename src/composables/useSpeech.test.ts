import { defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installSpeechMock, makeVoice } from '../test/browserMocks'

async function loadSpeechModule() {
  vi.resetModules()
  return import('./useSpeech')
}

describe('voice helpers', () => {
  it('normaliza espacios y puntuación', async () => {
    const { normalizeSpeechText } = await loadSpeechModule()
    expect(normalizeSpeechText('  Hola   peque  ')).toBe('Hola peque.')
    expect(normalizeSpeechText('¿Cuál está frío? ')).toBe('¿Cuál está frío?')
    expect(normalizeSpeechText('Hola , peque !')).toBe('Hola, peque!')
    expect(normalizeSpeechText('   ')).toBe('')
  })

  it('prioriza una voz local de España y usa nombre como desempate', async () => {
    const { rankSpanishVoice, selectPreferredSpanishVoice } = await loadSpeechModule()
    const mexican = makeVoice('Paulina', 'es-MX', { localService: true })
    const spanish = makeVoice('Mónica', 'es_ES', { localService: true })
    const remote = makeVoice('Google español de España', 'es-ES')

    expect(rankSpanishVoice(spanish).score).toBeGreaterThan(rankSpanishVoice(mexican).score)
    expect(rankSpanishVoice(remote).provider).toBe('google')
    expect(selectPreferredSpanishVoice([mexican, remote, spanish])).toBe(spanish)
    expect(selectPreferredSpanishVoice([makeVoice('English', 'en-US')])).toBeUndefined()
  })

  it('puntúa proveedores conocidos, voz cálida y voz por defecto', async () => {
    const { rankSpanishVoice } = await loadSpeechModule()
    const apple = rankSpanishVoice(makeVoice('Apple Laura', 'es-ES', { default: true }))
    const microsoft = rankSpanishVoice(makeVoice('Microsoft Elvira', 'es-ES'))
    const other = rankSpanishVoice(makeVoice('Voz genérica', 'es-ES'))

    expect(apple.provider).toBe('apple')
    expect(microsoft.provider).toBe('microsoft')
    expect(apple.score).toBeGreaterThan(other.score)
    expect(microsoft.score).toBeGreaterThan(other.score)
  })
})

describe('useSpeech', () => {
  beforeEach(() => {
    installSpeechMock()
  })

  async function mountSpeech(enabled = true) {
    const enabledRef = ref(enabled)
    const api: { speak?: (text: string) => Promise<void>; stop?: () => void } = {}
    const { useSpeech } = await loadSpeechModule()
    const wrapper = mount(defineComponent({
      setup() {
        Object.assign(api, useSpeech(() => enabledRef.value))
        return () => null
      },
    }))
    return { api, enabledRef, wrapper }
  }

  it('configura voz, idioma y parámetros naturales', async () => {
    const voice = makeVoice('Mónica', 'es-ES', { localService: true })
    const synthesis = installSpeechMock([voice])
    const { api } = await mountSpeech()

    await api.speak?.('Hola peque')
    const utterance = synthesis.speak.mock.calls[0][0]
    expect(utterance.text).toBe('Hola peque.')
    expect(utterance.voice).toBe(voice)
    expect(utterance.lang).toBe('es-ES')
    expect(utterance.rate).toBe(0.9)
    expect(utterance.pitch).toBe(1)
    expect(utterance.volume).toBe(1)
  })

  it('carga voces que aparecen después mediante voiceschanged', async () => {
    const synthesis = installSpeechMock()
    const { api } = await mountSpeech()
    const voice = makeVoice('Microsoft Helena', 'es-ES', { localService: true })

    synthesis.setVoices([voice])
    synthesis.dispatchVoicesChanged()
    await api.speak?.('Prueba')

    expect(synthesis.speak.mock.calls[0][0].voice).toBe(voice)
  })

  it('usa fallback es-ES cuando no hay voz española', async () => {
    const synthesis = installSpeechMock([makeVoice('English', 'en-US')])
    const { api } = await mountSpeech()
    await api.speak?.('Hola')
    const utterance = synthesis.speak.mock.calls[0][0]
    expect(utterance.voice).toBeNull()
    expect(utterance.lang).toBe('es-ES')
  })

  it('resuelve sin hablar si está desactivado, no hay API o el texto está vacío', async () => {
    const synthesis = installSpeechMock()
    const disabled = await mountSpeech(false)
    await expect(disabled.api.speak?.('Hola')).resolves.toBeUndefined()
    expect(synthesis.speak).not.toHaveBeenCalled()

    const enabled = await mountSpeech()
    await expect(enabled.api.speak?.(' ')).resolves.toBeUndefined()
    expect(synthesis.speak).not.toHaveBeenCalled()

    Reflect.deleteProperty(window, 'speechSynthesis')
    const absent = await mountSpeech()
    await expect(absent.api.speak?.('Hola')).resolves.toBeUndefined()
  })

  it('cancela la locución anterior y resuelve ambas promesas', async () => {
    const synthesis = installSpeechMock()
    synthesis.speak.mockImplementation(() => undefined)
    const { api } = await mountSpeech()

    const first = api.speak!('Primera')
    const second = api.speak!('Segunda')
    await expect(first).resolves.toBeUndefined()
    api.stop?.()
    await expect(second).resolves.toBeUndefined()
    expect(synthesis.cancel).toHaveBeenCalledTimes(3)
  })

  it('resuelve ante onerror, excepciones y al desactivar o desmontar', async () => {
    const synthesis = installSpeechMock()
    synthesis.speak.mockImplementationOnce((utterance) => {
      queueMicrotask(() => utterance.onerror?.(new Event('error') as SpeechSynthesisErrorEvent))
    })
    const mounted = await mountSpeech()
    await expect(mounted.api.speak?.('Error')).resolves.toBeUndefined()

    synthesis.speak.mockImplementationOnce(() => {
      throw new Error('motor roto')
    })
    await expect(mounted.api.speak?.('Excepción')).resolves.toBeUndefined()

    synthesis.speak.mockImplementation(() => undefined)
    const disabling = mounted.api.speak!('Pendiente')
    mounted.enabledRef.value = false
    await nextTick()
    await expect(disabling).resolves.toBeUndefined()

    mounted.enabledRef.value = true
    await nextTick()
    const unmounting = mounted.api.speak!('Otra')
    mounted.wrapper.unmount()
    await expect(unmounting).resolves.toBeUndefined()
  })
})
