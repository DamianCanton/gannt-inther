'use client'

import { useEffect, useRef } from 'react'

import { useToast } from '@/components/ui/toast'

import type { GanttMutationError } from './gantt-types'

export interface GanttAlertsProps {
  cycleWarning: string | null
  saveError: GanttMutationError | null
  isMutating: boolean
  blockingError?: string | null
}

export function GanttAlerts({
  cycleWarning,
  saveError,
  isMutating,
  blockingError = null,
}: GanttAlertsProps) {
  const { toast } = useToast()
  const cycleWarningShown = useRef<string | null>(null)
  const saveErrorShown = useRef<string | null>(null)
  const blockingErrorShown = useRef<string | null>(null)
  const mutatingShown = useRef(false)

  useEffect(() => {
    if (blockingError && blockingErrorShown.current !== blockingError) {
      blockingErrorShown.current = blockingError
      toast({
        variant: 'error',
        title: 'Bloqueo del cronograma',
        description: blockingError,
      })
    }

    if (!blockingError) {
      blockingErrorShown.current = null
    }
  }, [blockingError, toast])

  useEffect(() => {
    if (cycleWarning && cycleWarningShown.current !== cycleWarning) {
      cycleWarningShown.current = cycleWarning
      toast({
        variant: 'error',
        title: 'Dependencia circular detectada',
        description: cycleWarning,
      })
    }

    if (!cycleWarning) {
      cycleWarningShown.current = null
    }
  }, [cycleWarning, toast])

  useEffect(() => {
    if (saveError && saveErrorShown.current !== saveError.message) {
      saveErrorShown.current = saveError.message
      toast({
        variant: 'error',
        title: 'No se pudo guardar el cronograma',
        description: saveError.message,
      })
    }

    if (!saveError) {
      saveErrorShown.current = null
    }
  }, [saveError, toast])

  useEffect(() => {
    if (isMutating && !mutatingShown.current) {
      mutatingShown.current = true
      toast({
        variant: 'info',
        title: 'Guardando cambios en el cronograma',
        duration: 1800,
      })
    }

    if (!isMutating) {
      mutatingShown.current = false
    }
  }, [isMutating, toast])

  return null
}
