import React from 'react'
import type { ObraSchedule } from '@/types/gantt'

import { PrintTimelineTable } from './print-timeline-table'

export interface GanttPrintTableProps {
  obra: ObraSchedule
}

export function GanttPrintTable({ obra }: GanttPrintTableProps) {
  return <PrintTimelineTable obra={obra} />
}
