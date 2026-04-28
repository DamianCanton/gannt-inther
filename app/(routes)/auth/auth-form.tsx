'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { useEffect, useRef } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import type { AuthActionState } from './actions'

interface AuthFormProps {
  title: string
  submitLabel: string
  alternateHref: Route
  alternateLabel: string
  alternateCta: string
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Procesando...' : label}
    </Button>
  )
}

export function AuthForm({
  title,
  submitLabel,
  alternateHref,
  alternateLabel,
  alternateCta,
  action,
}: AuthFormProps) {
  const [state, formAction] = useFormState(action, { error: undefined })
  const { toast } = useToast()
  const errorToastLocked = useRef(false)

  useEffect(() => {
    if (state.error && !errorToastLocked.current) {
      errorToastLocked.current = true
      toast({
        variant: 'error',
        title: 'No se pudo iniciar sesión',
        description: state.error,
      })
    }

    if (!state.error) {
      errorToastLocked.current = false
    }
  }, [state.error, toast])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50/70 px-6 py-8">
      <Card className="w-full max-w-md space-y-5">
        <div className="space-y-2">
          <p className="text-[12px] uppercase tracking-wider text-gray-500">INTHER Access</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        </div>

        <form action={formAction} className="space-y-4">
          <Input name="email" type="email" label="Email" required autoComplete="email" />
          <Input
            name="password"
            type="password"
            label="Contraseña"
            required
            minLength={6}
            autoComplete="current-password"
          />

          <SubmitButton label={submitLabel} />
        </form>

        <p className="text-sm text-gray-600">
          {alternateLabel}{' '}
          <Link href={alternateHref} className="font-medium text-accent hover:text-accent/80">
            {alternateCta}
          </Link>
        </p>
      </Card>
    </main>
  )
}
