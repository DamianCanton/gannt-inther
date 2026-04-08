import { createServerClient } from '@/lib/supabase/server'
import { GanttRepo, RepoAccessError } from '@/lib/repositories/gantt-repo'
import { GanttPrintTable, PrintClientControls } from '@/components/gantt'
import { AuthContextError } from '@/lib/auth/auth-context'
import { ensureObraAccess } from '@/lib/auth/guards'
import { notFound, redirect } from 'next/navigation'

export default async function PrintPage({ params }: { params: { id: string } }) {
  try {
    const auth = await ensureObraAccess(params.id)
    const supabase = createServerClient()
    const repo = new GanttRepo(supabase)

    const obra = await repo.getObraSchedule({ projectId: auth.projectId, obraId: params.id })
    
    if (!obra) {
      notFound()
    }
    
    return (
      <main className="p-4">
        <PrintClientControls />
        <GanttPrintTable obra={obra} />
        <div
          data-testid="print-format-contract"
          className="sr-only"
          data-print-format="A4 landscape"
          data-pagination-safe="true"
        />
      </main>
    )
  } catch (error) {
    if (error instanceof AuthContextError && error.code === 'UNAUTHENTICATED') {
      redirect('/auth/login')
    }

    if (error instanceof AuthContextError && error.code === 'FORBIDDEN_OR_NOT_FOUND') {
      notFound()
    }

    if (error instanceof RepoAccessError) {
      notFound()
    }

    return (
      <div className="mx-auto max-w-2xl p-8">
        <h1 className="mb-4 text-2xl font-bold">No pudimos preparar la impresión</h1>
        <p className="text-sm text-gray-700">
          Ocurrió un problema temporal al cargar esta vista. Volvé a intentar desde la obra o recargá esta página.
        </p>
      </div>
    )
  }
}
