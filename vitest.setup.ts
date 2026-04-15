import { vi } from 'vitest'

// Stub server-only so server modules can be imported during tests.
vi.mock('server-only', () => ({ default: {} }))
