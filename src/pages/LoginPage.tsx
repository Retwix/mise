import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TextInput, PasswordInput, Button, Stack, Title, Paper, Center } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      notifications.show({ color: 'red', message: error.message })
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <Center h="100vh">
      <Paper p="xl" w={360} withBorder>
        <Stack>
          <Title order={2}>Connexion gérant</Title>
          <TextInput label="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <PasswordInput label="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} />
          <Button onClick={handleLogin} loading={loading}>Se connecter</Button>
        </Stack>
      </Paper>
    </Center>
  )
}
