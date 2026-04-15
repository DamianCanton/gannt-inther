import { AuthContextError, requireAuthContext } from '@/lib/auth/auth-context'
import { redirect } from 'next/navigation'

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
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Gestión de Plantillas</h1>
        <p className="text-gray-600 mb-6">
          Definí las tareas preestablecidas para cada tipo de obra.
        </p>

        {actionError ? (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {actionError}
          </div>
        ) : null}

        <TemplateEditor
          saveAction={saveTemplateAction}
          loadTasksAction={loadTemplateTasksAction}
        />
      </div>
    )
  } catch (error) {
    if (error instanceof AuthContextError && error.code === 'UNAUTHENTICATED') {
      redirect('/auth/login')
    }

    if (error instanceof AuthContextError && error.code === 'NO_PROJECT_MEMBERSHIP') {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Gestión de Plantillas</h1>
          {actionError ? (
            <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {actionError}
            </div>
          ) : null}
          <p className="text-gray-700">No tenés membresía activa en ningún proyecto.</p>
        </div>
      )
    }

    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Gestión de Plantillas</h1>
        {actionError ? (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {actionError}
          </div>
        ) : null}
        <p className="text-red-600">
          Error: {error instanceof Error ? error.message : 'Error inesperado'}
        </p>
      </div>
    )
  }
}
