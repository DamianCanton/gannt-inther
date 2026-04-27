import { beforeEach, describe, expect, it, vi } from 'vitest'

const toPngMock = vi.hoisted(() => vi.fn().mockResolvedValue('data:image/png;base64,mock'))
const addImageMock = vi.hoisted(() => vi.fn())
const saveMock = vi.hoisted(() => vi.fn())
const jsPdfCtorMock = vi.hoisted(() => vi.fn(() => ({ addImage: addImageMock, save: saveMock })))

vi.mock('html-to-image', () => ({
  toPng: toPngMock,
}))

vi.mock('jspdf', () => ({
  default: jsPdfCtorMock,
}))

import { exportToPdf } from '@/components/gantt/export/exportToPdf'

describe('exportToPdf sizing', () => {
  beforeEach(() => {
    toPngMock.mockClear()
    addImageMock.mockClear()
    saveMock.mockClear()
    jsPdfCtorMock.mockClear()
  })

  it('uses node scroll size to avoid clipping in dynamic PDF mode', async () => {
    const node = document.createElement('div')
    node.dataset.exportWidth = '500'
    node.dataset.exportHeight = '300'

    Object.defineProperty(node, 'offsetWidth', { value: 500, configurable: true })
    Object.defineProperty(node, 'offsetHeight', { value: 300, configurable: true })
    Object.defineProperty(node, 'scrollWidth', { value: 534, configurable: true })
    Object.defineProperty(node, 'scrollHeight', { value: 324, configurable: true })

    await exportToPdf({
      node,
      filename: 'gantt.pdf',
      mode: 'dynamic',
      pixelRatio: 2,
      marginPx: 0,
    })

    const options = toPngMock.mock.calls[0]?.[1]

    expect(options?.width).toBe(534)
    expect(options?.height).toBe(324)
    expect(options?.style).toBeUndefined()
  })

  it('applies right-side margin only in dynamic PDF mode when provided', async () => {
    const node = document.createElement('div')
    node.dataset.exportWidth = '500'
    node.dataset.exportHeight = '300'

    Object.defineProperty(node, 'offsetWidth', { value: 500, configurable: true })
    Object.defineProperty(node, 'offsetHeight', { value: 300, configurable: true })
    Object.defineProperty(node, 'scrollWidth', { value: 534, configurable: true })
    Object.defineProperty(node, 'scrollHeight', { value: 324, configurable: true })

    await exportToPdf({
      node,
      filename: 'gantt.pdf',
      mode: 'dynamic',
      pixelRatio: 2,
      marginPx: 0,
      marginsPx: {
        right: 32,
      },
    })

    const options = toPngMock.mock.calls[0]?.[1]

    expect(options?.width).toBe(558)
    expect(options?.height).toBe(324)
    expect(options?.style).toBeUndefined()
  })

  it('preserves explicit margins for A4 export mode capture', async () => {
    const node = document.createElement('div')
    node.dataset.exportWidth = '400'
    node.dataset.exportHeight = '200'

    Object.defineProperty(node, 'offsetWidth', { value: 400, configurable: true })
    Object.defineProperty(node, 'offsetHeight', { value: 200, configurable: true })
    Object.defineProperty(node, 'scrollWidth', { value: 400, configurable: true })
    Object.defineProperty(node, 'scrollHeight', { value: 200, configurable: true })

    await exportToPdf({
      node,
      filename: 'gantt-a4.pdf',
      mode: 'a4-landscape',
      pixelRatio: 2,
      marginPx: 40,
    })

    const options = toPngMock.mock.calls[0]?.[1]

    expect(options?.width).toBe(480)
    expect(options?.height).toBe(280)
    expect(options?.style).toEqual({
      transform: 'translate(40px, 40px)',
      transformOrigin: 'top left',
    })
  })
})
