import { IconChefHat, IconHome } from '@tabler/icons-react';
import { Button, Group, NavLink, Stack, ThemeIcon, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

type NavbarProps = {};

export const Navbar = ({}: NavbarProps) => {
  const [opened, { toggle }] = useDisclosure();

  return (
    <Stack py="24" px="12" h="100%" gap={0} pos="relative">
      <Group mb="xl" align="end">
        <Title order={2} fw={900}>
          Mise.
        </Title>
      </Group>
      <Stack>
        <Stack gap={0}>
          <Title p={0} fw={300} order={6} c="dimmed">
            MENU
          </Title>
          <NavLink bdrs={8} leftSection={<IconHome size={16} stroke={1.5} />} label="Dashboard" />
        </Stack>
      </Stack>
    </Stack>
  );
};
