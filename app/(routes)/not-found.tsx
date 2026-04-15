import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="max-w-md text-center">
        <h1 className="text-6xl font-bold mb-4 text-gray-900">404</h1>
        <p className="text-xl text-gray-600 mb-6">
          Página no encontrada
        </p>
        <Link
          href="/obras"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded font-medium hover:bg-blue-700 transition-colors"
        >
          Volver al inicio
        </Link>
      </Card>
    </main>
  )
}
