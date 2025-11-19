import { IconCalendar, IconHome } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { Group, NavLink, Stack, Title } from '@mantine/core';
import { Logo } from '../Logo';

export const Navbar = () => {
  const navigate = useNavigate();

  return (
    <Stack py="24" px="12" h="100%" gap={0} pos="relative">
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
            label="Schedule"
          />
        </Stack>
      </Stack>
    </Stack>
  );
};
