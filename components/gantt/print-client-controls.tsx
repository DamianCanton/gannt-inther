'use client'

import { useState } from 'react'
import { FileDown, Image as ImageIcon, Printer } from 'lucide-react'
import { exportToJpg } from './export/exportToJpg'
import { exportToPdf } from './export/exportToPdf'
import { exportToPng } from './export/exportToPng'

export interface PrintClientControlsProps {
  readySelector?: string
}

const DEFAULT_READY_SELECTOR = '[data-export-surface="true"]'
const EXPORT_MARGIN_PX = 40
const AUTO_PDF_RIGHT_MARGIN_PX = 32

function sanitizeFilenameSegment(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

export function PrintClientControls({
  readySelector = DEFAULT_READY_SELECTOR,
}: PrintClientControlsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)

  const getExportNode = () => document.querySelector<HTMLElement>(readySelector)

  async function runExport(action: 'png' | 'jpg' | 'pdf-dynamic' | 'pdf-a4') {
    const exportNode = getExportNode()
    if (!exportNode) {
      setWarningMessage('Todavía no encontramos la superficie de exportación. Probá en unos segundos.')
      return
    }

    const obraName = exportNode.dataset.obraName || 'obra'
    const baseName = sanitizeFilenameSegment(obraName)
    const safeFilename = `gantt-${baseName || 'obra'}`

    setIsExporting(true)
    setWarningMessage(null)

    try {
      if (action === 'png') {
        await exportToPng({ node: exportNode, filename: `${safeFilename}.png`, pixelRatio: 3, marginPx: EXPORT_MARGIN_PX })
      }

      if (action === 'jpg') {
        await exportToJpg({ node: exportNode, filename: `${safeFilename}.jpg`, pixelRatio: 3, marginPx: EXPORT_MARGIN_PX })
      }

      if (action === 'pdf-dynamic') {
        await exportToPdf({
          node: exportNode,
          filename: `${safeFilename}.pdf`,
          mode: 'dynamic',
          pixelRatio: 2.5,
          marginPx: 0,
          marginsPx: {
            right: AUTO_PDF_RIGHT_MARGIN_PX,
          },
        })
      }

      if (action === 'pdf-a4') {
        const result = await exportToPdf({
          node: exportNode,
          filename: `${safeFilename}.pdf`,
          mode: 'a4-landscape',
          pixelRatio: 2,
          marginPx: EXPORT_MARGIN_PX,
        })

        if (result.warned) {
          setWarningMessage('El PDF A4 se comprimió para entrar. Para máxima legibilidad usá “PDF tamaño automático”.')
        }
      }
    } catch {
      setWarningMessage('No pudimos completar la exportación. Reintentá o usá la impresión nativa de compatibilidad.')
    } finally {
      setIsExporting(false)
      setIsMenuOpen(false)
    }
  }

  return (
    <div className="no-print mb-4 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>Elegí un formato de exportación profesional. El PDF ya no depende de la impresión del navegador.</p>
        <div className="relative flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isExporting}
            onClick={() => {
              setIsMenuOpen((previous) => !previous)
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            aria-expanded={isMenuOpen}
            aria-controls="print-export-menu"
          >
            <FileDown size={16} />
            {isExporting ? 'Exportando…' : 'Exportar'}
          </button>

          {isMenuOpen ? (
            <div
              id="print-export-menu"
              className="absolute right-0 top-12 z-20 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
            >
              <p className="px-3 pb-2 text-xs text-slate-500">
                Usá PDF automático para diagramas largos. A4 puede reducir legibilidad.
              </p>
              <button
                type="button"
                onClick={() => runExport('png')}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <ImageIcon size={15} /> PNG alta resolución
              </button>
              <button
                type="button"
                onClick={() => runExport('jpg')}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <ImageIcon size={15} /> JPG
              </button>
              <button
                type="button"
                onClick={() => runExport('pdf-dynamic')}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <span className="inline-flex items-center gap-2">
                  <FileDown size={15} /> PDF tamaño automático
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Recomendado
                </span>
              </button>
              <button
                type="button"
                onClick={() => runExport('pdf-a4')}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <FileDown size={15} /> PDF A4 horizontal
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => window.print()}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
              >
                <Printer size={15} /> Impresión nativa (compatibilidad)
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {warningMessage ? <p className="mt-2 text-xs text-amber-700">{warningMessage}</p> : null}
    </div>
  )
}
