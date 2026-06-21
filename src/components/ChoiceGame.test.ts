import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { choiceGames } from '../data/games'
import ChoiceGame from './ChoiceGame.vue'

const speak = vi.fn(() => Promise.resolve())
const stop = vi.fn()

vi.mock('../composables/useSpeech', () => ({
  useSpeech: () => ({ speak, stop }),
}))

describe('ChoiceGame', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  it('crea la ronda, repite la instrucción y emite volver', async () => {
    const wrapper = mount(ChoiceGame, {
      props: { game: choiceGames[0], soundEnabled: true },
    })
    await flushPromises()

    expect(wrapper.findAll('.choice-card')).toHaveLength(3)
    expect(wrapper.get('.prompt-card').text()).toContain('Toca el círculo')
    expect(speak).toHaveBeenCalledWith('Toca el círculo')

    await wrapper.get('.prompt-card').trigger('click')
    expect(speak).toHaveBeenLastCalledWith('Toca el círculo')

    await wrapper.get('button[aria-label="Volver al menú"]').trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('muestra error, bloquea pulsaciones simultáneas y permite reintentar', async () => {
    const wrapper = mount(ChoiceGame, {
      props: { game: choiceGames[0], soundEnabled: true },
    })
    await flushPromises()

    const wrong = wrapper.findAll('.choice-card').find(
      (card) => card.attributes('aria-label') !== 'círculo',
    )!
    await wrong.trigger('click')
    await wrong.trigger('click')
    expect(wrapper.get('.prompt-card').text()).toContain('Prueba otra vez')
    expect(speak).toHaveBeenCalledWith('Prueba otra vez')

    await vi.advanceTimersByTimeAsync(450)
    expect(wrapper.get('.prompt-card').text()).toContain('Toca el círculo')
    expect(wrapper.find('.choice-card.wrong').exists()).toBe(false)
  })

  it('celebra el acierto y arranca una ronda con objetivo distinto', async () => {
    const wrapper = mount(ChoiceGame, {
      props: { game: choiceGames[0], soundEnabled: true },
    })
    await flushPromises()

    await wrapper.get('button[aria-label="círculo"]').trigger('click')
    expect(wrapper.get('.prompt-card').text()).toContain('¡Muy bien!')
    expect(wrapper.find('.choice-card.correct').exists()).toBe(true)
    expect(speak).toHaveBeenCalledWith('¡Muy bien! círculo')

    await vi.advanceTimersByTimeAsync(650)
    await flushPromises()
    expect(wrapper.get('.prompt-card').text()).toContain('Toca el cuadrado')
  })

  it('alterna preguntas de temperatura y usa feedback contextual', async () => {
    const game = choiceGames.find((candidate) => candidate.kind === 'temperature')!
    const wrapper = mount(ChoiceGame, {
      props: { game, soundEnabled: true },
    })
    await flushPromises()

    expect(wrapper.findAll('.choice-card')).toHaveLength(2)
    expect(wrapper.get('.prompt-card').text()).toContain('¿Cuál está frío?')
    const coldLabels = game.options
      .filter((option) => option.temperature === 'cold')
      .map((option) => option.label)
    const coldChoice = wrapper.findAll('.choice-card').find(
      (card) => coldLabels.includes(card.attributes('aria-label') ?? ''),
    )!
    await coldChoice.trigger('click')
    expect(speak).toHaveBeenCalledWith('¡Muy bien! Está frío')

    await vi.advanceTimersByTimeAsync(650)
    await flushPromises()
    expect(wrapper.get('.prompt-card').text()).toContain('¿Cuál está caliente?')
  })

  it('no reproduce grabaciones animales mientras estén desactivadas y limpia al desmontar', async () => {
    const pause = vi.fn()
    const audio = vi.fn(() => ({ pause, currentTime: 0, play: vi.fn() }))
    vi.stubGlobal('Audio', audio)
    const game = choiceGames.find((candidate) => candidate.kind === 'animal')!
    const wrapper = mount(ChoiceGame, { props: { game, soundEnabled: true } })
    await flushPromises()
    await wrapper.get('button[aria-label="gato"]').trigger('click')
    expect(audio).not.toHaveBeenCalled()
    wrapper.unmount()
    expect(pause).not.toHaveBeenCalled()
  })

  it('alterna pequeño y grande y cambia de objeto tras acertar', async () => {
    const game = choiceGames.find((candidate) => candidate.kind === 'size')!
    const wrapper = mount(ChoiceGame, {
      props: { game, soundEnabled: true },
    })
    await flushPromises()

    expect(wrapper.get('.prompt-card').text()).toContain('¿Cuál es pequeño?')
    expect(wrapper.findAll('.choice-card')).toHaveLength(2)
    expect(new Set(wrapper.findAll('.choice-card').map((card) => card.attributes('aria-label')))).toEqual(
      new Set(['pelota pequeña', 'pelota grande']),
    )

    await wrapper.get('button[aria-label="pelota pequeña"]').trigger('click')
    expect(speak).toHaveBeenCalledWith('¡Muy bien! Es pequeño')

    await vi.advanceTimersByTimeAsync(650)
    await flushPromises()
    expect(wrapper.get('.prompt-card').text()).toContain('¿Cuál es grande?')
    expect(wrapper.findAll('.choice-card').map((card) => card.attributes('aria-label'))).toContain('manzana grande')
  })
})
