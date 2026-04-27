import { DEFAULT_PRINT_CONFIG } from './print-projection'
import type { ObraSchedule, PrintConfig } from '@/types/gantt'
import { GanttExportSurface } from './export/GanttExportSurface'

export interface GanttPrintTableProps {
  obra: ObraSchedule
  printConfig?: PrintConfig
}

export function GanttPrintTable({ obra, printConfig = DEFAULT_PRINT_CONFIG }: GanttPrintTableProps) {
  return <GanttExportSurface obra={obra} printConfig={printConfig} />
}
