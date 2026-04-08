import { createServerClient } from '@/lib/supabase/server'
import { createScheduleWithDetails } from '@/lib/gantt-scheduler'
import { GanttRepo, RepoAccessError } from '@/lib/repositories/gantt-repo'
import { GanttInteractive } from '@/components/gantt'
import { AuthContextError } from '@/lib/auth/auth-context'
import { ensureObraAccess } from '@/lib/auth/guards'
import { notFound, redirect } from 'next/navigation'
import { mutateTask } from './actions'
import type { GanttEditIntent } from '@/components/gantt/gantt-types'

export default async function ObraPage({ params }: { params: { id: string } }) {
  try {
    const auth = await ensureObraAccess(params.id)
    const supabase = createServerClient()
    const repo = new GanttRepo(supabase)

    // Fetch obra schedule (includes holidays)
    const obra = await repo.getObraSchedule({ projectId: auth.projectId, obraId: params.id })
    const scheduleResult = createScheduleWithDetails({
      tasks: obra.tasks,
      dependencies: obra.dependencies,
      obraStartDate: obra.obra.fechaInicioGlobal,
      holidays: obra.holidays,
    })

    const initialSchedule = scheduleResult.tasks

    return (
      <GanttInteractive
        obraNombre={obra.obra.nombre}
        projectId={obra.obra.projectId}
        obraStartDate={obra.obra.fechaInicioGlobal}
        printHref={`/obra/${params.id}/print`}
        initialSchedule={initialSchedule}
        initialScheduleError={null}
        onMutateTask={async (payload: GanttEditIntent) => {
          'use server'
          return mutateTask({ obraId: params.id, ...payload })
        }}
      />
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

    if (error instanceof Error && error.message.startsWith('CYCLE_DETECTED:')) {
      return (
        <GanttInteractive
          obraNombre="Obra con error de dependencias"
          projectId="forbidden"
          obraStartDate="2026-04-06"
          printHref={`/obra/${params.id}/print`}
          initialSchedule={[]}
          initialScheduleError={`Dependencia circular detectada: ${error.message.replace('CYCLE_DETECTED:', '').split('->').join(' -> ')}`}
          onMutateTask={async () => ({
            error: {
              code: 'DEPENDENCY_CYCLE',
              message: 'No se puede guardar hasta corregir la dependencia circular.',
            },
          })}
        />
      )
    }

    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-red-600">
          Error cargando obra: {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    )
  }
}
