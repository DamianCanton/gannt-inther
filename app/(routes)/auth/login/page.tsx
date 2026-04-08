import { AuthForm } from '../auth-form'
import { login } from '../actions'

export default function LoginPage() {
  return (
    <AuthForm
      title="Iniciar sesión"
      submitLabel="Entrar"
      alternateHref="/auth/signup"
      alternateLabel="¿No tenés cuenta?"
      alternateCta="Crear cuenta"
      action={login}
    />
  )
}
