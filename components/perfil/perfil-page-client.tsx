'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormState, useFormStatus } from 'react-dom'

import { changePassword, signout, updateProfile } from '@/lib/actions/perfil'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface PerfilPageClientProps {
  email: string
  createdAt: string
  lastSignInAt: string | null
  displayName: string
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Guardando...' : label}
    </Button>
  )
}

export function PerfilPageClient({ email, createdAt, lastSignInAt, displayName }: PerfilPageClientProps) {
  const router = useRouter()
  const [profileOpen, setProfileOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  const [profileState, profileAction] = useFormState(updateProfile, {
    error: undefined,
    success: undefined,
    fieldErrors: undefined,
  })

  const [passwordState, passwordAction] = useFormState(changePassword, {
    error: undefined,
    success: undefined,
    fieldErrors: undefined,
  })

  const profileRefreshLocked = useRef(false)
  const passwordRefreshLocked = useRef(false)

  useEffect(() => {
    if (profileState.success && !profileRefreshLocked.current) {
      profileRefreshLocked.current = true
      router.refresh()
      return
    }

    if (!profileState.success) {
      profileRefreshLocked.current = false
    }
  }, [profileState.success, router])

  useEffect(() => {
    if (passwordState.success && !passwordRefreshLocked.current) {
      passwordRefreshLocked.current = true
      router.refresh()
      return
    }

    if (!passwordState.success) {
      passwordRefreshLocked.current = false
    }
  }, [passwordState.success, router])

  return (
    <main className="min-h-screen bg-slate-50/70 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-2">
          <p className="text-[12px] uppercase tracking-wider text-gray-500">Cuenta</p>
          <h1 className="text-[40px] font-semibold tracking-tight text-slate-900">Perfil</h1>
          <p className="text-sm text-gray-600">Gestioná tu información personal y seguridad.</p>
        </div>

        <Card className="space-y-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[12px] uppercase tracking-wider text-gray-500">Email</dt>
              <dd className="mt-1 font-mono text-[13px] tabular-nums text-gray-900">{email}</dd>
            </div>
            <div>
              <dt className="text-[12px] uppercase tracking-wider text-gray-500">Nombre para mostrar</dt>
              <dd className="mt-1 text-sm text-gray-900">{displayName || 'Sin definir'}</dd>
            </div>
            <div>
              <dt className="text-[12px] uppercase tracking-wider text-gray-500">Miembro desde</dt>
              <dd className="mt-1 font-mono text-[13px] tabular-nums text-gray-900">{createdAt}</dd>
            </div>
            <div>
              <dt className="text-[12px] uppercase tracking-wider text-gray-500">Último acceso</dt>
              <dd className="mt-1 font-mono text-[13px] tabular-nums text-gray-900">{lastSignInAt ?? 'Sin acceso reciente'}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => setProfileOpen(true)}>
              Editar perfil
            </Button>
            <Button type="button" variant="secondary" onClick={() => setPasswordOpen(true)}>
              Cambiar contraseña
            </Button>
            <Button type="button" variant="ghost" onClick={() => void signout()}>
              Cerrar sesión
            </Button>
          </div>

          {profileState.success ? <p className="text-sm text-green-700">{profileState.success}</p> : null}
          {passwordState.success ? <p className="text-sm text-green-700">{passwordState.success}</p> : null}
        </Card>

        <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} title="Editar perfil">
          <form action={profileAction} className="space-y-4">
            <Input
              name="displayName"
              label="Nombre para mostrar"
              defaultValue={displayName}
              maxLength={80}
              required
              error={profileState.fieldErrors?.displayName}
            />

            {profileState.error ? <p className="text-sm text-red-600">{profileState.error}</p> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setProfileOpen(false)}>
                Cancelar
              </Button>
              <SubmitButton label="Guardar cambios" />
            </div>
          </form>
        </Dialog>

        <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Cambiar contraseña">
          <form action={passwordAction} className="space-y-4">
            <Input
              name="currentPassword"
              label="Contraseña actual"
              type="password"
              autoComplete="current-password"
              required
              error={passwordState.fieldErrors?.currentPassword}
            />
            <Input
              name="newPassword"
              label="Nueva contraseña"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              error={passwordState.fieldErrors?.newPassword}
            />
            <Input
              name="confirmPassword"
              label="Confirmar contraseña"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              error={passwordState.fieldErrors?.confirmPassword}
            />

            {passwordState.error ? <p className="text-sm text-red-600">{passwordState.error}</p> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setPasswordOpen(false)}>
                Cancelar
              </Button>
              <SubmitButton label="Actualizar contraseña" />
            </div>
          </form>
        </Dialog>
      </div>
    </main>
  )
}
