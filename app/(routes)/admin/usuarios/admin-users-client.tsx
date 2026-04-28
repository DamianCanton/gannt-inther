'use client'

import { useMemo, useState, useTransition } from 'react'

import type {
  ActionResult,
  AdminCatalog,
  AdminUserRecord,
  GlobalRole,
  ObraMembershipRole,
  ProjectMembershipRole,
} from '@/app/actions/users'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

type AdminUsersActions = {
  createUser: (
    email: string,
    password: string,
    displayName: string,
    globalRole: GlobalRole,
    projectAssignments: Array<{ projectId: string; role: ProjectMembershipRole }>,
    obraAssignments: Array<{ obraId: string; role: ObraMembershipRole }>
  ) => Promise<ActionResult>
  assignProject: (userId: string, projectId: string, role: ProjectMembershipRole) => Promise<ActionResult>
  assignObra: (userId: string, obraId: string, role: ObraMembershipRole) => Promise<ActionResult>
  updateUserRole: (userId: string, newRole: GlobalRole) => Promise<ActionResult>
  deactivateUser: (userId: string) => Promise<ActionResult>
}

type CreateFormState = {
  email: string
  password: string
  displayName: string
  globalRole: GlobalRole
}

const INITIAL_CREATE_FORM: CreateFormState = {
  email: '',
  password: '',
  displayName: '',
  globalRole: 'member',
}

function badgeColor(isActive: boolean): string {
  return isActive
    ? 'bg-green-100 text-green-700 border-green-200'
    : 'bg-gray-100 text-gray-700 border-gray-200'
}

function projectLabel(project: AdminCatalog['projects'][number]): string {
  return `${project.nombre} · ${project.projectId}`
}

