'use server'

import { requireAdmin } from '@/lib/auth/guards'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'

export type ActionResult = {
  success: boolean
  error?: string
}

export type GlobalRole = 'member' | 'admin'
export type ProjectMembershipRole = 'member' | 'admin'
export type ObraMembershipRole = 'viewer' | 'editor'

export type ProjectAssignment = {
  projectId: string
  role: ProjectMembershipRole
}

export type ObraAssignment = {
  obraId: string
  role: ObraMembershipRole
}

export type AdminUserRecord = {
  userId: string
  email: string
  displayName: string
  globalRole: GlobalRole
  isActive: boolean
  projects: ProjectAssignment[]
  obras: Array<ObraAssignment & { obraNombre: string }>
}

export type AdminProjectRecord = {
  projectId: string
  nombre: string
  userCount: number
  obraCount: number
}

export type AdminObraRecord = {
  obraId: string
  nombre: string
  projectId: string
}

export type AdminCatalog = {
  projects: AdminProjectRecord[]
  obras: AdminObraRecord[]
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

function isGlobalRole(role: string): role is GlobalRole {
  return role === 'member' || role === 'admin'
}

function isProjectRole(role: string): role is ProjectMembershipRole {
  return role === 'member' || role === 'admin'
}

function isObraRole(role: string): role is ObraMembershipRole {
  return role === 'viewer' || role === 'editor'
}

async function hasProjectAccess(userId: string, projectId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('project_memberships')
    .select('project_id')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .maybeSingle<{ project_id: string }>()

  if (error) {
    throw new Error(error.message)
  }

  return Boolean(data)
}

async function resolveObraProjectId(obraId: string): Promise<string> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('obras')
    .select('project_id')
    .eq('id', obraId)
    .maybeSingle<{ project_id: string }>()

  if (error || !data?.project_id) {
    throw new Error('OBRA_NOT_FOUND')
  }

  return data.project_id
}

async function assignProjectInternal(userId: string, projectId: string, role: ProjectMembershipRole): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('project_memberships')
    .upsert(
      {
        user_id: userId,
        project_id: projectId,
        role,
      },
      { onConflict: 'project_id,user_id' }
    )

  if (error) {
    throw new Error(error.message)
  }
}

async function assignObraInternal(
  userId: string,
  obraId: string,
  role: ObraMembershipRole,
  createdBy: string
): Promise<void> {
  const projectId = await resolveObraProjectId(obraId)
  const alreadyHasProjectAccess = await hasProjectAccess(userId, projectId)
  if (alreadyHasProjectAccess) {
    return
  }

  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('obra_memberships')
    .upsert(
      {
        user_id: userId,
        obra_id: obraId,
        role,
        created_by: createdBy,
      },
      { onConflict: 'user_id,obra_id' }
    )

  if (error) {
    throw new Error(error.message)
  }
}

export async function createUser(
  email: string,
  password: string,
  displayName: string,
  globalRole: GlobalRole,
  projectAssignments: ProjectAssignment[],
  obraAssignments: ObraAssignment[]
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    if (!isValidEmail(email) || password.length < 6 || !displayName.trim() || !isGlobalRole(globalRole)) {
      return { success: false, error: 'VALIDATION_ERROR' }
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName.trim(),
      },
    })

    if (error || !data.user) {
      return { success: false, error: error?.message ?? 'CREATE_USER_FAILED' }
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        user_id: data.user.id,
        email,
        display_name: displayName.trim(),
        global_role: globalRole,
        is_active: true,
      },
      { onConflict: 'user_id' }
    )

    if (profileError) {
      return { success: false, error: profileError.message }
    }

    for (const assignment of projectAssignments) {
      if (!isProjectRole(assignment.role)) {
        return { success: false, error: 'VALIDATION_ERROR' }
      }
      await assignProjectInternal(data.user.id, assignment.projectId, assignment.role)
    }

    for (const assignment of obraAssignments) {
      if (!isObraRole(assignment.role)) {
        return { success: false, error: 'VALIDATION_ERROR' }
      }
      await assignObraInternal(data.user.id, assignment.obraId, assignment.role, admin.userId)
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'CREATE_USER_FAILED' }
  }
}

export async function assignProject(
  userId: string,
  projectId: string,
  role: ProjectMembershipRole
): Promise<ActionResult> {
  try {
    await requireAdmin()

    if (!userId || !projectId || !isProjectRole(role)) {
      return { success: false, error: 'VALIDATION_ERROR' }
    }

    await assignProjectInternal(userId, projectId, role)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'ASSIGN_PROJECT_FAILED' }
  }
}

