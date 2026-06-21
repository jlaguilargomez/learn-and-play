import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pairGames } from '../data/games'
import PairGame from './PairGame.vue'

const speak = vi.fn(() => Promise.resolve())

vi.mock('../composables/useSpeech', () => ({
  useSpeech: () => ({ speak, stop: vi.fn() }),
}))

describe('PairGame', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  it('crea la cuadrícula, guía la primera selección y emite volver', async () => {
    const wrapper = mount(PairGame, {
      props: { game: pairGames[0], soundEnabled: true },
    })
    await flushPromises()

    expect(wrapper.findAll('.pair-card')).toHaveLength(6)
    expect(speak).toHaveBeenCalledWith('Busca dos iguales')

    await wrapper.findAll('.pair-card')[0].trigger('click')
    expect(wrapper.get('.prompt-card').text()).toContain('Ahora busca su pareja')
    expect(speak).toHaveBeenCalledWith('Busca su pareja')

    await wrapper.get('.prompt-card').trigger('click')
    expect(speak).toHaveBeenLastCalledWith('Ahora busca su pareja')

    await wrapper.get('button[aria-label="Volver al menú"]').trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('marca un error, ignora pulsaciones mientras comprueba y restaura la ronda', async () => {
    const wrapper = mount(PairGame, {
      props: { game: pairGames[0], soundEnabled: true },
    })
    await flushPromises()

    const cards = wrapper.findAll('.pair-card')
    const firstLabel = cards[0].attributes('aria-label')
    const second = cards.find((card) => card.attributes('aria-label') !== firstLabel)!
    await cards[0].trigger('click')
    await second.trigger('click')
    await cards[0].trigger('click')

    expect(wrapper.get('.prompt-card').text()).toContain('Busca otra pareja')
    expect(wrapper.findAll('.pair-card.wrong')).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(850)
    expect(wrapper.findAll('.pair-card.selected')).toHaveLength(0)
    expect(wrapper.get('.prompt-card').text()).toContain('Busca dos iguales')
  })

  it('encuentra una pareja y deshabilita sus tarjetas', async () => {
    const wrapper = mount(PairGame, {
      props: { game: pairGames[0], soundEnabled: true },
    })
    await flushPromises()

    const label = wrapper.findAll('.pair-card')[0].attributes('aria-label')
    const pair = wrapper.findAll(`button[aria-label="${label}"]`)
    expect(pair).toHaveLength(2)
    await pair[0].trigger('click')
    await pair[1].trigger('click')

    expect(wrapper.get('.prompt-card').text()).toContain('¡Son iguales!')
    expect(wrapper.findAll('.pair-card.matched')).toHaveLength(2)
    expect(wrapper.findAll('.pair-card.matched').every((card) => card.attributes('disabled') !== undefined)).toBe(true)

    await vi.advanceTimersByTimeAsync(700)
    expect(wrapper.get('.prompt-card').text()).toContain('Busca dos iguales')
  })

  it('completa todas las parejas y reinicia automáticamente', async () => {
    const onePairGame = { ...pairGames[0], pairCount: 1 }
    const wrapper = mount(PairGame, {
      props: { game: onePairGame, soundEnabled: true },
    })
    await flushPromises()

    const cards = wrapper.findAll('.pair-card')
    await cards[0].trigger('click')
    await cards[1].trigger('click')
    expect(wrapper.get('.prompt-card').text()).toContain('¡Todas las parejas!')
    expect(speak).toHaveBeenCalledWith('¡Muy bien! Todas las parejas')

    await vi.advanceTimersByTimeAsync(700)
    await vi.advanceTimersByTimeAsync(900)
    await flushPromises()
    expect(wrapper.findAll('.pair-card')).toHaveLength(2)
    expect(wrapper.findAll('.pair-card.matched')).toHaveLength(0)
  })

  it('ignora tarjetas ya seleccionadas o emparejadas', async () => {
    const onePairGame = { ...pairGames[0], pairCount: 1 }
    const wrapper = mount(PairGame, {
      props: { game: onePairGame, soundEnabled: true },
    })
    await flushPromises()
    const cards = wrapper.findAll('.pair-card')

    await cards[0].trigger('click')
    await cards[0].trigger('click')
    expect(wrapper.findAll('.pair-card.selected')).toHaveLength(1)
    await cards[1].trigger('click')
    await cards[0].trigger('click')
    expect(wrapper.findAll('.pair-card.matched')).toHaveLength(2)
  })

  it('relaciona animal y hogar en cualquier orden con textos asociativos', async () => {
    const game = pairGames.find((candidate) => candidate.mode === 'association')!
    const wrapper = mount(PairGame, {
      props: { game, soundEnabled: true },
    })
    await flushPromises()

    expect(wrapper.get('.prompt-card').text()).toContain('Busca qué va con cada animal')
    expect(wrapper.text()).toContain('Toca un animal o un hogar')

    const visibleLabels = new Set(
      wrapper.findAll('.pair-card').map((card) => card.attributes('aria-label')),
    )
    const pairId = game.options.find((option) => {
      if (!option.pairId || !visibleLabels.has(option.label)) return false
      return game.options.filter((candidate) => candidate.pairId === option.pairId)
        .every((candidate) => visibleLabels.has(candidate.label))
    })!.pairId
    const [animal, home] = game.options.filter((option) => option.pairId === pairId)
    const animalCard = wrapper.get(`button[aria-label="${animal.label}"]`)
    const homeCard = wrapper.get(`button[aria-label="${home.label}"]`)
    await homeCard.trigger('click')
    await animalCard.trigger('click')

    expect(wrapper.get('.prompt-card').text()).toContain('¡Van juntos!')
    expect(speak).toHaveBeenCalledWith('¡Van juntos!')
    expect(animalCard.classes()).toContain('matched')
    expect(homeCard.classes()).toContain('matched')
  })
})
