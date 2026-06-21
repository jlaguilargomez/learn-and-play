import type { GameDefinition, GameOption, PairGameDefinition } from './types/game'

export type RandomSource = () => number

export interface ChoiceRound {
  choices: GameOption[]
  target: GameOption
  targetConcept: string
  temperature: 'cold' | 'hot' | null
  size: 'small' | 'large' | null
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
  previousSize: 'small' | 'large' | null = null,
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
      size: null,
      choices: shuffled([target, opposite], random),
    }
  }

  if (game.kind === 'size') {
    const objectIds = [...new Set(game.options.map((option) => option.pairId))]
      .filter((id): id is string => Boolean(id))
    const availableObjectIds = objectIds.filter((id) => id !== avoidId)
    const objectPool = availableObjectIds.length > 0 ? availableObjectIds : objectIds
    const objectId = objectPool[Math.floor(random() * objectPool.length)]
    const objectOptions = game.options.filter((option) => option.pairId === objectId)
    const size =
      previousSize === null
        ? random() < 0.5 ? 'small' : 'large'
        : previousSize === 'small' ? 'large' : 'small'
    const target = objectOptions.find((option) => option.size === size)
    const opposite = objectOptions.find((option) => option.size !== size)

    if (!objectId || !target || !opposite) {
      throw new Error(`El juego "${game.id}" necesita objetos con tamaño pequeño y grande`)
    }

    return {
      target,
      targetConcept: size === 'small' ? 'pequeño' : 'grande',
      temperature: null,
      size,
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
    size: null,
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

  if (game.mode === 'association') {
    const pairIds = [...new Set(game.options.map((option) => option.pairId))]
      .filter((id): id is string => Boolean(id))

    if (
      pairIds.length < game.pairCount
      || pairIds.some((pairId) => game.options.filter((option) => option.pairId === pairId).length !== 2)
    ) {
      throw new Error(`El juego "${game.id}" no tiene asociaciones válidas suficientes`)
    }

    const selectedPairIds = shuffled(pairIds, random).slice(0, game.pairCount)
    return shuffled(
      selectedPairIds.flatMap((pairId) =>
        game.options
          .filter((option) => option.pairId === pairId)
          .map((option, index) => ({
            cardId: `${option.id}-${index}`,
            pairId,
            option,
          })),
      ),
      random,
    )
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
