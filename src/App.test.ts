import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.vue'
import { installSpeechMock } from './test/browserMocks'

describe('App', () => {
  beforeEach(() => {
    installSpeechMock()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  it('muestra juegos, cambia de categoría y vuelve al menú', async () => {
    const wrapper = mount(App)
    expect(wrapper.get('h1').text()).toBe('¿A qué jugamos?')
    expect(wrapper.findAll('.game-card')).toHaveLength(5)

    await wrapper.findAll('.category-card')[1].trigger('click')
    expect(wrapper.findAll('.game-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('Colores')

    await wrapper.findAll('.game-card')[0].trigger('click')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Parejas de colores')

    await wrapper.get('button[aria-label="Volver al menú"]').trigger('click')
    expect(wrapper.get('h1').text()).toBe('¿A qué jugamos?')
  })

  it('activa y desactiva toda la voz', async () => {
    const wrapper = mount(App)
    const button = wrapper.get('button[aria-label="Desactivar voz"]')
    expect(button.attributes('aria-pressed')).toBe('true')

    await button.trigger('click')
    expect(wrapper.get('button[aria-label="Activar voz"]').text()).toContain('SIN VOZ')
  })

  it('abre y cierra un juego de elección', async () => {
    const wrapper = mount(App)
    await wrapper.findAll('.game-card')[0].trigger('click')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Las formas')
    await wrapper.get('button[aria-label="Volver al menú"]').trigger('click')
    expect(wrapper.text()).toContain('¿A qué jugamos?')
  })
})
