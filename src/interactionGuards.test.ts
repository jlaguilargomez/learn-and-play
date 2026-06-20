import { describe, expect, it, vi } from 'vitest'
import { blockUnneededInteraction, installInteractionGuards } from './interactionGuards'

describe('interaction guards', () => {
  it('cancela las interacciones innecesarias', () => {
    const event = new Event('contextmenu', { cancelable: true })
    blockUnneededInteraction(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('instala, ejecuta y retira todos los listeners', () => {
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()
    const removeAllRanges = vi.fn()
    const target = {
      addEventListener,
      removeEventListener,
      getSelection: vi.fn(() => ({ isCollapsed: false, removeAllRanges }) as unknown as Selection),
    }

    const uninstall = installInteractionGuards(target)
    expect(addEventListener).toHaveBeenCalledTimes(4)

    const selectionListener = addEventListener.mock.calls.find(([event]) => event === 'selectionchange')![1]
    selectionListener()
    expect(removeAllRanges).toHaveBeenCalledOnce()

    uninstall()
    expect(removeEventListener).toHaveBeenCalledTimes(4)
  })

  it('no altera una selección colapsada o inexistente', () => {
    const target = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getSelection: vi.fn<() => Selection | null>(() => null),
    }
    installInteractionGuards(target)
    const listener = target.addEventListener.mock.calls.find(([event]) => event === 'selectionchange')![1]
    listener()

    target.getSelection.mockReturnValue({ isCollapsed: true, removeAllRanges: vi.fn() } as unknown as Selection)
    listener()
    expect(target.getSelection).toHaveBeenCalledTimes(2)
  })
})
