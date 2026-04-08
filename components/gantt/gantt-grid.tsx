import type { IsoDate, ScheduleTask, Uuid } from '@/types/gantt'

import { TaskList } from './task-list'
import { TimelineGrid } from './timeline-grid'

export interface GanttGridProps {
  tasks: ScheduleTask[]
  obraStartDate: IsoDate
  selectedTaskId: Uuid | null
  onSelectTask: (taskId: Uuid) => void
}

export function GanttGrid({ tasks, obraStartDate, selectedTaskId, onSelectTask }: GanttGridProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <TaskList tasks={tasks} selectedTaskId={selectedTaskId} onSelectTask={onSelectTask} />
      <TimelineGrid
        tasks={tasks}
        obraStartDate={obraStartDate}
        selectedTaskId={selectedTaskId}
        onSelectTask={onSelectTask}
      />
    </div>
  )
}
