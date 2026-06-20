import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GameVisual from './GameVisual.vue'
import type { GameKind, GameOption } from '../types/game'

function render(kind: GameKind, option: GameOption) {
  return mount(GameVisual, { props: { kind, option } })
}

describe('GameVisual', () => {
  it('renderiza formas y colores', () => {
    const shape = render('shape', {
      id: 'estrella',
      label: 'estrella',
      spokenLabel: 'estrella',
      shape: 'star',
      color: '#fff000',
    })
    expect(shape.find('.shape--star').exists()).toBe(true)
    expect(shape.find('.shape').attributes('style')).toContain('--shape-color')

    const color = render('color', {
      id: 'azul',
      label: 'azul',
      spokenLabel: 'azul',
      color: '#3185c6',
    })
    expect(color.find('.color-swatch').attributes('style')).toContain('background-color')
  })

  it('renderiza números con la cantidad correcta de puntos', () => {
    const wrapper = render('number', {
      id: 'tres',
      label: 'tres',
      spokenLabel: 'tres',
      number: 3,
      color: '#ef5d60',
    })
    expect(wrapper.get('.number').text()).toBe('3')
    expect(wrapper.findAll('.number-dots i')).toHaveLength(3)
  })

  it('renderiza animales y otros emojis', () => {
    expect(render('animal', {
      id: 'gato',
      label: 'gato',
      spokenLabel: 'gato',
      animal: '🐱',
    }).text()).toContain('🐱')

    expect(render('temperature', {
      id: 'hielo',
      label: 'hielo',
      spokenLabel: 'hielo',
      emoji: '🧊',
    }).text()).toContain('🧊')
  })
})
