import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PerfilPageClient } from '@/components/perfil/perfil-page-client'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('react-dom', () => ({
  useFormState: (action: unknown, initialState: unknown) => [initialState, action],
  useFormStatus: () => ({ pending: false }),
}))

vi.mock('@/lib/actions/perfil', () => ({
  changePassword: vi.fn(),
  signout: vi.fn(),
  updateProfile: vi.fn(),
}))

describe('PerfilPageClient', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows admin panel shortcut for admins', () => {
    render(
      <PerfilPageClient
        email="admin@example.com"
        createdAt="hoy"
        lastSignInAt={null}
        displayName="Admin"
        isAdmin
      />
    )

    expect(screen.getByRole('link', { name: 'Panel de administración' })).toBeTruthy()
  })
})
