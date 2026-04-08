import { afterEach, describe, expect, it, vi } from 'vitest'

import { createObraAction, deleteObraAction } from '@/app/(routes)/obras/actions'
import { AuthContextError } from '@/lib/auth/auth-context'
import { RepoAccessError } from '@/lib/repositories/gantt-repo'

const { requireAuthContextMock, createObraMock, deleteObraMock, redirectMock } = vi.hoisted(() => ({
  requireAuthContextMock: vi.fn(),
  createObraMock: vi.fn(),
  deleteObraMock: vi.fn(),
  redirectMock: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`)
  }),
}))

vi.mock('@/lib/auth/auth-context', async () => {
  const actual = await vi.importActual('@/lib/auth/auth-context')
  return {
    ...actual,
    requireAuthContext: requireAuthContextMock,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({ mocked: true }),
}))

vi.mock('@/lib/repositories/gantt-repo', async () => {
  const actual = await vi.importActual('@/lib/repositories/gantt-repo')
  return {
    ...actual,
    GanttRepo: class {
      createObra = createObraMock
      deleteObra = deleteObraMock
    },
  }
})

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

describe('obras actions', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('createObraAction uses auth-derived project scope and redirects to /obras on success', async () => {
    requireAuthContextMock.mockResolvedValue({ userId: 'u1', projectId: 'project-auth' })
    createObraMock.mockResolvedValue('obra-1')

    const formData = new FormData()
    formData.set('nombre', 'Obra nueva')
    formData.set('tipoObra', 'Tipo A')
    formData.set('fechaInicioGlobal', '2026-04-06')

    await expect(createObraAction(formData)).rejects.toThrow('NEXT_REDIRECT:/obras')

    expect(createObraMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-auth',
        input: expect.objectContaining({
          nombre: 'Obra nueva',
          tipoObra: 'Tipo A',
          fechaInicioGlobal: '2026-04-06',
        }),
      })
    )
  })

  it('createObraAction redirects unauthenticated users to login', async () => {
    requireAuthContextMock.mockRejectedValue(new AuthContextError('UNAUTHENTICATED', 'login required'))

    const formData = new FormData()
    formData.set('nombre', 'Obra nueva')
    formData.set('tipoObra', 'Tipo A')
    formData.set('fechaInicioGlobal', '2026-04-06')

    await expect(createObraAction(formData)).rejects.toThrow('NEXT_REDIRECT:/auth/login')
    expect(createObraMock).not.toHaveBeenCalled()
  })

  it('deleteObraAction denies unauthorized scope deletes', async () => {
    requireAuthContextMock.mockResolvedValue({ userId: 'u1', projectId: 'project-auth' })
    deleteObraMock.mockRejectedValue(new RepoAccessError('forbidden'))

    const formData = new FormData()
    formData.set('obraId', 'obra-out-of-scope')

    await expect(deleteObraAction(formData)).rejects.toThrow(
      'NEXT_REDIRECT:/obras?error=FORBIDDEN_OR_NOT_FOUND'
    )

    expect(deleteObraMock).toHaveBeenCalledWith({
      projectId: 'project-auth',
      obraId: 'obra-out-of-scope',
    })
  })

  it('deleteObraAction redirects after successful scoped delete', async () => {
    requireAuthContextMock.mockResolvedValue({ userId: 'u1', projectId: 'project-auth' })
    deleteObraMock.mockResolvedValue(undefined)

    const formData = new FormData()
    formData.set('obraId', 'obra-1')

    await expect(deleteObraAction(formData)).rejects.toThrow('NEXT_REDIRECT:/obras')

    expect(deleteObraMock).toHaveBeenCalledWith({
      projectId: 'project-auth',
      obraId: 'obra-1',
    })
  })
})
