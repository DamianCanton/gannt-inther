import jsPDF from 'jspdf'
import { toPng } from 'html-to-image'

type PdfMode = 'dynamic' | 'a4-landscape'

interface ExportToPdfOptions {
  node: HTMLElement
  filename: string
  mode: PdfMode
  pixelRatio?: number
  marginPx?: number
}

const PX_TO_PT = 72 / 96
const A4_LANDSCAPE_WIDTH_PT = 841.89
const A4_LANDSCAPE_HEIGHT_PT = 595.28
const DEFAULT_EXPORT_MARGIN_PX = 32

export async function exportToPdf({
  node,
  filename,
  mode,
  pixelRatio = 2,
  marginPx = DEFAULT_EXPORT_MARGIN_PX,
}: ExportToPdfOptions): Promise<{ warned: boolean }> {
  const measuredWidthPx = Number(node.dataset.exportWidth || node.offsetWidth)
  const measuredHeightPx = Number(node.dataset.exportHeight || node.offsetHeight)
  const pageContentWidthPx = measuredWidthPx + marginPx * 2
  const pageContentHeightPx = measuredHeightPx + marginPx * 2

  const dataUrl = await toPng(node, {
    pixelRatio,
    cacheBust: true,
    backgroundColor: '#ffffff',
    width: pageContentWidthPx,
    height: pageContentHeightPx,
    style: {
      transform: `translate(${marginPx}px, ${marginPx}px)`,
      transformOrigin: 'top left',
    },
  })

  if (mode === 'a4-landscape') {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
      compress: true,
    })

    const ratio = Math.min(
      A4_LANDSCAPE_WIDTH_PT / (pageContentWidthPx * PX_TO_PT),
      A4_LANDSCAPE_HEIGHT_PT / (pageContentHeightPx * PX_TO_PT)
    )

    const imageWidthPt = pageContentWidthPx * PX_TO_PT * ratio
    const imageHeightPt = pageContentHeightPx * PX_TO_PT * ratio
    const offsetX = (A4_LANDSCAPE_WIDTH_PT - imageWidthPt) / 2
    const offsetY = (A4_LANDSCAPE_HEIGHT_PT - imageHeightPt) / 2

    pdf.addImage(dataUrl, 'PNG', offsetX, offsetY, imageWidthPt, imageHeightPt, undefined, 'FAST')
    pdf.save(filename)

    const warned = ratio < 0.75
    return { warned }
  }

  const pageWidthPt = pageContentWidthPx * PX_TO_PT
  const pageHeightPt = pageContentHeightPx * PX_TO_PT

  const pdf = new jsPDF({
    orientation: pageWidthPt >= pageHeightPt ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [pageWidthPt, pageHeightPt],
    compress: true,
  })

  pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidthPt, pageHeightPt, undefined, 'FAST')
  pdf.save(filename)
  return { warned: false }
}
