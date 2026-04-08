import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PrintClientControls } from '@/components/gantt/print-client-controls'

describe('PrintClientControls', () => {
  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('auto-triggers print once when target is render-ready', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined)

    document.body.innerHTML = '<table class="print-gantt-table"></table>'

    render(<PrintClientControls autoPrintTimeoutMs={1000} />)

    await waitFor(() => {
      expect(printSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('shows manual fallback action when timeout elapses', async () => {
    vi.spyOn(window, 'print').mockImplementation(() => undefined)

    render(<PrintClientControls autoPrintTimeoutMs={20} readySelector=".not-rendered" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Imprimir ahora' })).toBeTruthy()
    })
  })

  it('invokes window.print when manual fallback button is clicked', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined)

    render(<PrintClientControls autoPrintTimeoutMs={20} readySelector=".not-rendered" />)

    const manualPrintButton = await screen.findByRole('button', { name: 'Imprimir ahora' })
    fireEvent.click(manualPrintButton)

    expect(printSpy).toHaveBeenCalledTimes(1)
  })
})
