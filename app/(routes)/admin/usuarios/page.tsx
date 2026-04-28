import { redirect } from 'next/navigation'

import {
  assignObra,
  assignProject,
  listAdminCatalog,
  createUser,
  deactivateUser,
  listUsersForAdmin,
  updateUserRole,
} from '@/app/actions/users'
import { AuthContextError } from '@/lib/auth/auth-context'
import { requireAdmin } from '@/lib/auth/guards'
import { ToastOnMount } from '@/components/ui/toast-on-mount'

import { AdminUsersClient } from './admin-users-client'

export default async function AdminUsuariosPage() {
  try {
    await requireAdmin()
    const [users, catalog] = await Promise.all([listUsersForAdmin(), listAdminCatalog()])

    return (
      <div className="mx-auto max-w-7xl p-8">
        <h1 className="mb-2 text-2xl font-bold">Administración de usuarios</h1>
        <p className="mb-6 text-sm text-gray-600">
          Gestioná roles globales, membresías por proyecto y accesos granulares por obra.
        </p>

        <AdminUsersClient
          users={users}
          catalog={catalog}
          actions={{
            createUser,
            assignProject,
            assignObra,
            updateUserRole,
            deactivateUser,
          }}
        />
      </div>
    )
  } catch (error) {
    if (error instanceof AuthContextError && error.code === 'UNAUTHENTICATED') {
      redirect('/auth/login')
    }

    if (error instanceof AuthContextError && error.code === 'FORBIDDEN') {
      return (
        <div className="mx-auto max-w-4xl p-8">
          <ToastOnMount
            variant="error"
            title="Acceso denegado"
            description="No tenés permisos de administrador."
          />
          <h1 className="mb-3 text-2xl font-bold">Administración de usuarios</h1>
          <p className="text-sm text-amber-700">No tenés permisos de administrador.</p>
        </div>
      )
    }

    return (
      <div className="mx-auto max-w-4xl p-8">
        <ToastOnMount
          variant="error"
          title="Error cargando usuarios"
          description={error instanceof Error ? error.message : 'Error inesperado'}
        />
        <h1 className="mb-3 text-2xl font-bold">Administración de usuarios</h1>
        <p className="text-sm text-red-700">Error: {error instanceof Error ? error.message : 'Error inesperado'}</p>
      </div>
    )
  }
}
