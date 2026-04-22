'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { AlertTriangle, FileText, Plus, Search } from 'lucide-react'

import { deleteObraAction } from '@/app/(routes)/obras/actions'
import { CreateObraForm } from '@/components/gantt/create-obra-form'
import { DeleteObraDialog } from '@/components/gantt/delete-dialog'
import { ObraCard } from '@/components/gantt/obra-card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { ActionResponse } from '@/app/(routes)/obras/actions'
import type { ObraDTO } from '@/types/gantt'

export interface ObraListClientProps {
  /** Datos iniciales obtenidos por el Server Component */
  initialObras: ObraDTO[]
  /** Server Action para crear obras */
  createAction: (formData: FormData) => Promise<ActionResponse>
}

/**
 * Contenedor client-side que gestiona búsqueda local, filtrado y
 * orchestración de mutaciones (crear/eliminar) con pending states.
 *
 * El filtrado es instantáneo — no dispara roundtrips al servidor.
 */
export function ObraListClient({ initialObras, createAction }: ObraListClientProps) {
  const router = useRouter()
  const [obras, setObras] = useState<ObraDTO[]>(initialObras)
  const [searchTerm, setSearchTerm] = useState('')
  const [obraToDelete, setObraToDelete] = useState<ObraDTO | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Derived state — filtered obras calculated during render
  const filteredObras = useMemo(() => {
    if (!searchTerm.trim()) return obras
    const term = searchTerm.toLowerCase()
    return obras.filter(
      (obra) =>
        obra.nombre.toLowerCase().includes(term) ||
        (obra.cliente?.toLowerCase().includes(term) ?? false)
    )
  }, [obras, searchTerm])

  const handleDeleteRequest = useCallback((obraId: string) => {
    const obra = obras.find((o) => o.id === obraId)
    if (obra) {
      setObraToDelete(obra)
      setDeleteError(null)
    }
  }, [obras])

  const handleDeleteConfirm = useCallback(async () => {
    if (!obraToDelete) return

    setIsDeleting(true)
    setDeleteError(null)

    const formData = new FormData()
    formData.set('obraId', obraToDelete.id)

    const result = await deleteObraAction(formData)

    setIsDeleting(false)

    if (!result.success) {
      const messages: Record<string, string> = {
        VALIDATION_ERROR: 'ID de obra inválido.',
        NO_PROJECT_MEMBERSHIP: 'No tenés permisos para eliminar obras.',
        FORBIDDEN_OR_NOT_FOUND: 'No existe la obra o no tenés acceso.',
        ATOMIC_WRITE_FAILED: 'No se pudo eliminar. Intentá nuevamente.',
        UNAUTHENTICATED: 'Debés iniciar sesión para continuar.',
      }
      setDeleteError(messages[result.error ?? ''] ?? 'Error inesperado al eliminar.')
      return
    }

    // Optimistic update — remove from local state
    setObras((prev) => prev.filter((o) => o.id !== obraToDelete.id))
    setObraToDelete(null)
  }, [obraToDelete])

  const handleDeleteCancel = useCallback(() => {
    setObraToDelete(null)
    setDeleteError(null)
  }, [])

  const handleCreateSuccess = useCallback(() => {
    setIsCreateModalOpen(false)
    router.refresh()
  }, [router])

  return (
    <div className="space-y-6">
      {/* Toolbar: Search + Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Search */}
        <div className="relative max-w-sm flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
            strokeWidth={2}
          />
          <Input
            type="search"
            placeholder="Buscar por nombre o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar obras"
            className="pl-9 border-gray-200/80 bg-white shadow-xs focus-visible:ring-primary/30 focus-visible:border-primary/50 text-[13px]"
          />
        </div>

        {/* Create Button + Count */}
        <div className="flex items-center gap-3">
          {filteredObras.length > 0 && (
            <span className="text-[12px] text-gray-400 font-medium tabular-nums tracking-wide">
              {filteredObras.length} {filteredObras.length === 1 ? 'obra' : 'obras'}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white shadow-xs hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Crear diagrama nuevo
          </button>
        </div>
      </div>

      {/* Results — Grilla como protagonista */}
      {filteredObras.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-16 text-center">
          {searchTerm ? (
            <div className="space-y-2">
              <Search className="mx-auto h-8 w-8 text-gray-300" strokeWidth={1.5} />
              <p className="text-[13px] text-gray-500">
                No se encontraron obras con &quot;<span className="font-medium text-gray-700">{searchTerm}</span>&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <FileText className="mx-auto h-10 w-10 text-gray-300" strokeWidth={1.5} />
              <p className="text-[14px] font-medium text-gray-600">
                No hay obras creadas
              </p>
              <p className="text-[13px] text-gray-400">
                Creá tu primer diagrama haciendo clic en &quot;Crear diagrama nuevo&quot;.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-2 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-[13px] font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                Crear diagrama nuevo
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredObras.map((obra) => (
            <ObraCard
              key={obra.id}
              obra={obra}
              onDelete={handleDeleteRequest}
              disabled={isDeleting}
            />
          ))}
        </div>
      )}

      {/* Create Obra Modal */}
      <Dialog
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Crear diagrama nuevo"
        className="max-w-xl"
      >
        <CreateObraForm
          action={createAction}
          disabled={isDeleting}
          onSuccess={handleCreateSuccess}
        />
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {obraToDelete && (
        <DeleteObraDialog
          obraName={obraToDelete.nombre}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isPending={isDeleting}
        />
      )}

      {/* Delete Error */}
      {deleteError && !obraToDelete && (
        <div className="rounded-lg border border-red-200/80 bg-red-50/50 px-4 py-3 text-[13px] text-red-700 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" strokeWidth={2} />
          <span>{deleteError}</span>
        </div>
      )}
    </div>
  )
}
