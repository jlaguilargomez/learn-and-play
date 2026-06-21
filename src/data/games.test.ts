import { describe, expect, it } from 'vitest'
import { choiceGames, gameCategories, pairGames } from './games'

describe('game data invariants', () => {
  it('mantiene categorías e identificadores únicos', () => {
    expect(gameCategories.map((category) => category.id)).toEqual(['choose', 'pairs'])

    const ids = [...choiceGames, ...pairGames].map((game) => game.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ofrece variedad moderada sin aumentar las opciones simultáneas', () => {
    const expectedMinimums = new Map([
      ['formas', 6],
      ['colores', 6],
      ['numeros', 6],
      ['animales', 8],
      ['frio-calor', 10],
      ['grande-pequeno', 10],
    ])

    for (const game of choiceGames) {
      expect(game.options.length).toBeGreaterThanOrEqual(expectedMinimums.get(game.id) ?? 1)
    }

    expect(pairGames.find((game) => game.id === 'parejas-colores')?.options).toHaveLength(6)
    expect(pairGames.find((game) => game.id === 'parejas-formas')?.options).toHaveLength(6)
    expect(pairGames.find((game) => game.id === 'animal-hogar')?.options).toHaveLength(10)
    expect(pairGames.every((game) => game.pairCount === 3)).toBe(true)
  })

  it('define correctamente cada opción según su tipo', () => {
    for (const game of choiceGames) {
      expect(game.options.length).toBeGreaterThan(0)
      expect(new Set(game.options.map((option) => option.id)).size).toBe(game.options.length)

      for (const option of game.options) {
        expect(option.label).toBeTruthy()
        expect(option.spokenLabel).toBeTruthy()
        if (game.kind === 'shape') expect(option.shape).toBeTruthy()
        if (game.kind === 'color') expect(option.color).toBeTruthy()
        if (game.kind === 'number') expect(option.number).toBeGreaterThan(0)
        if (game.kind === 'animal') expect(option.animal).toBeTruthy()
        if (game.kind === 'temperature') {
          expect(option.emoji).toBeTruthy()
          expect(['cold', 'hot']).toContain(option.temperature)
        }
        if (game.kind === 'size') {
          expect(option.emoji).toBeTruthy()
          expect(option.pairId).toBeTruthy()
          expect(['small', 'large']).toContain(option.size)
        }
      }
    }
  })

  it('garantiza que los juegos de parejas pueden construir la ronda', () => {
    for (const game of pairGames) {
      expect(game.pairCount).toBeGreaterThan(0)
      expect(game.options.length).toBeGreaterThanOrEqual(game.pairCount)
      if (game.mode === 'association') {
        expect(game.kind).toBe('association')
        expect(new Set(game.options.map((option) => option.pairId)).size).toBeGreaterThanOrEqual(
          game.pairCount,
        )
      } else {
        expect(['shape', 'color']).toContain(game.kind)
      }
    }
  })
})
