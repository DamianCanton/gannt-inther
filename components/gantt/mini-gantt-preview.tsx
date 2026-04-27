'use client'

import { useMemo } from 'react'

import type { ObraDTO } from '@/types/gantt'

interface MiniGanttPreviewProps {
  obra: ObraDTO
}

type MiniBar = {
  rowId: string
  startColumn: number
  span: number
  tone: 'strong' | 'soft'
  progress: number
}

type MiniRow = {
  id: string
  label: string
  level: 0 | 1
  marker: 'group' | 'task' | 'milestone'
}

const LEFT_COLUMN_WIDTH = 164

const COLUMNS = [
  { key: 'd1', label: '15', month: 'abr' },
  { key: 'd2', label: '16', month: 'abr' },
  { key: 'd3', label: '17', month: 'abr' },
  { key: 'd4', label: '18', month: 'abr' },
  { key: 'd5', label: '19', month: 'abr' },
  { key: 'd6', label: '20', month: 'abr' },
]

const PREVIEW_ROWS: MiniRow[] = [
  { id: 'r1', label: 'Excavación y cimentación', level: 0, marker: 'group' },
  { id: 'r2', label: 'Replanteo inicial', level: 1, marker: 'task' },
  { id: 'r3', label: 'Hormigonado base', level: 1, marker: 'task' },
  { id: 'r4', label: 'Hito: estructura lista', level: 0, marker: 'milestone' },
]

function hashString(value: string): number {
  return value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

function buildBars(seed: number): MiniBar[] {
  const secondStart = (seed % 2) + 1
  const thirdStart = (seed % 3) + 2
  const milestoneStart = (seed % 2) + 4

  return [
    { rowId: 'r1', startColumn: 0, span: 5, tone: 'soft', progress: 0.42 },
    { rowId: 'r2', startColumn: secondStart, span: 3, tone: 'strong', progress: 0.68 },
    { rowId: 'r3', startColumn: thirdStart, span: 2, tone: 'strong', progress: 0.32 },
    { rowId: 'r4', startColumn: milestoneStart, span: 1, tone: 'soft', progress: 1 },
  ]
}

export function MiniGanttPreview({ obra }: MiniGanttPreviewProps) {
  const seed = useMemo(() => hashString(obra.id), [obra.id])
  const bars = useMemo(() => buildBars(seed), [seed])
  const barsByRowId = useMemo(() => new Map(bars.map((bar) => [bar.rowId, bar])), [bars])
  const referenceColumn = (seed % COLUMNS.length) + 1

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-[164px_repeat(6,minmax(0,1fr))] border-b border-slate-200 bg-slate-50/80 text-[10px] text-slate-500">
        <div className="flex items-center gap-1.5 px-3 py-2 font-semibold text-slate-700">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden="true" />
          Tarea
        </div>
        {COLUMNS.map((column, index) => (
          <div
            key={column.key}
            className="border-l border-slate-200 px-1 py-1.5 text-center"
            aria-hidden="true"
          >
            <span className={`font-semibold ${index + 1 === referenceColumn ? 'text-blue-600' : 'text-slate-700'}`}>
              {column.label}
            </span>
            <span className="block text-[9px] uppercase tracking-wide text-slate-400">{column.month}</span>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-[33px] left-[164px] right-0 grid grid-cols-6" aria-hidden="true">
        {COLUMNS.map((column) => (
          <div key={`${column.key}-line`} className="border-l border-slate-100" />
        ))}
        <div
          className="absolute inset-y-0 border-l border-dotted border-blue-300/90"
          style={{ left: `${(referenceColumn / COLUMNS.length) * 100}%` }}
        />
      </div>

      {PREVIEW_ROWS.map((row, index) => {
        const rowBar = barsByRowId.get(row.id)

        return (
          <div
            key={row.id}
            className="relative grid grid-cols-[164px_repeat(6,minmax(0,1fr))] border-b border-slate-100 last:border-b-0"
          >
            <div
              className={`flex items-center gap-1.5 truncate px-3 py-2.5 text-[11px] ${
                row.level === 0 ? 'font-medium text-slate-700' : 'pl-6 text-slate-600'
              }`}
            >
              {row.marker === 'group' ? <span className="text-[9px] text-slate-500">▾</span> : null}
              {row.marker === 'task' ? <span className="h-1.5 w-1.5 rounded-sm bg-slate-400" aria-hidden="true" /> : null}
              {row.marker === 'milestone' ? <span className="text-[10px] text-slate-500">◆</span> : null}
              <span className="truncate">{row.label}</span>
            </div>
            {COLUMNS.map((column) => (
              <div
                key={`${row.id}-${column.key}`}
                className={`h-9 border-l border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
              />
            ))}

            {rowBar ? (
              <>
                <div
                  className={`absolute top-1/2 h-3 -translate-y-1/2 rounded-full ${
                    rowBar.tone === 'strong' ? 'bg-blue-500/90' : 'bg-slate-400/80'
                  } shadow-[0_4px_10px_-5px_rgba(37,99,235,0.55)]`}
                  style={{
                    left: `calc(${LEFT_COLUMN_WIDTH}px + (${rowBar.startColumn} * ((100% - ${LEFT_COLUMN_WIDTH}px) / 6)) + 8px)`,
                    width: `calc((${rowBar.span} * ((100% - ${LEFT_COLUMN_WIDTH}px) / 6)) - 16px)`,
                  }}
                  aria-hidden="true"
                />
                {rowBar.span > 1 ? (
                  <div
                    className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/65"
                    style={{
                      left: `calc(${LEFT_COLUMN_WIDTH}px + (${rowBar.startColumn} * ((100% - ${LEFT_COLUMN_WIDTH}px) / 6)) + 10px)`,
                      width: `calc(((${rowBar.span} * ((100% - ${LEFT_COLUMN_WIDTH}px) / 6)) - 20px) * ${rowBar.progress})`,
                    }}
                    aria-hidden="true"
                  />
                ) : null}
              </>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
