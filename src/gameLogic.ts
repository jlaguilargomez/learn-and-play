import type { GameDefinition, GameOption, PairGameDefinition } from './types/game'

export type RandomSource = () => number

export interface ChoiceRound {
  choices: GameOption[]
  target: GameOption
  targetConcept: string
  temperature: 'cold' | 'hot' | null
}

export interface PairCard {
  cardId: string
  pairId: string
  option: GameOption
}

export function shuffled<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const result = [...items]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }

  return result
}

export function createChoiceRound(
  game: GameDefinition,
  avoidId?: string,
  previousTemperature: 'cold' | 'hot' | null = null,
  random: RandomSource = Math.random,
): ChoiceRound {
  if (game.options.length === 0) {
    throw new Error(`El juego "${game.id}" necesita al menos una opción`)
  }

  if (game.kind === 'temperature') {
    const temperature =
      previousTemperature === null
        ? random() < 0.5 ? 'cold' : 'hot'
        : previousTemperature === 'cold' ? 'hot' : 'cold'
    const oppositeTemperature = temperature === 'cold' ? 'hot' : 'cold'
    const desiredOptions = game.options.filter((option) => option.temperature === temperature)
    const oppositeOptions = game.options.filter((option) => option.temperature === oppositeTemperature)

    if (desiredOptions.length === 0 || oppositeOptions.length === 0) {
      throw new Error(`El juego "${game.id}" necesita opciones frías y calientes`)
    }

    const target = shuffled(desiredOptions, random)[0]
    const opposite = shuffled(oppositeOptions, random)[0]

    return {
      target,
      targetConcept: temperature === 'cold' ? 'frío' : 'caliente',
      temperature,
      choices: shuffled([target, opposite], random),
    }
  }

  const pool = game.options.filter((option) => option.id !== avoidId)
  const availableTargets = pool.length > 0 ? pool : game.options
  const target = availableTargets[Math.floor(random() * availableTargets.length)] ?? game.options[0]
  const distractors = shuffled(
    game.options.filter((option) => option.id !== target.id),
    random,
  ).slice(0, Math.min(2, game.options.length - 1))

  return {
    target,
    targetConcept: target.label,
    temperature: null,
    choices: shuffled([target, ...distractors], random),
  }
}

export function createPairCards(
  game: PairGameDefinition,
  random: RandomSource = Math.random,
): PairCard[] {
  if (game.pairCount < 1 || game.options.length < game.pairCount) {
    throw new Error(`El juego "${game.id}" no tiene suficientes opciones para sus parejas`)
  }

  const selectedOptions = shuffled(game.options, random).slice(0, game.pairCount)

  return shuffled(
    selectedOptions.flatMap((option) => [
      { cardId: `${option.id}-a`, pairId: option.id, option },
      { cardId: `${option.id}-b`, pairId: option.id, option },
    ]),
    random,
  )
}

export function cardsArePair(first: PairCard | undefined, second: PairCard | undefined) {
  return Boolean(first && second && first.cardId !== second.cardId && first.pairId === second.pairId)
}
