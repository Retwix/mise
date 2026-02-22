import { AppShell, NavLink, Title, Button } from '@mantine/core'
import { useNavigate, useLocation } from 'react-router-dom'
import { IconCalendar, IconUsers, IconClock, IconLogout } from '@tabler/icons-react'
import { supabase } from '../lib/supabase'

const navItems = [
  { label: 'Planning', path: '/dashboard', icon: IconCalendar },
  { label: 'Employés', path: '/employees', icon: IconUsers },
  { label: 'Types de shifts', path: '/shift-types', icon: IconClock },
]

export function ManagerShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <AppShell navbar={{ width: 220, breakpoint: 'sm' }} padding="md">
      <AppShell.Navbar p="md">
        <Title order={4} mb="md">Mise en place</Title>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            label={item.label}
            leftSection={<item.icon size={16} />}
            active={location.pathname === item.path}
            onClick={() => navigate(item.path)}
            mb={4}
          />
        ))}
        <Button
          variant="subtle"
          color="red"
          leftSection={<IconLogout size={16} />}
          mt="auto"
          onClick={handleLogout}
        >
          Déconnexion
        </Button>
      </AppShell.Navbar>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  )
}
