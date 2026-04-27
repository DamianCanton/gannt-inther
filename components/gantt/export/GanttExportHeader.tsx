/* eslint-disable @next/next/no-img-element */
import type { ExportScale } from './GanttExportSurface'

export interface GanttExportHeaderProps {
  obraNombre: string
  cliente: string
  vigencia: string
  totalObraDays: number
  scaleMode: ExportScale
  firstStart: string | null
  lastEnd: string | null
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

const SCALE_LABEL: Record<ExportScale, string> = {
  daily: 'diaria',
  weekly: 'semanal',
  monthly: 'mensual',
}

export function GanttExportHeader({
  obraNombre,
  cliente,
  vigencia,
  totalObraDays,
  scaleMode,
  firstStart,
  lastEnd,
}: GanttExportHeaderProps) {
  return (
    <>
      <header className="print-letterhead">
        <div className="print-letterhead__logo">
          <img
            src="/inther-logo.png"
            alt="INTHER S.R.L. — Aire Acondicionado"
            className="print-letterhead__logo-img"
          />
        </div>
        <div className="print-letterhead__meta">
          <div className="print-letterhead__row">
            <span className="print-letterhead__label">Obra:</span>
            <span className="print-letterhead__value">{obraNombre}</span>
          </div>
          <div className="print-letterhead__row">
            <span className="print-letterhead__label">Cliente:</span>
            <span className="print-letterhead__value">{cliente}</span>
          </div>
          <div className="print-letterhead__row">
            <span className="print-letterhead__label">Vigencia:</span>
            <span className="print-letterhead__value">{vigencia}</span>
          </div>
          <div className="print-letterhead__row">
            <span className="print-letterhead__label">Duración:</span>
            <span className="print-letterhead__value">
              {totalObraDays} días de obra
              <span className="print-letterhead__scale"> · Escala {SCALE_LABEL[scaleMode]}</span>
            </span>
          </div>
        </div>
      </header>

      <div className="print-letterhead__divider" />

      {firstStart && lastEnd ? (
        <div className="print-date-range">
          <span>Desde {formatDate(firstStart)}</span>
          <span className="print-date-range__sep">—</span>
          <span>Hasta {formatDate(lastEnd)}</span>
        </div>
      ) : null}
    </>
  )
}
