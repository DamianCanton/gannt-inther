import { describe, expect, it } from 'vitest'

import type { ObraMembership, UserProfile } from '@/types/gantt'

describe('admin membership contracts', () => {
  it('supports obra membership with viewer/editor roles', () => {
    const membership: ObraMembership = {
      id: 'm-1',
      userId: 'u-1',
      obraId: 'o-1',
      role: 'viewer',
      createdAt: '2026-04-28T10:00:00.000Z',
      updatedAt: '2026-04-28T10:00:00.000Z',
    }

    expect(membership.role).toBe('viewer')
  })

  it('requires user profile with active flag and global role', () => {
    const profile: UserProfile = {
      userId: 'u-1',
      displayName: 'Usuario Uno',
      isActive: true,
      globalRole: 'admin',
      createdAt: '2026-04-28T10:00:00.000Z',
      updatedAt: '2026-04-28T10:00:00.000Z',
    }

    expect(profile.isActive).toBe(true)
    expect(profile.globalRole).toBe('admin')
  })
})
