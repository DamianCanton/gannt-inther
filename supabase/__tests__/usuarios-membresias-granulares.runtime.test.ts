import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type RuntimeUser = {
  id: string
  email: string
  password: string
}

type RuntimeFixture = {
  adminClient: SupabaseClient
  users: {
    projectMember: RuntimeUser
    obraViewer: RuntimeUser
    obraEditor: RuntimeUser
    inactiveEditor: RuntimeUser
  }
  projectId: string
  secondProjectId: string
  obraId: string
  secondObraId: string
  editableTaskId: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const runtimeEnabled = process.env.ENABLE_SUPABASE_RLS_RUNTIME_TESTS === 'true'

const canRunRuntimeSuite = Boolean(runtimeEnabled && supabaseUrl && anonKey && serviceRoleKey)
const describeRuntime = canRunRuntimeSuite ? describe : describe.skip

function createAuthedClient(email: string, password: string): Promise<SupabaseClient> {
  if (!supabaseUrl || !anonKey) {
    throw new Error('RUNTIME_SUPABASE_ENV_MISSING')
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return client.auth.signInWithPassword({ email, password }).then(({ error }) => {
    if (error) {
      throw new Error(`RUNTIME_SIGN_IN_FAILED:${error.message}`)
    }
    return client
  })
}

function assertNoSupabaseError(error: { message?: string } | null, context: string): void {
  if (error) {
    throw new Error(`${context}:${error.message ?? 'unknown error'}`)
  }
}

async function createRuntimeUser(adminClient: SupabaseClient, prefix: string): Promise<RuntimeUser> {
  const idSuffix = crypto.randomUUID().slice(0, 8)
  const email = `${prefix}.${idSuffix}@example.test`
  const password = `P4ss-${idSuffix}!`

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !data.user) {
    throw new Error(`RUNTIME_CREATE_USER_FAILED:${error?.message ?? 'missing user'}`)
  }

  return {
    id: data.user.id,
    email,
    password,
  }
}

describe('usuarios-membresias-granulares runtime prerequisites', () => {
  it('documents runtime suite requirements explicitly', () => {
    expect(runtimeEnabled).toBeTypeOf('boolean')
    expect(
      'Para ejecutar validación RLS real: ENABLE_SUPABASE_RLS_RUNTIME_TESTS=true y envs NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY'
    ).toContain('ENABLE_SUPABASE_RLS_RUNTIME_TESTS=true')
  })
})

describeRuntime('usuarios membresías granulares runtime RLS', () => {
  let fixture: RuntimeFixture

  beforeAll(async () => {
    const adminClient = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const [projectMember, obraViewer, obraEditor, inactiveEditor] = await Promise.all([
      createRuntimeUser(adminClient, 'rls.project.member'),
      createRuntimeUser(adminClient, 'rls.obra.viewer'),
      createRuntimeUser(adminClient, 'rls.obra.editor'),
      createRuntimeUser(adminClient, 'rls.obra.inactive'),
    ])

    const projectId = crypto.randomUUID()
    const secondProjectId = crypto.randomUUID()
    const obraId = crypto.randomUUID()
    const secondObraId = crypto.randomUUID()
    const editableTaskId = crypto.randomUUID()

    const { error: profilesError } = await adminClient.from('profiles').upsert([
      {
        user_id: projectMember.id,
        display_name: 'Project Member',
        global_role: 'member',
        is_active: true,
      },
      {
        user_id: obraViewer.id,
        display_name: 'Obra Viewer',
        global_role: 'member',
        is_active: true,
      },
      {
        user_id: obraEditor.id,
        display_name: 'Obra Editor',
        global_role: 'member',
        is_active: true,
      },
      {
        user_id: inactiveEditor.id,
        display_name: 'Inactive Editor',
        global_role: 'member',
        is_active: false,
      },
    ])
    assertNoSupabaseError(profilesError, 'RUNTIME_PROFILE_UPSERT_FAILED')

    const { error: obrasError } = await adminClient.from('obras').insert([
      {
        id: obraId,
        project_id: projectId,
        nombre: 'RLS obra principal',
        tipo_obra: 'Tipo A',
        fecha_inicio_global: '2026-04-01',
      },
      {
        id: secondObraId,
        project_id: secondProjectId,
        nombre: 'RLS obra secundaria',
        tipo_obra: 'Tipo A',
        fecha_inicio_global: '2026-04-01',
      },
    ])
    assertNoSupabaseError(obrasError, 'RUNTIME_OBRAS_INSERT_FAILED')

    const { error: tareaError } = await adminClient.from('tareas').insert({
      id: editableTaskId,
      project_id: projectId,
      obra_id: obraId,
      nombre: 'Tarea editable',
      duracion_dias: 2,
      depende_de_id: null,
      orden: 1,
    })
    assertNoSupabaseError(tareaError, 'RUNTIME_TAREA_INSERT_FAILED')

    const { error: projectMembershipError } = await adminClient.from('project_memberships').upsert(
      {
        user_id: projectMember.id,
        project_id: projectId,
        role: 'member',
      },
      { onConflict: 'project_id,user_id' }
    )
    assertNoSupabaseError(projectMembershipError, 'RUNTIME_PROJECT_MEMBERSHIP_UPSERT_FAILED')

    const { error: obraMembershipError } = await adminClient.from('obra_memberships').upsert([
      {
        user_id: obraViewer.id,
        obra_id: obraId,
        role: 'viewer',
      },
      {
        user_id: obraEditor.id,
        obra_id: obraId,
        role: 'editor',
      },
      {
        user_id: inactiveEditor.id,
        obra_id: obraId,
        role: 'editor',
      },
    ])
    assertNoSupabaseError(obraMembershipError, 'RUNTIME_OBRA_MEMBERSHIP_UPSERT_FAILED')

    fixture = {
      adminClient,
      users: {
        projectMember,
        obraViewer,
        obraEditor,
        inactiveEditor,
      },
      projectId,
      secondProjectId,
      obraId,
      secondObraId,
      editableTaskId,
    }
  }, 30_000)

  afterAll(async () => {
    if (!fixture) {
      return
    }

    await fixture.adminClient.from('tareas').delete().eq('id', fixture.editableTaskId)
    await fixture.adminClient
      .from('obra_memberships')
      .delete()
      .in('user_id', [
        fixture.users.projectMember.id,
        fixture.users.obraViewer.id,
        fixture.users.obraEditor.id,
        fixture.users.inactiveEditor.id,
      ])
    await fixture.adminClient
      .from('project_memberships')
      .delete()
      .eq('project_id', fixture.projectId)
      .in('user_id', [fixture.users.projectMember.id])
    await fixture.adminClient
      .from('obras')
      .delete()
      .in('id', [fixture.obraId, fixture.secondObraId])

    for (const user of Object.values(fixture.users)) {
      await fixture.adminClient.auth.admin.deleteUser(user.id)
    }
  }, 30_000)

  it('allows obra-only viewer to read only assigned obra and not cross-project data', async () => {
    const viewer = await createAuthedClient(fixture.users.obraViewer.email, fixture.users.obraViewer.password)

    const { data: allowedObra, error: allowedObraError } = await viewer
      .from('obras')
      .select('id')
      .eq('id', fixture.obraId)

    const { data: deniedObra, error: deniedObraError } = await viewer
      .from('obras')
      .select('id')
      .eq('id', fixture.secondObraId)

    expect(allowedObraError).toBeNull()
    expect(allowedObra).toHaveLength(1)
    expect(deniedObraError).toBeNull()
    expect(deniedObra).toHaveLength(0)
  })

  it('grants project membership access without requiring obra-only rows', async () => {
    const projectMember = await createAuthedClient(
      fixture.users.projectMember.email,
      fixture.users.projectMember.password
    )

    const { data, error } = await projectMember
      .from('obras')
      .select('id, project_id')
      .eq('id', fixture.obraId)

    expect(error).toBeNull()
    expect(data).toEqual([
      {
        id: fixture.obraId,
        project_id: fixture.projectId,
      },
    ])
  })

  it('enforces editor vs viewer write rules on tareas', async () => {
    const viewer = await createAuthedClient(fixture.users.obraViewer.email, fixture.users.obraViewer.password)
    const editor = await createAuthedClient(fixture.users.obraEditor.email, fixture.users.obraEditor.password)

    const { data: viewerData, error: viewerError } = await viewer
      .from('tareas')
      .update({ nombre: 'Cambio no autorizado viewer' })
      .eq('id', fixture.editableTaskId)
      .select('id')

    const { data: editorData, error: editorError } = await editor
      .from('tareas')
      .update({ nombre: 'Cambio autorizado editor' })
      .eq('id', fixture.editableTaskId)
      .select('id')

    expect(viewerError).toBeNull()
    expect(viewerData).toHaveLength(0)
    expect(editorError).toBeNull()
    expect(editorData).toHaveLength(1)
  })

  it('blocks inactive users even with existing obra membership', async () => {
    const inactive = await createAuthedClient(
      fixture.users.inactiveEditor.email,
      fixture.users.inactiveEditor.password
    )

    const { data, error } = await inactive.from('obras').select('id').eq('id', fixture.obraId)
    const { data: updateData, error: updateError } = await inactive
      .from('tareas')
      .update({ nombre: 'Intento inactivo' })
      .eq('id', fixture.editableTaskId)
      .select('id')

    expect(error).toBeNull()
    expect(data).toHaveLength(0)
    expect(updateError).toBeNull()
    expect(updateData).toHaveLength(0)
  })
})
