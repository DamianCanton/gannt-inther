import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ScheduleTask } from '@/types/gantt'

import { GanttGrid } from '../gantt-grid'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeTask = (overrides: Partial<ScheduleTask>): ScheduleTask => ({
  id: overrides.id ?? 'task',
  projectId: overrides.projectId ?? 'p1',
  obraId: overrides.obraId ?? 'o1',
  nombre: overrides.nombre ?? 'Task',
  duracionDias: overrides.duracionDias ?? 1,
  dependeDeId: overrides.dependeDeId ?? null,
  orden: overrides.orden ?? 1,
  fechaInicio: overrides.fechaInicio ?? '2026-04-06',
  fechaFin: overrides.fechaFin ?? '2026-04-06',
})

/** Enough tasks to create horizontal overflow (> 10 daily columns). */
const overflowingTasks: ScheduleTask[] = [
  makeTask({ id: 'A', nombre: 'Cimentación', duracionDias: 5, fechaInicio: '2026-04-06', fechaFin: '2026-04-10', orden: 1 }),
  makeTask({ id: 'B', nombre: 'Estructura', duracionDias: 10, fechaInicio: '2026-04-13', fechaFin: '2026-04-24', dependeDeId: 'A', orden: 2 }),
  makeTask({ id: 'C', nombre: 'Terminaciones', duracionDias: 8, fechaInicio: '2026-04-27', fechaFin: '2026-05-06', dependeDeId: 'B', orden: 3 }),
]

/** Single short task that won't overflow horizontally. */
const shortTasks: ScheduleTask[] = [
  makeTask({ id: 'X', nombre: 'Breve', duracionDias: 2, fechaInicio: '2026-04-06', fechaFin: '2026-04-07', orden: 1 }),
]

const noop = vi.fn()

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GanttGrid — old navigation controls removed', () => {
  afterEach(() => {
    cleanup()
    noop.mockClear()
  })

  it('does NOT render the legacy "◀ Izquierda" navigation button', () => {
    render(<GanttGrid tasks={overflowingTasks} obraStartDate="2026-04-06" selectedTaskId={null} onSelectTask={noop} />)
    expect(screen.queryByText('◀ Izquierda')).toBeNull()
  })

  it('does NOT render the legacy "Ir a Hoy" button', () => {
    render(<GanttGrid tasks={overflowingTasks} obraStartDate="2026-04-06" selectedTaskId={null} onSelectTask={noop} />)
    expect(screen.queryByText(/Ir a Hoy/)).toBeNull()
  })

  it('does NOT render the legacy "Derecha ▶" navigation button', () => {
    render(<GanttGrid tasks={overflowingTasks} obraStartDate="2026-04-06" selectedTaskId={null} onSelectTask={noop} />)
    expect(screen.queryByText('Derecha ▶')).toBeNull()
  })
})

describe('GanttGrid — native scrollbar replaces custom controls', () => {
  afterEach(() => {
    cleanup()
    noop.mockClear()
  })

  it('renders a horizontally scrollable container for the timeline', () => {
    render(<GanttGrid tasks={overflowingTasks} obraStartDate="2026-04-06" selectedTaskId={null} onSelectTask={noop} />)

    const scrollContainer = document.querySelector('.overflow-x-auto')
    expect(scrollContainer).not.toBeNull()
    // Must NOT hide the native scrollbar — user needs it visible
    expect(scrollContainer!.classList.contains('hide-all-scrollbars')).toBe(false)
  })

  it('does NOT render any custom scrollbar thumb or track elements', () => {
    render(<GanttGrid tasks={overflowingTasks} obraStartDate="2026-04-06" selectedTaskId={null} onSelectTask={noop} />)

    // No custom draggable thumb
    const thumb = document.querySelector('.bg-slate-400')
    expect(thumb).toBeNull()
    // No custom scrollbar track
    const track = document.querySelector('.h-5.bg-gray-100')
    expect(track).toBeNull()
  })

  it('renders task labels and timeline columns in the grid', () => {
    render(<GanttGrid tasks={overflowingTasks} obraStartDate="2026-04-06" selectedTaskId={null} onSelectTask={noop} />)

    expect(screen.getByText('Tareas')).toBeTruthy()
    expect(screen.getByText('Cimentación')).toBeTruthy()
    expect(screen.getByText('Estructura')).toBeTruthy()
    expect(screen.getByText('Terminaciones')).toBeTruthy()
  })

  it('scroll container has overflow-x-auto class for native horizontal scrolling', () => {
    render(<GanttGrid tasks={overflowingTasks} obraStartDate="2026-04-06" selectedTaskId={null} onSelectTask={noop} />)

    const scrollContainer = document.querySelector('.overflow-x-auto')
    expect(scrollContainer).not.toBeNull()
    // overflow-y-hidden keeps horizontal-only scroll
    expect(scrollContainer!.classList.contains('overflow-y-hidden')).toBe(true)
  })
})

describe('GanttGrid — data-driven overflow detection', () => {
  afterEach(() => {
    cleanup()
    noop.mockClear()
  })

  it('scroll container is present when tasks produce many timeline columns', () => {
    render(<GanttGrid tasks={overflowingTasks} obraStartDate="2026-04-06" selectedTaskId={null} onSelectTask={noop} />)

    // overflowingTasks spans ~30 calendar days → many columns → overflow-x-auto container present
    const scrollContainer = document.querySelector('.overflow-x-auto')
    expect(scrollContainer).not.toBeNull()
  })

  it('scroll container is present even for short task lists', () => {
    render(<GanttGrid tasks={shortTasks} obraStartDate="2026-04-06" selectedTaskId={null} onSelectTask={noop} />)

    // The scroll container is always rendered — the browser decides if scrollbar appears
    const scrollContainer = document.querySelector('.overflow-x-auto')
    expect(scrollContainer).not.toBeNull()
  })
})

