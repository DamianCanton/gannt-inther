import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AuthContextError } from '@/lib/auth/auth-context'
import { requireAdmin } from '@/lib/auth/guards'
import { ToastOnMount } from '@/components/ui/toast-on-mount'

const sections: Array<{
  href: '/perfil/admin/usuarios' | '/perfil/admin/templates'
  title: string
  description: string
}> = [
  {
    href: '/perfil/admin/usuarios',
    title: 'Usuarios',
    description: 'Alta, membresías por proyecto y acceso granular por obra.',
  },
  {
    href: '/perfil/admin/templates',
    title: 'Tipos de obra',
    description: 'Plantillas y estructura base para nuevos proyectos.',
  },
]

export default async function PerfilAdminPage() {
  try {
    await requireAdmin()

    return (
      <div className="mx-auto max-w-6xl space-y-8 p-8">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8 text-white shadow-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Panel administrativo</p>
          <h1 className="mt-3 text-3xl font-semibold">Centro de control</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70">
            Desde acá administrás usuarios, permisos, proyectos y plantillas sin salir del perfil.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-gray-900 group-hover:text-primary">{section.title}</h2>
              <p className="mt-2 text-sm text-gray-600">{section.description}</p>
              <span className="mt-4 inline-flex text-sm font-medium text-primary">Abrir módulo →</span>
            </Link>
          ))}
        </section>
      </div>
    )
  } catch (error) {
    if (error instanceof AuthContextError && error.code === 'UNAUTHENTICATED') {
      redirect('/auth/login')
    }

    if (error instanceof AuthContextError && error.code === 'FORBIDDEN') {
      return (
        <div className="mx-auto max-w-4xl p-8">
          <ToastOnMount variant="error" title="Acceso denegado" description="No tenés permisos de administrador." />
          <h1 className="mb-3 text-2xl font-bold">Panel administrativo</h1>
          <p className="text-sm text-amber-700">No tenés permisos de administrador.</p>
        </div>
      )
    }

    return (
      <div className="mx-auto max-w-4xl p-8">
        <ToastOnMount variant="error" title="Error cargando panel" description={error instanceof Error ? error.message : 'Error inesperado'} />
        <h1 className="mb-3 text-2xl font-bold">Panel administrativo</h1>
        <p className="text-sm text-red-700">Error: {error instanceof Error ? error.message : 'Error inesperado'}</p>
      </div>
    )
  }
}
