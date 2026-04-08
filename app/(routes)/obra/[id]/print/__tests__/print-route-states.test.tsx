import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import PrintRouteError from '@/app/(routes)/obra/[id]/print/error'
import LoadingPrintPage from '@/app/(routes)/obra/[id]/print/loading'

describe('/obra/[id]/print route states', () => {
  it('renders loading state for print route', () => {
    render(<LoadingPrintPage />)

    const loadingRegion = screen.getByRole('status')

    expect(loadingRegion).toBeTruthy()
    expect(loadingRegion.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText('Preparando vista de impresión…')).toBeTruthy()
  })

  it('renders recoverable user-safe error state', () => {
    const resetMock = vi.fn()

    render(
      <PrintRouteError
        error={new Error('internal stack details')}
        reset={resetMock}
      />
    )

    expect(screen.getByText('No pudimos abrir la vista de impresión')).toBeTruthy()
    expect(screen.queryByText(/internal stack details/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(resetMock).toHaveBeenCalledTimes(1)
  })
})
