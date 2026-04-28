'use client'

import { useEffect, useRef } from 'react'

import { useToast } from '@/components/ui/toast'

export function ToastOnMount({
  title,
  description,
  variant = 'info',
}: {
  title: string
  description?: string
  variant?: 'success' | 'error' | 'info' | 'default'
}) {
  const { toast } = useToast()
  const shownRef = useRef(false)

  useEffect(() => {
    if (shownRef.current) return
    shownRef.current = true
    toast({ title, description, variant })
  }, [description, title, toast, variant])

  return null
}
