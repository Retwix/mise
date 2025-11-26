import { IconCalendar, IconHome, IconLogout } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Group, NavLink, Stack, Text, Title } from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '../Logo';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <Stack py="24" px="12" h="100%" gap={0} pos="relative" justify="space-between">
      <Stack gap={0}>
        <Group mb="xl" align="center">
          <Logo size={30} />
          <Title order={2} fw={900}>
            Mise.
          </Title>
        </Group>
        <Stack>
          <Stack gap={0}>
            <Title p={0} fw={300} order={6} c="dimmed">
              MENU
            </Title>
            <NavLink
              onClick={() => navigate('/')}
              bdrs={8}
              leftSection={<IconHome size={16} stroke={1.5} />}
              label="Dashboard"
              active={location.pathname === '/'}
            />
          </Stack>
          <Stack gap={0}>
            <Title p={0} fw={300} order={6} c="dimmed">
              OPERATIONS
            </Title>
            <NavLink
              bdrs={8}
              onClick={() => navigate('/schedule')}
              leftSection={<IconCalendar size={16} stroke={1.5} />}
              label="Planning"
              active={location.pathname === '/schedule'}
            />
          </Stack>
          <Stack gap={0}>
            <Title p={0} fw={300} order={6} c="dimmed">
              RESSOURCES HUMAINES
            </Title>
            <NavLink
              bdrs={8}
              onClick={() => navigate('/employees')}
              leftSection={<IconCalendar size={16} stroke={1.5} />}
              label="Employés"
              active={location.pathname === '/employees'}
            />
          </Stack>
        </Stack>
      </Stack>

      <Stack gap="xs" pb="md">
        {user && (
          <Text size="sm" c="dimmed" px="xs">
            {user.email}
          </Text>
        )}
        <Button
          variant="light"
          color="red"
          leftSection={<IconLogout size={16} />}
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      </Stack>
    </Stack>
  );
};
