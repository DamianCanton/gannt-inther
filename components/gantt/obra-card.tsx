'use client'

import Link from 'next/link'
import { CalendarDays, Circle, FolderOpen, Trash2, UserRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ObraDTO } from '@/types/gantt'

import { MiniGanttPreview } from './mini-gantt-preview'

type ObraWithOptionalUpdatedAt = ObraDTO & {
  updatedAt?: string | null
}

function formatShortDate(dateIso: string): string {
  const formatter = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const parts = formatter.formatToParts(new Date(`${dateIso}T00:00:00.000Z`))
  const day = parts.find((part) => part.type === 'day')?.value ?? ''
  const month = (parts.find((part) => part.type === 'month')?.value ?? '').replace('.', '')
  const year = parts.find((part) => part.type === 'year')?.value ?? ''

  return [day, month, year].filter(Boolean).join(' ')
}

function getFreshnessLabel(updatedAt?: string | null): string {
  if (!updatedAt) return 'Actualizado hace 2 días'

  const updatedAtDate = new Date(updatedAt)
  if (Number.isNaN(updatedAtDate.getTime())) return 'Actualizado hace 2 días'

  const diffMs = Date.now() - updatedAtDate.getTime()
  if (diffMs <= 0) return 'Actualizado hoy'

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Actualizado hoy'
  if (days === 1) return 'Actualizado hace 1 día'
  return `Actualizado hace ${days} días`
}

export interface ObraCardProps {
  /** Datos serializados de la obra */
  obra: ObraDTO
  /** Handler invocado cuando el usuario solicita eliminar esta obra */
  onDelete: (obraId: string) => void
  /** Deshabilita interacciones mientras una acción mutativa está en curso */
  disabled?: boolean
}

/**
 * Presentational component — renderiza una tarjeta de obra con acciones.
 * No mantiene estado propio ni realiza side-effects; toda interactividad
 * se delega al contenedor padre via callbacks.
 */
export function ObraCard({ obra, onDelete, disabled = false }: ObraCardProps) {
  const formattedStartDate = formatShortDate(obra.fechaInicioGlobal)
  const freshnessLabel = getFreshnessLabel((obra as ObraWithOptionalUpdatedAt).updatedAt)

  return (
    <Card className="group overflow-hidden rounded-2xl border-slate-200 bg-white p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)] transition-all duration-200 hover:border-slate-300 hover:shadow-[0_20px_44px_-30px_rgba(15,23,42,0.4)]">
      <div className="space-y-4">
        <div>
          <h2 className="text-[15px] font-semibold leading-tight tracking-tight text-slate-900">
            {obra.nombre}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              {obra.tipoObra}
            </span>
            <span className="text-[14px] text-slate-500 tabular-nums">
              {obra.taskCount} {obra.taskCount === 1 ? 'tarea' : 'tareas'}
            </span>
          </div>
        </div>

        <div className="space-y-2.5 text-[14px] text-slate-600">
          <p className="flex items-center gap-2.5">
            <UserRound className="h-4 w-4 text-slate-400" strokeWidth={2} aria-hidden="true" />
            <span className="text-slate-500">Cliente</span>
            <span className="font-medium text-slate-700">{obra.cliente ?? 'Sin cliente'}</span>
          </p>
          <p className="flex items-center gap-2.5">
            <CalendarDays className="h-4 w-4 text-slate-400" strokeWidth={2} aria-hidden="true" />
            <span className="text-slate-500">Inicio</span>
            <span className="font-medium text-slate-700">{formattedStartDate}</span>
          </p>
        </div>

        <MiniGanttPreview obra={obra} />

        <div className="space-y-2.5 pt-1">
          <Link
            href={`/obra/${obra.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-[14px] font-medium text-white shadow-[0_8px_20px_-14px_rgba(37,99,235,1)] transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-2"
            tabIndex={disabled ? -1 : undefined}
            aria-label={`Abrir diagrama de ${obra.nombre}`}
          >
            <FolderOpen className="h-4 w-4" strokeWidth={2.2} />
            Abrir diagrama
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-3 text-[14px] text-red-600 hover:border-red-300 hover:bg-red-50/70"
            disabled={disabled}
            onClick={() => onDelete(obra.id)}
            aria-label={`Eliminar obra ${obra.nombre}`}
          >
            <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2} />
            Eliminar obra
          </Button>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="inline-flex items-center gap-2 text-[14px] font-medium text-emerald-600">
            <Circle className="h-2.5 w-2.5 fill-current" strokeWidth={0} aria-hidden="true" />
            Activa
          </span>
          <span className="text-[13px] text-slate-400">{freshnessLabel}</span>
        </div>
      </div>
    </Card>
  )
}
