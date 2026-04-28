import { redirect } from 'next/navigation'

import { PerfilPageClient } from '@/components/perfil/perfil-page-client'
import { createServerClient } from '@/lib/supabase/server'

function formatDate(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  return new Date(value).toLocaleString('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

type ProfileRow = {
  display_name: string
  global_role: string
  is_active: boolean
}

export default async function PerfilPage() {
  const supabase = createServerClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    redirect('/auth/login')
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('display_name, global_role, is_active')
    .eq('user_id', userData.user.id)
    .maybeSingle<ProfileRow>()

  const displayName = profileData?.display_name ?? ''
  const isAdmin = profileData?.is_active === true && profileData?.global_role === 'admin'

  return (
    <PerfilPageClient
      email={userData.user.email ?? ''}
      createdAt={formatDate(userData.user.created_at) ?? 'Sin fecha'}
      lastSignInAt={formatDate(userData.user.last_sign_in_at)}
      displayName={displayName}
      isAdmin={isAdmin}
    />
  )
}