export async function assignObra(
  userId: string,
  obraId: string,
  role: ObraMembershipRole
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    if (!userId || !obraId || !isObraRole(role)) {
      return { success: false, error: 'VALIDATION_ERROR' }
    }

    await assignObraInternal(userId, obraId, role, admin.userId)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'ASSIGN_OBRA_FAILED' }
  }
}

export async function updateUserRole(userId: string, newRole: GlobalRole): Promise<ActionResult> {
  try {
    await requireAdmin()

    if (!userId || !isGlobalRole(newRole)) {
      return { success: false, error: 'VALIDATION_ERROR' }
    }

    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('profiles')
      .update({ global_role: newRole })
      .eq('user_id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'UPDATE_ROLE_FAILED' }
  }
}

export async function deactivateUser(userId: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    if (!userId) {
      return { success: false, error: 'VALIDATION_ERROR' }
    }

    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('user_id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'DEACTIVATE_FAILED' }
  }
}

export async function listUsersForAdmin(): Promise<AdminUserRecord[]> {
  await requireAdmin()
  const supabase = createServerClient()

  const [{ data: profilesData, error: profilesError }, { data: projectMembershipsData, error: projectMembershipsError }, { data: obraMembershipsData, error: obraMembershipsError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('user_id, email, display_name, global_role, is_active')
      .returns<Array<{ user_id: string; email: string; display_name: string; global_role: GlobalRole; is_active: boolean }>>(),
    supabase
      .from('project_memberships')
      .select('user_id, project_id, role')
      .returns<Array<{ user_id: string; project_id: string; role: ProjectMembershipRole }>>(),
    supabase
      .from('obra_memberships')
      .select('user_id, obra_id, role')
      .returns<Array<{ user_id: string; obra_id: string; role: ObraMembershipRole }>>(),
  ])

  if (profilesError || projectMembershipsError || obraMembershipsError) {
    return []
  }

  const obraIds = Array.from(new Set((obraMembershipsData ?? []).map((membership) => membership.obra_id)))
  const obrasById = new Map<string, string>()

  if (obraIds.length > 0) {
    const { data: obrasData, error: obrasError } = await supabase
      .from('obras')
      .select('id, nombre')
      .in('id', obraIds)
      .returns<Array<{ id: string; nombre: string }>>()

    if (!obrasError) {
      for (const obra of obrasData ?? []) {
        obrasById.set(obra.id, obra.nombre)
      }
    }
  }

  return (profilesData ?? []).map((profile) => {
    const userId = profile.user_id

    const projects = (projectMembershipsData ?? [])
      .filter((membership) => membership.user_id === userId)
      .map((membership) => ({ projectId: membership.project_id, role: membership.role }))

    const obras = (obraMembershipsData ?? [])
      .filter((membership) => membership.user_id === userId)
      .map((membership) => ({
        obraId: membership.obra_id,
        obraNombre: obrasById.get(membership.obra_id) ?? membership.obra_id,
        role: membership.role,
      }))

    return {
      userId,
      email: profile.email,
      displayName: profile.display_name,
      globalRole: profile.global_role,
      isActive: profile.is_active,
      projects,
      obras,
    }
  })
}

export async function listAdminCatalog(): Promise<AdminCatalog> {
  await requireAdmin()

  const supabase = createServerClient()

  const [projectsResult, projectMembershipsResult, obrasResult] = await Promise.all([
    supabase.from('projects').select('id, nombre').returns<Array<{ id: string; nombre: string }>>(),
    supabase
      .from('project_memberships')
      .select('user_id, project_id')
      .returns<Array<{ user_id: string; project_id: string }>>(),
    supabase.from('obras').select('id, nombre, project_id').returns<Array<{ id: string; nombre: string; project_id: string }>>(),
  ])

  if (projectsResult.error || projectMembershipsResult.error || obrasResult.error) {
    return { projects: [], obras: [] }
  }

  const projects = projectsResult.data ?? []
  const obras = obrasResult.data ?? []
  const memberships = projectMembershipsResult.data ?? []

  const projectsWithStats = projects.map((project) => ({
    projectId: project.id,
    nombre: project.nombre,
    userCount: memberships.filter((item) => item.project_id === project.id).length,
    obraCount: obras.filter((obra) => obra.project_id === project.id).length,
  }))

  return {
    projects: projectsWithStats,
    obras: obras.map((obra) => ({
      obraId: obra.id,
      nombre: obra.nombre,
      projectId: obra.project_id,
    })),
  }
}
