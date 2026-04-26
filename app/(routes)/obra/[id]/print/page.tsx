import { createServerClient } from '@/lib/supabase/server'
import { GanttRepo, RepoAccessError } from '@/lib/repositories/gantt-repo'
import { GanttPrintTable, PrintClientControls } from '@/components/gantt'
import { deserializePrintConfig } from '@/components/gantt/print-projection'
import { AuthContextError } from '@/lib/auth/auth-context'
import { ensureObraAccess } from '@/lib/auth/guards'
import { notFound, redirect } from 'next/navigation'

interface PrintPageProps {
  params: { id: string }
  searchParams?: { config?: string }
}

export default async function PrintPage({ params, searchParams }: PrintPageProps) {
  try {
    const auth = await ensureObraAccess(params.id)
    const supabase = createServerClient()
    const repo = new GanttRepo(supabase)

    const obra = await repo.getObraSchedule({ projectId: auth.projectId, obraId: params.id })
    
    if (!obra) {
      notFound()
    }
    
    const printConfig = deserializePrintConfig(searchParams?.config)

    return (
      <main className="p-4">
        <PrintClientControls />
        <GanttPrintTable obra={obra} printConfig={printConfig} />
        <div
          data-testid="print-format-contract"
          className="sr-only"
          data-print-format="auto-fit"
          data-pagination-safe="false"
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
