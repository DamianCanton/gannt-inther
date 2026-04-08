import { AuthForm } from '../auth-form'
import { signup } from '../actions'

export default function SignupPage() {
  return (
    <AuthForm
      title="Crear cuenta"
      submitLabel="Registrarme"
      alternateHref="/auth/login"
      alternateLabel="¿Ya tenés cuenta?"
      alternateCta="Iniciar sesión"
      action={signup}
    />
  )
}
