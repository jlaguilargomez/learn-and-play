export type GameKind = 'shape' | 'color' | 'number'

export interface GameOption {
  id: string
  label: string
  spokenLabel: string
  color?: string
  shape?: 'circle' | 'square' | 'triangle' | 'star'
  number?: number
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
