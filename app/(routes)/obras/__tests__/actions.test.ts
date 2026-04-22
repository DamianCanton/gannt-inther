import { afterEach, describe, expect, it, vi } from 'vitest'

import { createObraAction, deleteObraAction } from '@/app/(routes)/obras/actions'
import { AuthContextError } from '@/lib/auth/auth-context'
import { RepoAccessError } from '@/lib/repositories/gantt-repo'

const {
  requireAuthContextMock,
  getActiveTemplateMock,
  createObraFromTemplateMock,
  deleteObraMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  requireAuthContextMock: vi.fn(),
  getActiveTemplateMock: vi.fn(),
  createObraFromTemplateMock: vi.fn(),
  deleteObraMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}))

vi.mock('@/lib/auth/auth-context', async () => {
  const actual = await vi.importActual('@/lib/auth/auth-context')
  return {
    ...actual,
    requireAuthContext: requireAuthContextMock,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: () => ({
      select: () => ({ data: [], error: null }),
    }),
  }),
}))

vi.mock('@/lib/repositories/gantt-repo', async () => {
  const actual = await vi.importActual('@/lib/repositories/gantt-repo')
  return {
    ...actual,
    GanttRepo: class {
      deleteObra = deleteObraMock
    },
  }
})

vi.mock('@/lib/repositories/template-repo', () => ({
  TemplateRepo: class {
    getActiveTemplate = getActiveTemplateMock
    createObraFromTemplate = createObraFromTemplateMock
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

describe('obras actions', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createObraAction', () => {
    it('returns success and revalidates on successful creation', async () => {
      requireAuthContextMock.mockResolvedValue({ userId: 'u1', projectId: 'project-auth' })
      getActiveTemplateMock.mockResolvedValue([
        {
          id: 'tmpl-1',
          projectId: '00000000-0000-0000-0000-000000000000',
          tipoObra: 'Tipo A',
          version: 1,
          status: 'published',
          nombre: 'Tarea A',
          duracionDias: 2,
          dependeDeTemplateId: null,
          orden: 1,
        },
      ])
      createObraFromTemplateMock.mockResolvedValue('obra-1')

      const formData = new FormData()
      formData.set('nombre', 'Obra nueva')
      formData.set('tipoObra', 'Tipo A')
      formData.set('fechaInicioGlobal', '2026-04-06')

      const result = await createObraAction(formData)

      expect(result).toEqual({ success: true })
      expect(revalidatePathMock).toHaveBeenCalledWith('/obras')
      expect(createObraFromTemplateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-auth',
          nombre: 'Obra Nueva',
          tipoObra: 'Tipo A',
        })
      )
    })

    it('returns UNAUTHENTICATED error for unauthenticated users', async () => {
      requireAuthContextMock.mockRejectedValue(
        new AuthContextError('UNAUTHENTICATED', 'login required')
      )

      const formData = new FormData()
      formData.set('nombre', 'Obra nueva')
      formData.set('tipoObra', 'Tipo A')
      formData.set('fechaInicioGlobal', '2026-04-06')

      const result = await createObraAction(formData)

      expect(result).toEqual({ success: false, error: 'UNAUTHENTICATED' })
      expect(createObraFromTemplateMock).not.toHaveBeenCalled()
      expect(revalidatePathMock).not.toHaveBeenCalled()
    })

    it('returns VALIDATION_ERROR for missing required fields', async () => {
      const formData = new FormData()
      formData.set('nombre', 'Obra nueva')
      // Missing tipoObra and fechaInicioGlobal

      const result = await createObraAction(formData)

      expect(result).toEqual({ success: false, error: 'VALIDATION_ERROR' })
    })

    it('returns EMPTY_TEMPLATE when no template exists', async () => {
      requireAuthContextMock.mockResolvedValue({ userId: 'u1', projectId: 'project-auth' })
      getActiveTemplateMock.mockResolvedValue([])

      const formData = new FormData()
      formData.set('nombre', 'Obra nueva')
      formData.set('tipoObra', 'Tipo A')
      formData.set('fechaInicioGlobal', '2026-04-06')

      const result = await createObraAction(formData)

      expect(result).toEqual({ success: false, error: 'EMPTY_TEMPLATE' })
    })
  })

  describe('deleteObraAction', () => {
    it('returns success and revalidates on successful deletion', async () => {
      requireAuthContextMock.mockResolvedValue({ userId: 'u1', projectId: 'project-auth' })
      deleteObraMock.mockResolvedValue(undefined)

      const formData = new FormData()
      formData.set('obraId', 'obra-1')

      const result = await deleteObraAction(formData)

      expect(result).toEqual({ success: true })
      expect(revalidatePathMock).toHaveBeenCalledWith('/obras')
      expect(deleteObraMock).toHaveBeenCalledWith({
        projectId: 'project-auth',
        obraId: 'obra-1',
      })
    })

    it('returns FORBIDDEN_OR_NOT_FOUND for out-of-scope deletes', async () => {
      requireAuthContextMock.mockResolvedValue({ userId: 'u1', projectId: 'project-auth' })
      deleteObraMock.mockRejectedValue(new RepoAccessError('forbidden'))

      const formData = new FormData()
      formData.set('obraId', 'obra-out-of-scope')

      const result = await deleteObraAction(formData)

      expect(result).toEqual({ success: false, error: 'FORBIDDEN_OR_NOT_FOUND' })
      expect(revalidatePathMock).not.toHaveBeenCalled()
    })

    it('returns VALIDATION_ERROR for missing obraId', async () => {
      const formData = new FormData()
      // Missing obraId

      const result = await deleteObraAction(formData)

      expect(result).toEqual({ success: false, error: 'VALIDATION_ERROR' })
    })
  })
})
