import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AuthContextError, requireAuthContext } from '@/lib/auth/auth-context'
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createObraAction, deleteObraAction } from './actions'

type ObrasPageProps = {
  searchParams?: {
    error?: string
  }
}

function getErrorMessage(errorCode?: string): string | null {
  if (!errorCode) {
    return null
  }

  switch (errorCode) {
    case 'VALIDATION_ERROR':
      return 'Revisá los datos obligatorios antes de guardar.'
    case 'NO_PROJECT_MEMBERSHIP':
      return 'No tenés membresía activa para gestionar obras.'
    case 'FORBIDDEN_OR_NOT_FOUND':
      return 'No existe la obra solicitada o no tenés acceso para eliminarla.'
    case 'ATOMIC_WRITE_FAILED':
      return 'No se pudo completar la operación. Intentá nuevamente.'
    case 'EMPTY_TEMPLATE':
      return 'No hay plantilla publicada para este tipo de obra. Creá una desde Gestión de Plantillas.'
    default:
      return 'Ocurrió un error inesperado al procesar la operación.'
  }
}

export default async function ObrasPage({ searchParams }: ObrasPageProps) {
  const actionError = getErrorMessage(searchParams?.error)

  try {
    const auth = await requireAuthContext()
    const supabase = createServerClient()

    const { data: obras, error } = await supabase
      .from('obras')
      .select('id, nombre, project_id')
      .eq('project_id', auth.projectId)

    if (error) {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Obras</h1>
          {actionError ? (
            <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {actionError}
            </p>
          ) : null}
          <CreateObraForm />
          <p className="text-red-600">Error cargando obras: {error.message}</p>
        </div>
      )
    }

    if (!obras || obras.length === 0) {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Obras</h1>
          {actionError ? (
            <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {actionError}
            </p>
          ) : null}
          <CreateObraForm />
          <p className="text-gray-600">No hay obras creadas</p>
        </div>
      )
    }
    
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Obras</h1>
        {actionError ? (
          <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {actionError}
          </p>
        ) : null}

        <div className="flex items-center gap-4 mb-6">
          <CreateObraForm />
          <Link
            href="/admin/templates"
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Gestionar plantillas
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {obras.map((obra) => (
            <Card key={obra.id} className="space-y-3">
              <Link href={`/obra/${obra.id}`} className="block hover:opacity-90 transition-opacity">
                <h2 className="text-xl font-semibold">{obra.nombre}</h2>
                <p className="text-gray-600 text-sm">ID: {obra.id}</p>
              </Link>

              <form action={deleteObraAction}>
                <input type="hidden" name="obraId" value={obra.id} />
                <Button type="submit" variant="secondary" className="w-full">
                  Eliminar obra
                </Button>
              </form>
            </Card>
          ))}
        </div>
      </div>
    )
  } catch (error) {
    if (error instanceof AuthContextError && error.code === 'UNAUTHENTICATED') {
      redirect('/auth/login')
    }

    if (error instanceof AuthContextError && error.code === 'NO_PROJECT_MEMBERSHIP') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Obras</h1>
        {actionError ? (
          <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {actionError}
          </p>
        ) : null}
        <p className="text-gray-700">No tenés membresía activa en ningún proyecto.</p>
        <p className="text-gray-600 mt-2">Pedile a un administrador que te asigne acceso.</p>
      </div>
      )
    }

    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Obras</h1>
        {actionError ? (
          <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {actionError}
          </p>
        ) : null}
        <p className="text-red-600">
          Error inesperado: {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    )
  }
}

function CreateObraForm() {
  return (
    <form action={createObraAction} className="mb-6 grid gap-3 rounded border border-gray-200 bg-white p-4 md:grid-cols-2">
      <input
        name="nombre"
        className="rounded border border-gray-300 px-3 py-2"
        placeholder="Nombre de la obra"
        required
      />
      <input
        name="fechaInicioGlobal"
        className="rounded border border-gray-300 px-3 py-2"
        type="date"
        required
      />
      <input
        name="cliente"
        className="rounded border border-gray-300 px-3 py-2"
        placeholder="Cliente (opcional)"
      />
      <select name="tipoObra" className="rounded border border-gray-300 px-3 py-2" defaultValue="Tipo A">
        <option value="Tipo A">Tipo A</option>
        <option value="Tipo B">Tipo B</option>
        <option value="Tipo C">Tipo C</option>
      </select>
      <input
        name="vigenciaTexto"
        className="rounded border border-gray-300 px-3 py-2 md:col-span-2"
        placeholder="Vigencia (opcional)"
      />
      <Button type="submit" className="md:col-span-2">
        Crear obra
      </Button>
    </form>
  )
}
