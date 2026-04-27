import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const exportToPdfMock = vi.hoisted(() => vi.fn().mockResolvedValue({ warned: false }))

vi.mock('@/components/gantt/export/exportToPdf', () => ({
  exportToPdf: exportToPdfMock,
}))

import { PrintClientControls } from '@/components/gantt/print-client-controls'

describe('PrintClientControls', () => {
  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.useRealTimers()
    exportToPdfMock.mockClear()
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

  it('marks PDF auto as the recommended export option', () => {
    document.body.innerHTML = '<div data-export-surface="true"></div>'

    render(<PrintClientControls />)

    fireEvent.click(screen.getByRole('button', { name: /Exportar/ }))

    expect(screen.getByText('PDF tamaño automático')).toBeTruthy()
    expect(screen.getByText('Recomendado')).toBeTruthy()
    expect(screen.getByText(/Usá PDF automático para diagramas largos/)).toBeTruthy()
  })

  it('invokes window.print only from the native compatibility menu action', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined)

    render(<PrintClientControls readySelector=".not-rendered" />)

    fireEvent.click(screen.getByRole('button', { name: /Exportar/ }))
    const manualPrintButton = screen.getByRole('button', { name: 'Impresión nativa (compatibilidad)' })
    fireEvent.click(manualPrintButton)

    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('passes a safe right-side margin only for automatic PDF export', async () => {
    document.body.innerHTML = '<div data-export-surface="true" data-obra-name="Mi Obra"></div>'

    render(<PrintClientControls />)

    fireEvent.click(screen.getByRole('button', { name: /Exportar/ }))
    fireEvent.click(screen.getByRole('button', { name: /PDF tamaño automático/ }))

    await waitFor(() => {
      expect(exportToPdfMock).toHaveBeenCalledTimes(1)
    })

    expect(exportToPdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'dynamic',
        marginPx: 0,
        marginsPx: {
          right: 32,
        },
      })
    )
  })
})
