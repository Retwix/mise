import { IconChefHat, IconHome } from '@tabler/icons-react';
import { Button, Group, NavLink, Stack, ThemeIcon, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

type NavbarProps = {};

export const Navbar = ({}: NavbarProps) => {
  const [opened, { toggle }] = useDisclosure();

  return (
    <Stack py="24" px="12" h="100%" gap={0} pos="relative">
      <Group mb="xl" align="end">
        <IconChefHat size={32} />
        <Title order={5}>Les Comtes de Salmes</Title>
      </Group>
      <Stack>
        <NavLink bdrs={8} leftSection={<IconHome size={16} stroke={1.5} />} label="Dashboard" />
      </Stack>
    </Stack>
  );
};
