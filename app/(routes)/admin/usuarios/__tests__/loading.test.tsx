import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import Loading from '@/app/(routes)/admin/usuarios/loading'

describe('/admin/usuarios loading', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a loading skeleton with status role', () => {
    render(<Loading />)

    expect(screen.getByRole('status')).toBeTruthy()
  })
})
