import { DEFAULT_PRINT_CONFIG } from './print-projection'
import type { ObraSchedule, PrintConfig } from '@/types/gantt'
import { PrintTimelineTable } from './print-timeline-table'

export interface GanttPrintTableProps {
  obra: ObraSchedule
  printConfig?: PrintConfig
}

export function GanttPrintTable({ obra, printConfig = DEFAULT_PRINT_CONFIG }: GanttPrintTableProps) {
  return <PrintTimelineTable obra={obra} printConfig={printConfig} />
}