describe('GanttGrid — scrollbar interaction updates scroll position', () => {
  afterEach(() => {
    cleanup()
    noop.mockClear()
  })

  it('scrolling the container does not crash and preserves task rendering', () => {
    render(<GanttGrid tasks={overflowingTasks} obraStartDate="2026-04-06" selectedTaskId={null} onSelectTask={noop} />)

    const scrollContainer = document.querySelector('.overflow-x-auto') as HTMLElement
    expect(scrollContainer).not.toBeNull()

    // Mock scroll dimensions (jsdom doesn't layout)
    Object.defineProperty(scrollContainer, 'scrollLeft', { value: 150, writable: true, configurable: true })
    Object.defineProperty(scrollContainer, 'scrollWidth', { value: 900, writable: false, configurable: true })
    Object.defineProperty(scrollContainer, 'clientWidth', { value: 450, writable: false, configurable: true })

    // Fire scroll event — should not crash
    fireEvent.scroll(scrollContainer)

    // Tasks still rendered after scroll
    expect(screen.getByText('Cimentación')).toBeTruthy()
    expect(screen.getByText('Estructura')).toBeTruthy()
    expect(screen.getByText('Terminaciones')).toBeTruthy()
  })

  it('scrolling to multiple positions does not crash or lose task rendering', () => {
    render(<GanttGrid tasks={overflowingTasks} obraStartDate="2026-04-06" selectedTaskId={null} onSelectTask={noop} />)

    const scrollContainer = document.querySelector('.overflow-x-auto') as HTMLElement

    // Scroll to multiple positions
    Object.defineProperty(scrollContainer, 'scrollLeft', { value: 0, writable: true, configurable: true })
    fireEvent.scroll(scrollContainer)

    Object.defineProperty(scrollContainer, 'scrollLeft', { value: 200, writable: true, configurable: true })
    fireEvent.scroll(scrollContainer)

    Object.defineProperty(scrollContainer, 'scrollLeft', { value: 400, writable: true, configurable: true })
    fireEvent.scroll(scrollContainer)

    // Tasks still rendered after multiple scrolls
    expect(screen.getByText('Cimentación')).toBeTruthy()
    expect(screen.getByText('Estructura')).toBeTruthy()
    expect(screen.getByText('Terminaciones')).toBeTruthy()
  })
})

describe('GanttGrid — legacy keyboard shortcuts are inert', () => {
  afterEach(() => {
    cleanup()
    noop.mockClear()
  })

  it('Alt+ArrowLeft does NOT change the horizontal scroll position', () => {
    render(<GanttGrid tasks={overflowingTasks} obraStartDate="2026-04-06" selectedTaskId={null} onSelectTask={noop} />)

    const scrollContainer = document.querySelector('.overflow-x-auto') as HTMLElement
    expect(scrollContainer).not.toBeNull()

    // Simulate a scroll position set by user interaction
    Object.defineProperty(scrollContainer, 'scrollLeft', { value: 120, writable: true, configurable: true })

    // Dispatch the legacy keyboard shortcut
    fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true })

    // Scroll position must remain unchanged — no legacy handler should intercept
    expect(scrollContainer.scrollLeft).toBe(120)
  })

  it('Alt+ArrowRight does NOT change the horizontal scroll position', () => {
    render(<GanttGrid tasks={overflowingTasks} obraStartDate="2026-04-06" selectedTaskId={null} onSelectTask={noop} />)

    const scrollContainer = document.querySelector('.overflow-x-auto') as HTMLElement
    expect(scrollContainer).not.toBeNull()

    Object.defineProperty(scrollContainer, 'scrollLeft', { value: 250, writable: true, configurable: true })

    fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true })

    expect(scrollContainer.scrollLeft).toBe(250)
  })

  it('Alt+Home does NOT change the horizontal scroll position', () => {
    render(<GanttGrid tasks={overflowingTasks} obraStartDate="2026-04-06" selectedTaskId={null} onSelectTask={noop} />)

    const scrollContainer = document.querySelector('.overflow-x-auto') as HTMLElement
    expect(scrollContainer).not.toBeNull()

    Object.defineProperty(scrollContainer, 'scrollLeft', { value: 380, writable: true, configurable: true })

    fireEvent.keyDown(window, { key: 'Home', altKey: true })

    expect(scrollContainer.scrollLeft).toBe(380)
  })

  it('legacy shortcuts do NOT trigger task selection side effects', () => {
    const onSelectTask = vi.fn()
    render(<GanttGrid tasks={overflowingTasks} obraStartDate="2026-04-06" selectedTaskId={null} onSelectTask={onSelectTask} />)

    fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true })
    fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true })
    fireEvent.keyDown(window, { key: 'Home', altKey: true })

    expect(onSelectTask).not.toHaveBeenCalled()
  })
})

describe('GanttGrid — empty state', () => {
  afterEach(() => cleanup())

  it('renders empty state message when no tasks are provided', () => {
    render(<GanttGrid tasks={[]} obraStartDate="2026-04-06" selectedTaskId={null} onSelectTask={noop} />)

    expect(screen.getByText('Todavía no hay tareas cargadas.')).toBeTruthy()
    expect(screen.getByText('La línea de tiempo aparece acá cuando cargues tareas.')).toBeTruthy()
  })

  it('does NOT render any scrollbar controls in empty state', () => {
    render(<GanttGrid tasks={[]} obraStartDate="2026-04-06" selectedTaskId={null} onSelectTask={noop} />)

    // No custom scrollbar elements
    const scrollbarThumb = document.querySelector('.bg-slate-400')
    expect(scrollbarThumb).toBeNull()
  })
})
