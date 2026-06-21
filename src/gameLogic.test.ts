import { describe, expect, it } from 'vitest'
import { choiceGames, pairGames } from './data/games'
import { cardsArePair, createChoiceRound, createPairCards, shuffled } from './gameLogic'
import type { GameDefinition, PairGameDefinition } from './types/game'

const always = (value: number) => () => value

describe('shuffled', () => {
  it('baraja sin mutar el array original', () => {
    const original = [1, 2, 3, 4]

    expect(shuffled(original, always(0))).toEqual([2, 3, 4, 1])
    expect(original).toEqual([1, 2, 3, 4])
  })

  it('conserva arrays vacíos o de un elemento', () => {
    expect(shuffled([], always(0.5))).toEqual([])
    expect(shuffled(['uno'], always(0.5))).toEqual(['uno'])
  })
})

describe('createChoiceRound', () => {
  it('crea una ronda con objetivo, distractores únicos y concepto', () => {
    const game = choiceGames[0]
    const round = createChoiceRound(game, undefined, null, always(0))

    expect(round.target).toBe(game.options[0])
    expect(round.targetConcept).toBe('círculo')
    expect(round.temperature).toBeNull()
    expect(round.choices).toHaveLength(3)
    expect(new Set(round.choices.map((option) => option.id)).size).toBe(3)
    expect(round.choices).toContain(round.target)
  })

  it('evita repetir el objetivo anterior y recupera el pool si solo hay una opción', () => {
    const game = choiceGames[0]
    expect(createChoiceRound(game, game.options[0].id, null, always(0)).target).toBe(game.options[1])

    const oneOption = { ...game, options: [game.options[0]] }
    const round = createChoiceRound(oneOption, game.options[0].id, null, always(0))
    expect(round.target).toBe(game.options[0])
    expect(round.choices).toEqual([game.options[0]])
  })

  it('puede escoger también los conceptos añadidos al final del catálogo', () => {
    const shapes = choiceGames.find((game) => game.id === 'formas')!
    const sizes = choiceGames.find((game) => game.id === 'grande-pequeno')!

    expect(createChoiceRound(shapes, undefined, null, always(0.99)).target.label).toBe('corazón')
    expect(createChoiceRound(sizes, undefined, null, always(0.99)).target.label).toBe('oso grande')
  })

  it('alterna entre frío y calor después de la primera ronda', () => {
    const game = choiceGames.find((candidate) => candidate.kind === 'temperature')!
    const cold = createChoiceRound(game, undefined, null, always(0))
    const hot = createChoiceRound(game, undefined, cold.temperature, always(0))

    expect(cold.temperature).toBe('cold')
    expect(cold.targetConcept).toBe('frío')
    expect(cold.choices.every((option) => option.temperature === 'cold' || option.temperature === 'hot')).toBe(true)
    expect(hot.temperature).toBe('hot')
    expect(hot.targetConcept).toBe('caliente')
  })

  it('puede comenzar por calor', () => {
    const game = choiceGames.find((candidate) => candidate.kind === 'temperature')!
    expect(createChoiceRound(game, undefined, null, always(0.9)).temperature).toBe('hot')
  })

  it('rechaza juegos vacíos o de temperatura incompletos', () => {
    const empty: GameDefinition = { ...choiceGames[0], id: 'empty', options: [] }
    const incomplete: GameDefinition = {
      ...choiceGames.find((game) => game.kind === 'temperature')!,
      options: [{ id: 'hielo', label: 'hielo', spokenLabel: 'hielo', temperature: 'cold' }],
    }

    expect(() => createChoiceRound(empty)).toThrow('necesita al menos una opción')
    expect(() => createChoiceRound(incomplete)).toThrow('necesita opciones frías y calientes')
  })

  it('crea comparaciones del mismo objeto y alterna pequeño y grande', () => {
    const game = choiceGames.find((candidate) => candidate.kind === 'size')!
    const small = createChoiceRound(game, undefined, null, always(0), null)
    const large = createChoiceRound(game, small.target.pairId, null, always(0), small.size)

    expect(small.size).toBe('small')
    expect(small.targetConcept).toBe('pequeño')
    expect(new Set(small.choices.map((option) => option.pairId))).toEqual(new Set(['pelota']))
    expect(small.choices.map((option) => option.size).sort()).toEqual(['large', 'small'])

    expect(large.size).toBe('large')
    expect(large.targetConcept).toBe('grande')
    expect(large.target.pairId).not.toBe(small.target.pairId)
  })

  it('rechaza comparaciones de tamaño incompletas', () => {
    const game = choiceGames.find((candidate) => candidate.kind === 'size')!
    const invalid: GameDefinition = { ...game, options: [game.options[0]] }
    expect(() => createChoiceRound(invalid, undefined, null, always(0))).toThrow(
      'necesita objetos con tamaño pequeño y grande',
    )
  })
})

describe('pair logic', () => {
  it('crea dos tarjetas por pareja con ids únicos', () => {
    const game = pairGames[0]
    const cards = createPairCards(game, always(0))

    expect(cards).toHaveLength(game.pairCount * 2)
    expect(new Set(cards.map((card) => card.cardId)).size).toBe(cards.length)
    for (const pairId of new Set(cards.map((card) => card.pairId))) {
      expect(cards.filter((card) => card.pairId === pairId)).toHaveLength(2)
    }
  })

  it('rechaza una configuración sin parejas suficientes', () => {
    const invalid: PairGameDefinition = { ...pairGames[0], pairCount: 0 }
    const tooLarge: PairGameDefinition = { ...pairGames[0], pairCount: 99 }
    expect(() => createPairCards(invalid)).toThrow('no tiene suficientes opciones')
    expect(() => createPairCards(tooLarge)).toThrow('no tiene suficientes opciones')
  })

  it('reconoce parejas y descarta tarjetas ausentes, distintas o idénticas', () => {
    const [first, second, third] = createPairCards(pairGames[0], always(0))
    const pair = createPairCards({ ...pairGames[0], pairCount: 1 }, always(0))

    expect(cardsArePair(pair[0], pair[1])).toBe(true)
    expect(cardsArePair(first, second)).toBe(false)
    expect(cardsArePair(first, first)).toBe(false)
    expect(cardsArePair(undefined, third)).toBe(false)
  })

  it('crea asociaciones con dos conceptos diferentes por pareja', () => {
    const game = pairGames.find((candidate) => candidate.mode === 'association')!
    const cards = createPairCards(game, always(0))

    expect(cards).toHaveLength(6)
    for (const pairId of new Set(cards.map((card) => card.pairId))) {
      const pair = cards.filter((card) => card.pairId === pairId)
      expect(pair).toHaveLength(2)
      expect(pair[0].option.id).not.toBe(pair[1].option.id)
      expect(cardsArePair(pair[0], pair[1])).toBe(true)
      expect(cardsArePair(pair[1], pair[0])).toBe(true)
    }
  })

  it('rechaza asociaciones incompletas o insuficientes', () => {
    const game = pairGames.find((candidate) => candidate.mode === 'association')!
    const incomplete: PairGameDefinition = { ...game, options: game.options.slice(0, 5) }
    const insufficient: PairGameDefinition = { ...game, pairCount: 6 }

    expect(() => createPairCards(incomplete)).toThrow('no tiene asociaciones válidas suficientes')
    expect(() => createPairCards(insufficient)).toThrow()
  })
})
