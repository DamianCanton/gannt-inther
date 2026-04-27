import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PrintClientControls } from '@/components/gantt/print-client-controls'

describe('PrintClientControls', () => {
  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('does not auto-trigger native print when target is render-ready', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined)

    document.body.innerHTML = '<div data-export-surface="true"></div>'

    render(<PrintClientControls />)

    expect(printSpy).not.toHaveBeenCalled()
    expect(screen.getByText(/El PDF ya no depende de la impresión del navegador/)).toBeTruthy()
  })

  it('shows native print as a compatibility action inside the export menu', () => {
    vi.spyOn(window, 'print').mockImplementation(() => undefined)

    render(<PrintClientControls readySelector=".not-rendered" />)

    fireEvent.click(screen.getByRole('button', { name: /Exportar/ }))

    expect(screen.getByRole('button', { name: 'Impresión nativa (compatibilidad)' })).toBeTruthy()
  })

  it('invokes window.print only from the native compatibility menu action', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined)

    render(<PrintClientControls readySelector=".not-rendered" />)

    fireEvent.click(screen.getByRole('button', { name: /Exportar/ }))
    const manualPrintButton = screen.getByRole('button', { name: 'Impresión nativa (compatibilidad)' })
    fireEvent.click(manualPrintButton)

    expect(printSpy).toHaveBeenCalledTimes(1)
  })
})
