import { IconHome } from '@tabler/icons-react';
import { Button, NavLink, Stack, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

type NavbarProps = {};

export const Navbar = ({}: NavbarProps) => {
  const [opened, { toggle }] = useDisclosure();

  return (
    <Stack bg="gray.0" py="24" px="12" h="100%" gap={0} pos="relative" bdrs={8}>
      <Title order={5}>Les Comtes de Salmes</Title>
      <Stack>
        <NavLink
          bdrs={8}
          active
          leftSection={<IconHome size={16} stroke={1.5} />}
          label="Dashboard"
        />
      </Stack>
    </Stack>
  );
};
