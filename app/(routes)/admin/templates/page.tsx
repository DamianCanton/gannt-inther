import { AuthContextError, requireAuthContext } from '@/lib/auth/auth-context'
import { redirect } from 'next/navigation'
import { ToastOnMount } from '@/components/ui/toast-on-mount'

import { saveTemplateAction, loadTemplateTasksAction } from './actions'
import { TemplateEditor } from './template-editor'

type TemplatesPageProps = {
  searchParams?: {
    error?: string
  }
}

function getErrorMessage(errorCode?: string): string | null {
  if (!errorCode) return null
  switch (errorCode) {
    case 'VALIDATION_ERROR':
      return 'Revisá los datos antes de guardar.'
    case 'NO_PROJECT_MEMBERSHIP':
      return 'No tenés membresía activa para gestionar plantillas.'
    case 'SAVE_FAILED':
      return 'No se pudo guardar la plantilla. Verificá los datos e intentá de nuevo.'
    default:
      return 'Ocurrió un error inesperado.'
  }
}

export default async function AdminTemplatesPage({ searchParams }: TemplatesPageProps) {
  const actionError = getErrorMessage(searchParams?.error)

  try {
    await requireAuthContext()

    return (
      <main className="min-h-screen bg-slate-50/70 px-6 py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="space-y-2">
            <p className="text-[12px] uppercase tracking-wider text-gray-500">Administración</p>
            <h1 className="text-[40px] font-semibold tracking-tight text-slate-900">Gestión de Plantillas</h1>
            <p className="max-w-2xl text-sm text-gray-600">
              Definí las tareas preestablecidas para cada tipo de obra.
            </p>
          </div>

          {actionError ? (
            <>
              <ToastOnMount variant="error" title="No se pudo abrir la pantalla" description={actionError} />
              <p className="text-sm text-red-700">{actionError}</p>
            </>
          ) : null}

          <TemplateEditor saveAction={saveTemplateAction} loadTasksAction={loadTemplateTasksAction} />
        </div>
      </main>
    )
  } catch (error) {
    if (error instanceof AuthContextError && error.code === 'UNAUTHENTICATED') {
      redirect('/auth/login')
    }

    if (error instanceof AuthContextError && error.code === 'NO_PROJECT_MEMBERSHIP') {
      return (
        <main className="min-h-screen bg-slate-50/70 px-6 py-8">
          <div className="mx-auto max-w-7xl space-y-4">
            <ToastOnMount
              variant="error"
              title="Sin membresía activa"
              description="No tenés membresía activa en ningún proyecto."
            />
            <h1 className="text-[40px] font-semibold tracking-tight text-slate-900">Gestión de Plantillas</h1>
            {actionError ? <p className="text-sm text-red-700">{actionError}</p> : null}
            <p className="text-gray-700">No tenés membresía activa en ningún proyecto.</p>
          </div>
        </main>
      )
    }

    return (
      <main className="min-h-screen bg-slate-50/70 px-6 py-8">
        <div className="mx-auto max-w-7xl space-y-4">
          <ToastOnMount
            variant="error"
            title="Error cargando plantillas"
            description={error instanceof Error ? error.message : 'Error inesperado'}
          />
          <h1 className="text-[40px] font-semibold tracking-tight text-slate-900">Gestión de Plantillas</h1>
          {actionError ? <p className="text-sm text-red-700">{actionError}</p> : null}
          <p className="text-red-600">Error: {error instanceof Error ? error.message : 'Error inesperado'}</p>
        </div>
      </main>
    )
  }
}
