import { IconChefHat, IconChevronDown, IconUser, IconZoom } from '@tabler/icons-react';
import { Button, Group, Menu, Stack, TextInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { PageTitle } from '@/components/PageTitle';

export const EmployeeIndex = () => {
  const [isEmployeeModalOpen, { open, close }] = useDisclosure(false);

  return (
    <Stack>
      <PageTitle>
        Employés
        <PageTitle.Subtitle>Your team’s shifts, delivered.</PageTitle.Subtitle>
        <PageTitle.Actions>
          <Menu transitionProps={{ transition: 'pop-top-right' }} shadow="md" width={200}>
            <Menu.Target>
              <Button rightSection={<IconChevronDown stroke={1.5} />}>Nouveau</Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item leftSection={<IconUser size={14} />}>Employé</Menu.Item>
              <Menu.Item leftSection={<IconChefHat size={14} />}>Poste</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </PageTitle.Actions>
      </PageTitle>
      <Group>
        <TextInput leftSection={<IconZoom size={18} stroke={1.5} />} placeholder="Search" />
      </Group>
    </Stack>
  );
};
