'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ObraDTO } from '@/types/gantt'

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
  return (
    <Card className="group relative overflow-hidden border-gray-200/80 shadow-xs hover:shadow-sm hover:border-primary/20 transition-all duration-200">
      <Link
        href={`/obra/${obra.id}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-lg -m-1 p-1"
        tabIndex={disabled ? -1 : undefined}
      >
        {/* Accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <h2 className="text-[15px] font-semibold tracking-tight text-gray-900 leading-snug">
          {obra.nombre}
        </h2>

        <div className="mt-2.5 flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-gray-100/80 px-2 py-0.5 text-[11px] font-medium text-gray-600 tracking-wide uppercase">
            {obra.tipoObra}
          </span>
          <span className="text-[13px] text-gray-500 tabular-nums">
            {obra.taskCount} {obra.taskCount === 1 ? 'tarea' : 'tareas'}
          </span>
        </div>

        {obra.cliente && (
          <p className="mt-2.5 text-[13px] text-gray-500 leading-relaxed">
            <span className="text-gray-400">Cliente</span>
            <span className="mx-1.5 text-gray-300">·</span>
            {obra.cliente}
          </p>
        )}

        <p className="mt-2 text-[12px] text-gray-400 tabular-nums">
          Inicio: {obra.fechaInicioGlobal}
        </p>
      </Link>

      <div className="mt-4 pt-3.5 border-t border-gray-100">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-[13px] text-gray-500 hover:text-red-600 hover:bg-red-50/80"
          disabled={disabled}
          onClick={() => onDelete(obra.id)}
        >
          Eliminar obra
        </Button>
      </div>
    </Card>
  )
}
