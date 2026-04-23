import { vi } from 'vitest'

// Stub server-only so server modules can be imported during tests.
vi.mock('server-only', () => ({ default: {} }))

// Polyfill ResizeObserver for jsdom (not available in test environment)
class ResizeObserverMock {
  private callback: ResizeObserverCallback
  private observationTargets = new Set<Element>()

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element): void {
    this.observationTargets.add(target)
    // Fire initial callback synchronously with a trivial entry
    this.callback(
      [{ target, contentRect: target.getBoundingClientRect() } as ResizeObserverEntry],
      this,
    )
  }

  unobserve(target: Element): void {
    this.observationTargets.delete(target)
  }

  disconnect(): void {
    this.observationTargets.clear()
  }
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock)