export function AdminUsersClient({
  users,
  catalog = { projects: [], obras: [] },
  actions,
}: {
  users: AdminUserRecord[]
  catalog?: AdminCatalog
  actions: AdminUsersActions
}) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [accessDialogUserId, setAccessDialogUserId] = useState<string | null>(null)
  const [deactivateUserId, setDeactivateUserId] = useState<string | null>(null)

  const [createForm, setCreateForm] = useState<CreateFormState>(INITIAL_CREATE_FORM)
  const [projectIdInput, setProjectIdInput] = useState('')
  const [projectRoleInput, setProjectRoleInput] = useState<ProjectMembershipRole>('member')
  const [obraIdInput, setObraIdInput] = useState('')
  const [obraRoleInput, setObraRoleInput] = useState<ObraMembershipRole>('viewer')
  const [globalRoleInput, setGlobalRoleInput] = useState<GlobalRole>('member')
  const [createProjectAssignments, setCreateProjectAssignments] = useState<Array<{ projectId: string; role: ProjectMembershipRole }>>([])
  const [createObraAssignments, setCreateObraAssignments] = useState<Array<{ obraId: string; role: ObraMembershipRole }>>([])
  const [createProjectPick, setCreateProjectPick] = useState('')
  const [createProjectPickRole, setCreateProjectPickRole] = useState<ProjectMembershipRole>('member')
  const [createObraPick, setCreateObraPick] = useState('')
  const [createObraPickRole, setCreateObraPickRole] = useState<ObraMembershipRole>('viewer')

  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  const selectedUser = useMemo(
    () => users.find((user) => user.userId === accessDialogUserId) ?? null,
    [accessDialogUserId, users]
  )

  function setError(error: string) {
    setStatusMessage(null)
    setStatusError(error)
  }

  function setSuccess(message: string) {
    setStatusError(null)
    setStatusMessage(message)
  }

  function resetCreateDialog() {
    setCreateForm(INITIAL_CREATE_FORM)
    setCreateProjectAssignments([])
    setCreateObraAssignments([])
    setCreateProjectPick('')
    setCreateObraPick('')
    setCreateDialogOpen(false)
  }

  function openCreateDialog(globalRole: GlobalRole = 'member') {
    setCreateForm({ ...INITIAL_CREATE_FORM, globalRole })
    setCreateDialogOpen(true)
  }

  function onSubmitCreateUser() {
    const email = createForm.email.trim()
    const password = createForm.password
    const displayName = createForm.displayName.trim()

    if (!email.includes('@') || password.length < 6 || !displayName) {
      setError('Completá email y contraseña válidos.')
      return
    }

    startTransition(async () => {
      const result = await actions.createUser(
        email,
        password,
        displayName,
        createForm.globalRole,
        createProjectAssignments,
        createObraAssignments
      )

      if (!result.success) {
        setError(result.error ?? 'No se pudo crear el usuario.')
        return
      }

      setSuccess('Usuario creado correctamente. Actualizá la vista para verlo en la tabla.')
      resetCreateDialog()
    })
  }

  function onAssignProject() {
    if (!selectedUser || !projectIdInput.trim()) {
      setError('Ingresá un projectId válido.')
      return
    }

    startTransition(async () => {
      const result = await actions.assignProject(selectedUser.userId, projectIdInput.trim(), projectRoleInput)
      if (!result.success) {
        setError(result.error ?? 'No se pudo asignar el proyecto.')
        return
      }
      setSuccess('Proyecto asignado correctamente. Actualizá la vista para ver cambios.')
      setProjectIdInput('')
    })
  }

  function onAssignObra() {
    if (!selectedUser || !obraIdInput.trim()) {
      setError('Ingresá un obraId válido.')
      return
    }

    startTransition(async () => {
      const result = await actions.assignObra(selectedUser.userId, obraIdInput.trim(), obraRoleInput)
      if (!result.success) {
        setError(result.error ?? 'No se pudo asignar la obra.')
        return
      }
      setSuccess('Obra asignada correctamente. Actualizá la vista para ver cambios.')
      setObraIdInput('')
    })
  }

  function addCreateProjectAssignment() {
    if (!createProjectPick) {
      setError('Seleccioná un proyecto.')
      return
    }

    setCreateProjectAssignments((current) => [
      ...current.filter((assignment) => assignment.projectId !== createProjectPick),
      { projectId: createProjectPick, role: createProjectPickRole },
    ])
    setCreateProjectPick('')
  }

  function addCreateObraAssignment() {
    if (!createObraPick) {
      setError('Seleccioná una obra.')
      return
    }

    setCreateObraAssignments((current) => [
      ...current.filter((assignment) => assignment.obraId !== createObraPick),
      { obraId: createObraPick, role: createObraPickRole },
    ])
    setCreateObraPick('')
  }

  function onUpdateRole() {
    if (!selectedUser) {
      return
    }

    startTransition(async () => {
      const result = await actions.updateUserRole(selectedUser.userId, globalRoleInput)
      if (!result.success) {
        setError(result.error ?? 'No se pudo actualizar el rol global.')
        return
      }
      setSuccess('Rol global actualizado. Actualizá la vista para ver cambios.')
    })
  }

  function onDeactivateConfirmed() {
    if (!deactivateUserId) {
      return
    }

    startTransition(async () => {
      const result = await actions.deactivateUser(deactivateUserId)
      if (!result.success) {
        setError(result.error ?? 'No se pudo desactivar el usuario.')
        return
      }
      setSuccess('Usuario desactivado correctamente. Actualizá la vista para ver cambios.')
      setDeactivateUserId(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          Gestioná altas, permisos por proyecto/obra y desactivaciones sin borrado físico.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => openCreateDialog('member')}>
            Crear miembro
          </Button>
          <Button variant="secondary" onClick={() => openCreateDialog('admin')}>
            Crear admin
          </Button>
          <Button onClick={() => openCreateDialog('member')}>Crear usuario</Button>
        </div>
      </div>

      {statusMessage ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{statusMessage}</p>
      ) : null}
      {statusError ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{statusError}</p>
      ) : null}
      {isPending ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700" role="status" aria-live="polite">
          Procesando cambio... no cierres esta pantalla.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Catálogo de proyectos</h2>
            <p className="text-xs text-gray-500">Nombre + ID para asignar permisos sin abrir la base.</p>
          </div>
          {catalog.projects.length === 0 ? (
            <p className="text-sm text-gray-500">No hay proyectos para mostrar.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {catalog.projects.map((project) => (
                <li key={project.projectId} className="rounded border border-gray-200 p-3">
                  <div className="font-medium text-gray-900">{project.nombre}</div>
                  <div className="text-xs text-gray-500">ID: {project.projectId}</div>
                  <div className="text-xs text-gray-500">
                    {project.userCount} miembros · {project.obraCount} obras
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-3 p-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Catálogo de obras</h2>
            <p className="text-xs text-gray-500">ID + nombre para que el equipo pueda asignar sin abrir la base.</p>
          </div>
          {catalog.obras.length === 0 ? (
            <p className="text-sm text-gray-500">No hay obras para mostrar.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {catalog.obras.map((obra) => (
                <li key={obra.obraId} className="rounded border border-gray-200 p-3">
                  <div className="font-medium text-gray-900">{obra.nombre}</div>
                  <div className="text-xs text-gray-500">ID: {obra.obraId}</div>
                  <div className="text-xs text-gray-500">Proyecto: {obra.projectId}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {users.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Todavía no hay usuarios para mostrar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Rol global</th>
                <th className="px-4 py-3">Proyectos</th>
                <th className="px-4 py-3">Obras</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.userId} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3 text-gray-900">{user.email}</td>
                  <td className="px-4 py-3">{user.displayName || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="mr-2 rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                      {user.globalRole}
                    </span>
                    <span className={`rounded border px-2 py-0.5 text-xs ${badgeColor(user.isActive)}`}>
                      {user.isActive ? 'activo' : 'inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {user.projects.length === 0
                      ? '—'
                      : user.projects.map((project) => `${project.projectId} (${project.role})`).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {user.obras.length === 0
                      ? '—'
                      : user.obras.map((obra) => `${obra.obraNombre} (${obra.role})`).join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setAccessDialogUserId(user.userId)
                          setGlobalRoleInput(user.globalRole)
                        }}
                      >
                        Gestionar acceso
                      </Button>

                      {user.isActive ? (
                        <Button size="sm" variant="ghost" onClick={() => setDeactivateUserId(user.userId)}>
                          Desactivar
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} title="Crear usuario">
        <div className="space-y-3">
          <Input
            label="Email"
            type="email"
            value={createForm.email}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <Input
            label="Contraseña"
            type="password"
            value={createForm.password}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
          />
          <Input
            label="Nombre"
            value={createForm.displayName}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, displayName: event.target.value }))}
          />

          <Select
            label="Rol global"
            value={createForm.globalRole}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, globalRole: event.target.value as GlobalRole }))
            }
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
          </Select>

          <div className="grid gap-2 rounded border border-gray-100 p-3">
            <h3 className="text-sm font-medium text-gray-900">Asignar proyectos</h3>
            <Select label="Proyecto" value={createProjectPick} onChange={(event) => setCreateProjectPick(event.target.value)}>
              <option value="">Seleccioná un proyecto</option>
              {catalog.projects.map((project) => (
                <option key={project.projectId} value={project.projectId}>
                  {projectLabel(project)} · {project.obraCount} obras
                </option>
              ))}
            </Select>
            <Select
              label="Rol de proyecto"
              value={createProjectPickRole}
              onChange={(event) => setCreateProjectPickRole(event.target.value as ProjectMembershipRole)}
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </Select>
            <Button size="sm" variant="secondary" onClick={addCreateProjectAssignment} disabled={isPending}>
              Agregar proyecto
            </Button>
            {createProjectAssignments.length > 0 ? (
              <div className="space-y-1 text-xs text-gray-600">
                {createProjectAssignments.map((assignment) => (
                  <div key={assignment.projectId} className="flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1">
                    <span>{assignment.projectId} ({assignment.role})</span>
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={() => setCreateProjectAssignments((current) => current.filter((item) => item.projectId !== assignment.projectId))}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 rounded border border-gray-100 p-3">
            <h3 className="text-sm font-medium text-gray-900">Asignar obras</h3>
            <Select label="Obra" value={createObraPick} onChange={(event) => setCreateObraPick(event.target.value)}>
              <option value="">Seleccioná una obra</option>
              {catalog.obras.map((obra) => (
                <option key={obra.obraId} value={obra.obraId}>
                  {obra.nombre} · {obra.obraId}
                </option>
              ))}
            </Select>
            <Select
              label="Rol de obra"
              value={createObraPickRole}
              onChange={(event) => setCreateObraPickRole(event.target.value as ObraMembershipRole)}
            >
              <option value="viewer">viewer</option>
              <option value="editor">editor</option>
            </Select>
            <Button size="sm" variant="secondary" onClick={addCreateObraAssignment} disabled={isPending}>
              Agregar obra
            </Button>
            {createObraAssignments.length > 0 ? (
              <div className="space-y-1 text-xs text-gray-600">
                {createObraAssignments.map((assignment) => (
                  <div key={assignment.obraId} className="flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1">
                    <span>{assignment.obraId} ({assignment.role})</span>
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={() => setCreateObraAssignments((current) => current.filter((item) => item.obraId !== assignment.obraId))}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCreateDialogOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={onSubmitCreateUser} disabled={isPending}>
              Guardar usuario
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(selectedUser)}
        onClose={() => setAccessDialogUserId(null)}
        title={selectedUser ? `Gestionar accesos: ${selectedUser.email}` : 'Gestionar accesos'}
      >
        {selectedUser ? (
          <div className="space-y-4">
            <Select
              label="Rol global"
              value={globalRoleInput}
              onChange={(event) => setGlobalRoleInput(event.target.value as GlobalRole)}
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </Select>
            <Button size="sm" onClick={onUpdateRole} disabled={isPending}>
              Actualizar rol global
            </Button>

            <div className="grid gap-2 rounded border border-gray-100 p-3">
              <Input
                label="Project ID"
                value={projectIdInput}
                onChange={(event) => setProjectIdInput(event.target.value)}
              />
              {catalog.projects.length > 0 ? (
                <div className="rounded border border-gray-100 bg-gray-50 p-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-700">Proyectos disponibles</h4>
                  <ul className="mt-2 space-y-1 text-xs text-gray-700">
                    {catalog.projects.map((project) => (
                      <li key={project.projectId} className="flex items-center justify-between gap-2">
                        <span>{projectLabel(project)}</span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setProjectIdInput(project.projectId)}
                          disabled={isPending}
                        >
                          Usar
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Select
                label="Rol de proyecto"
                value={projectRoleInput}
                onChange={(event) => setProjectRoleInput(event.target.value as ProjectMembershipRole)}
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
              </Select>
              <Button size="sm" onClick={onAssignProject} disabled={isPending}>
                Asignar proyecto
              </Button>
            </div>

            <div className="grid gap-2 rounded border border-gray-100 p-3">
              <Input
                label="Obra ID"
                value={obraIdInput}
                onChange={(event) => setObraIdInput(event.target.value)}
              />
              {catalog.obras.length > 0 ? (
                <div className="rounded border border-gray-100 bg-gray-50 p-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-700">Obras disponibles</h4>
                  <ul className="mt-2 space-y-1 text-xs text-gray-700">
                    {catalog.obras.map((obra) => (
                      <li key={obra.obraId} className="flex items-center justify-between gap-2">
                        <span>
                          {obra.nombre} · {obra.obraId}
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setObraIdInput(obra.obraId)}
                          disabled={isPending}
                        >
                          Usar
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Select
                label="Rol de obra"
                value={obraRoleInput}
                onChange={(event) => setObraRoleInput(event.target.value as ObraMembershipRole)}
              >
                <option value="viewer">viewer</option>
                <option value="editor">editor</option>
              </Select>
              <Button size="sm" onClick={onAssignObra} disabled={isPending}>
                Asignar obra
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(deactivateUserId)}
        onClose={() => setDeactivateUserId(null)}
        title="Confirmar desactivación"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Esta acción desactiva el acceso del usuario sin borrarlo. Podés revertirlo manualmente desde base.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeactivateUserId(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={onDeactivateConfirmed} disabled={isPending}>
              Confirmar desactivación
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
