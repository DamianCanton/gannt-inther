'use client'

import { useEffect, useState, useTransition } from 'react'

import type {
  ActionResult,
  AdminCatalog,
  GlobalRole,
  ObraMembershipRole,
  ProjectMembershipRole,
} from '@/app/actions/users'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

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

export function AdminUserCreateDialog({
  open,
  catalog,
  initialGlobalRole,
  onClose,
  onSuccess,
  onError,
  createUser,
}: {
  open: boolean
  catalog: AdminCatalog
  initialGlobalRole: GlobalRole
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
  createUser: (
    email: string,
    password: string,
    displayName: string,
    globalRole: GlobalRole,
    projectAssignments: Array<{ projectId: string; role: ProjectMembershipRole }>,
    obraAssignments: Array<{ obraId: string; role: ObraMembershipRole }>
  ) => Promise<ActionResult>
}) {
  const [isPending, startTransition] = useTransition()
  const [createForm, setCreateForm] = useState<CreateFormState>({ ...INITIAL_CREATE_FORM, globalRole: initialGlobalRole })
  const [createProjectAssignments, setCreateProjectAssignments] = useState<Array<{ projectId: string; role: ProjectMembershipRole }>>([])
  const [createObraAssignments, setCreateObraAssignments] = useState<Array<{ obraId: string; role: ObraMembershipRole }>>([])
  const [createProjectPick, setCreateProjectPick] = useState('')
  const [createProjectPickRole, setCreateProjectPickRole] = useState<ProjectMembershipRole>('member')
  const [createObraPick, setCreateObraPick] = useState('')
  const [createObraPickRole, setCreateObraPickRole] = useState<ObraMembershipRole>('viewer')

  useEffect(() => {
    if (!open) return

    setCreateForm({ ...INITIAL_CREATE_FORM, globalRole: initialGlobalRole })
    setCreateProjectAssignments([])
    setCreateObraAssignments([])
    setCreateProjectPick('')
    setCreateObraPick('')
    setCreateProjectPickRole('member')
    setCreateObraPickRole('viewer')
  }, [initialGlobalRole, open])

  function addCreateProjectAssignment() {
    if (!createProjectPick) {
      onError('Seleccioná un proyecto.')
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
      onError('Seleccioná una obra.')
      return
    }

    setCreateObraAssignments((current) => [
      ...current.filter((assignment) => assignment.obraId !== createObraPick),
      { obraId: createObraPick, role: createObraPickRole },
    ])
    setCreateObraPick('')
  }

  function onSubmitCreateUser() {
    const email = createForm.email.trim()
    const password = createForm.password
    const displayName = createForm.displayName.trim()

    if (!email.includes('@') || password.length < 6 || !displayName) {
      onError('Completá email y contraseña válidos.')
      return
    }

    startTransition(async () => {
      const result = await createUser(
        email,
        password,
        displayName,
        createForm.globalRole,
        createProjectAssignments,
        createObraAssignments
      )

      if (!result.success) {
        onError(result.error ?? 'No se pudo crear el usuario.')
        return
      }

      onSuccess('Usuario creado correctamente. Actualizá la vista para verlo en la tabla.')
      onClose()
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title="Crear usuario">
      <div className="space-y-3">
        <Input
          label="Email"
          type="email"
          value={createForm.email}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
          disabled={isPending}
        />
        <Input
          label="Contraseña"
          type="password"
          value={createForm.password}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
          disabled={isPending}
        />
        <Input
          label="Nombre"
          value={createForm.displayName}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, displayName: event.target.value }))}
          disabled={isPending}
        />

        <Select
          label="Rol global"
          value={createForm.globalRole}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, globalRole: event.target.value as GlobalRole }))}
          disabled={isPending}
        >
          <option value="member">member</option>
          <option value="admin">admin</option>
        </Select>

        <div className="grid gap-2 rounded border border-gray-100 p-3">
          <h3 className="text-sm font-medium text-gray-900">Asignar proyectos</h3>
          <Select label="Proyecto" value={createProjectPick} onChange={(event) => setCreateProjectPick(event.target.value)} disabled={isPending}>
            <option value="">Seleccioná un proyecto</option>
            {catalog.projects.map((project) => (
              <option key={project.projectId} value={project.projectId}>
                {project.nombre} · {project.projectId} · {project.obraCount} obras
              </option>
            ))}
          </Select>
          <Select
            label="Rol de proyecto"
            value={createProjectPickRole}
            onChange={(event) => setCreateProjectPickRole(event.target.value as ProjectMembershipRole)}
            disabled={isPending}
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
                  <span>
                    {assignment.projectId} ({assignment.role})
                  </span>
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
          <Select label="Obra" value={createObraPick} onChange={(event) => setCreateObraPick(event.target.value)} disabled={isPending}>
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
            disabled={isPending}
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
                  <span>
                    {assignment.obraId} ({assignment.role})
                  </span>
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
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={onSubmitCreateUser} disabled={isPending}>
            Guardar usuario
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
