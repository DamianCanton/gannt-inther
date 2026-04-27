import jsPDF from 'jspdf'
import { toPng } from 'html-to-image'

type PdfMode = 'dynamic' | 'a4-landscape'

interface ExportToPdfOptions {
  node: HTMLElement
  filename: string
  mode: PdfMode
  pixelRatio?: number
  marginPx?: number
  marginsPx?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
}

const PX_TO_PT = 72 / 96
const A4_LANDSCAPE_WIDTH_PT = 841.89
const A4_LANDSCAPE_HEIGHT_PT = 595.28
const DEFAULT_EXPORT_MARGIN_PX = 32

function resolveCaptureDimension(datasetValue: string | undefined, offsetValue: number, scrollValue: number): number {
  const datasetNumber = Number(datasetValue)
  const hasDatasetNumber = Number.isFinite(datasetNumber) && datasetNumber > 0
  const measured = hasDatasetNumber ? Math.max(datasetNumber, offsetValue, scrollValue) : Math.max(offsetValue, scrollValue)

  return Math.ceil(measured)
}

export async function exportToPdf({
  node,
  filename,
  mode,
  pixelRatio = 2,
  marginPx = DEFAULT_EXPORT_MARGIN_PX,
  marginsPx,
}: ExportToPdfOptions): Promise<{ warned: boolean }> {
  const marginTopPx = marginsPx?.top ?? marginPx
  const marginRightPx = marginsPx?.right ?? marginPx
  const marginBottomPx = marginsPx?.bottom ?? marginPx
  const marginLeftPx = marginsPx?.left ?? marginPx

  const measuredWidthPx = resolveCaptureDimension(node.dataset.exportWidth, node.offsetWidth, node.scrollWidth)
  const measuredHeightPx = resolveCaptureDimension(node.dataset.exportHeight, node.offsetHeight, node.scrollHeight)
  const pageContentWidthPx = measuredWidthPx + marginLeftPx + marginRightPx
  const pageContentHeightPx = measuredHeightPx + marginTopPx + marginBottomPx
  const captureStyle =
    marginTopPx > 0 || marginLeftPx > 0
      ? {
          transform: `translate(${marginLeftPx}px, ${marginTopPx}px)`,
          transformOrigin: 'top left' as const,
        }
      : undefined

  const dataUrl = await toPng(node, {
    pixelRatio,
    cacheBust: true,
    backgroundColor: '#ffffff',
    width: pageContentWidthPx,
    height: pageContentHeightPx,
    style: captureStyle,
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
