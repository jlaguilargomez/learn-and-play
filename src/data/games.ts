import type { GameDefinition } from '../types/game'

export const games: GameDefinition[] = [
  {
    id: 'formas',
    title: 'Las formas',
    shortTitle: 'Formas',
    instruction: 'Toca el',
    icon: '●',
    accent: '#ef5d60',
    kind: 'shape',
    options: [
      { id: 'circulo', label: 'círculo', spokenLabel: 'círculo', shape: 'circle', color: '#ef5d60' },
      { id: 'cuadrado', label: 'cuadrado', spokenLabel: 'cuadrado', shape: 'square', color: '#3185c6' },
      { id: 'triangulo', label: 'triángulo', spokenLabel: 'triángulo', shape: 'triangle', color: '#f4b942' },
      { id: 'estrella', label: 'estrella', spokenLabel: 'estrella', shape: 'star', color: '#70a84f' },
    ],
  },
  {
    id: 'colores',
    title: 'Los colores',
    shortTitle: 'Colores',
    instruction: 'Toca el color',
    icon: '◆',
    accent: '#3185c6',
    kind: 'color',
    options: [
      { id: 'rojo', label: 'rojo', spokenLabel: 'rojo', color: '#e94f55' },
      { id: 'azul', label: 'azul', spokenLabel: 'azul', color: '#3185c6' },
      { id: 'amarillo', label: 'amarillo', spokenLabel: 'amarillo', color: '#f4c542' },
      { id: 'verde', label: 'verde', spokenLabel: 'verde', color: '#62a84f' },
    ],
  },
  {
    id: 'numeros',
    title: 'Los números',
    shortTitle: 'Números',
    instruction: '¿Dónde está el',
    icon: '3',
    accent: '#70a84f',
    kind: 'number',
    options: [
      { id: 'uno', label: 'uno', spokenLabel: 'uno', number: 1, color: '#ef5d60' },
      { id: 'dos', label: 'dos', spokenLabel: 'dos', number: 2, color: '#3185c6' },
      { id: 'tres', label: 'tres', spokenLabel: 'tres', number: 3, color: '#f0ad36' },
      { id: 'cuatro', label: 'cuatro', spokenLabel: 'cuatro', number: 4, color: '#70a84f' },
    ],
  },
]
