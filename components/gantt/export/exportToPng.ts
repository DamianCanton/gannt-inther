import { toPng } from 'html-to-image'

interface ExportToPngOptions {
  node: HTMLElement
  filename: string
  pixelRatio?: number
  marginPx?: number
}

const DEFAULT_EXPORT_MARGIN_PX = 32

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export async function exportToPng({
  node,
  filename,
  pixelRatio = 3,
  marginPx = DEFAULT_EXPORT_MARGIN_PX,
}: ExportToPngOptions) {
  const measuredWidthPx = Number(node.dataset.exportWidth || node.offsetWidth)
  const measuredHeightPx = Number(node.dataset.exportHeight || node.offsetHeight)

  const dataUrl = await toPng(node, {
    pixelRatio,
    cacheBust: true,
    backgroundColor: '#ffffff',
    width: measuredWidthPx + marginPx * 2,
    height: measuredHeightPx + marginPx * 2,
    style: {
      transform: `translate(${marginPx}px, ${marginPx}px)`,
      transformOrigin: 'top left',
    },
  })

  downloadDataUrl(dataUrl, filename)
}
