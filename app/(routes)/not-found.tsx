import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-slate-50/70 px-6 py-8">
      <Card className="max-w-md text-center">
        <h1 className="mb-4 text-6xl font-bold tracking-tight text-slate-900">404</h1>
        <p className="text-xl text-gray-600 mb-6">
          Página no encontrada
        </p>
        <Link
          href="/obras"
          className="inline-block rounded-lg bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent/90"
        >
          Volver al inicio
        </Link>
      </Card>
    </main>
  )
}
