import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Center, Loader } from '@mantine/core'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ? 'authenticated' : 'unauthenticated')
    })
  }, [])

  if (session === 'loading') return <Center h="100vh"><Loader /></Center>
  if (session === 'unauthenticated') return <Navigate to="/login" replace />
  return <>{children}</>
}
