export type GameKind = 'shape' | 'color' | 'number' | 'animal'
export type GameCategoryId = 'choose' | 'pairs'

export interface GameOption {
  id: string
  label: string
  spokenLabel: string
  color?: string
  shape?: 'circle' | 'square' | 'triangle' | 'star'
  number?: number
  animal?: string
  sound?: string
  soundDuration?: number
}

export interface GameDefinition {
  id: string
  title: string
  shortTitle: string
  instruction: string
  icon: string
  accent: string
  kind: GameKind
  options: GameOption[]
}

export interface PairGameDefinition {
  id: string
  title: string
  shortTitle: string
  icon: string
  accent: string
  kind: 'shape' | 'color'
  pairCount: number
  options: GameOption[]
}

export interface GameCategory {
  id: GameCategoryId
  title: string
  description: string
  icon: string
  accent: string
}
