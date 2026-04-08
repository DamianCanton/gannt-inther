'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { useFormState, useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

        <form action={formAction} className="space-y-3">
          <Input name="email" type="email" label="Email" required autoComplete="email" />
          <Input
            name="password"
            type="password"
            label="Contraseña"
            required
            minLength={6}
            autoComplete="current-password"
          />

          {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

          <SubmitButton label={submitLabel} />
        </form>

        <p className="text-sm text-gray-600">
          {alternateLabel}{' '}
          <Link href={alternateHref} className="font-medium text-blue-600 hover:text-blue-700">
            {alternateCta}
          </Link>
        </p>
      </Card>
    </main>
  )
}
