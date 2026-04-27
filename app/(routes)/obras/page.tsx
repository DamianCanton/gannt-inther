import { redirect } from 'next/navigation'

import { ObraListClient } from '@/components/gantt/obra-list-client'
import { AuthContextError, requireAuthContext } from '@/lib/auth/auth-context'
import { GanttRepo } from '@/lib/repositories/gantt-repo'
import { createServerClient } from '@/lib/supabase/server'

import { createObraAction } from './actions'

/**
 * Server Component para /obras.
 *
 * Responsabilidades:
 * 1. Validar sesión y obtener projectId
 * 2. Fetch inicial de obras via GanttRepo (sin roundtrip por tecla)
 * 3. Pasar datos serializados al contenedor client-side
 *
 * NO contiene interactividad directa — todo se delega a ObraListClient.
 */
export default async function ObrasPage() {
  try {
    const auth = await requireAuthContext()
    const supabase = createServerClient()
    const repo = new GanttRepo(supabase)

    const obras = await repo.listObras(auth.projectId)

    return (
      <div className="min-h-screen bg-slate-50/70">
        <div className="py-3 md:py-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[40px] font-semibold tracking-tight text-slate-900">
              Obras
            </h1>
            <p className="mt-2 text-[16px] text-slate-500">
              Gestioná tus obras de construcción y sus cronogramas.
            </p>
          </div>

          <ObraListClient
            initialObras={obras}
            createAction={createObraAction}
          />
        </div>
      </div>
    )
  } catch (error) {
    if (error instanceof AuthContextError && error.code === 'UNAUTHENTICATED') {
      redirect('/auth/login')
    }

    if (error instanceof AuthContextError && error.code === 'NO_PROJECT_MEMBERSHIP') {
      return (
        <div className="min-h-screen bg-slate-50/70">
          <div className="py-3 md:py-4">
            <div className="mb-8">
              <h1 className="text-[40px] font-semibold tracking-tight text-slate-900">
                Obras
              </h1>
            </div>
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-12 text-center">
              <svg
                className="mx-auto h-8 w-8 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              <p className="mt-3 text-[13px] font-medium text-gray-600">
                No tenés membresía activa en ningún proyecto
              </p>
              <p className="mt-1 text-[12px] text-gray-400">
                Pedile a un administrador que te asigne acceso.
              </p>
            </div>
          </div>
        </div>
      )
    }

    // Re-throw to let error.tsx boundary handle unexpected errors
    throw error
  }
}
