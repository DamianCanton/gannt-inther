import { describe, expect, it } from 'vitest'

import {
  TASK_NAME_COLUMN_MAX_PX,
  TASK_NAME_COLUMN_MIN_PX,
  calculateTaskNameColumnWidth,
} from '@/components/gantt/export/GanttExportSurface'

describe('gantt export sizing helpers', () => {
  it('returns the minimum task column width for short names', () => {
    const width = calculateTaskNameColumnWidth([{ nombre: 'A' }, { nombre: 'B' }])

    expect(width).toBe(TASK_NAME_COLUMN_MIN_PX)
  })

  it('grows task column width for longer labels while keeping it under max clamp', () => {
    const width = calculateTaskNameColumnWidth([
      { nombre: 'Movimiento de suelo y preparación del terreno' },
      { nombre: 'Instalación eléctrica principal' },
    ])

    expect(width).toBeGreaterThan(TASK_NAME_COLUMN_MIN_PX)
    expect(width).toBeLessThan(TASK_NAME_COLUMN_MAX_PX)
  })

  it('caps the task column width at the max clamp for very long labels', () => {
    const width = calculateTaskNameColumnWidth([
      {
        nombre:
          'Tarea extremadamente larga para validar que el ancho no se descontrole y se mantenga legible en exportaciones PDF automáticas sin romper A4'.repeat(
            3
          ),
      },
    ])

    expect(width).toBe(TASK_NAME_COLUMN_MAX_PX)
  })
})
