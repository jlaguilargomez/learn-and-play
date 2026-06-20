import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mount, registerSW, installInteractionGuards } = vi.hoisted(() => ({
  mount: vi.fn(),
  registerSW: vi.fn(),
  installInteractionGuards: vi.fn(),
}))

vi.mock('vue', async (importOriginal) => ({
  ...await importOriginal<typeof import('vue')>(),
  createApp: vi.fn(() => ({ mount })),
}))

vi.mock('virtual:pwa-register', () => ({ registerSW }))
vi.mock('./interactionGuards', () => ({ installInteractionGuards }))

describe('application bootstrap', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('instala protecciones, registra la PWA y monta Vue', async () => {
    await import('./main')

    expect(installInteractionGuards).toHaveBeenCalledOnce()
    expect(registerSW).toHaveBeenCalledWith({ immediate: true })
    expect(mount).toHaveBeenCalledWith('#app')
  })
})
