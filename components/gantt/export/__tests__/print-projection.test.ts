import { describe, expect, it } from 'vitest'

import { deserializePrintConfig, serializePrintConfig } from '@/components/gantt/print-projection'

describe('print-projection export contract', () => {
  it('preserves selected viewMode when serializing and deserializing print config', () => {
    const encoded = serializePrintConfig({
      selectionMode: 'visible',
      includeOneDayTasks: true,
      expandAllBeforePrint: false,
      visibleTaskIds: ['T1'],
      manualTaskIds: [],
      viewMode: 'monthly',
    } as unknown as Parameters<typeof serializePrintConfig>[0])

    const decoded = deserializePrintConfig(encoded)

    expect((decoded as { viewMode?: string }).viewMode).toBe('monthly')
  })
})
