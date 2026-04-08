import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import LoadingObraGantt from '@/app/(routes)/obra/[id]/loading'

describe('/obra/[id] loading boundary', () => {
  it('renders route-level loading presentation for timeline shell', () => {
    render(<LoadingObraGantt />)

    const loadingRegion = screen.getByRole('status')

    expect(loadingRegion).toBeTruthy()
    expect(screen.getByText('Cargando cronograma de la obra…')).toBeTruthy()
    expect(loadingRegion.getAttribute('aria-busy')).toBe('true')
  })
})
