'use server'

import { mutateTask } from './actions'
import type { GanttEditIntent } from '@/components/gantt/gantt-types'
import type { GanttMutationResult } from '@/components/gantt/gantt-types'

/**
 * Server action wrapper for mutations - safe to import in Server Components
 * This file re-exports the core mutation without importing server-only modules directly
 */
export async function handleMutateTask(
  input: GanttEditIntent & { obraId: string }
): Promise<GanttMutationResult> {
  return mutateTask(input)
}
