import { IconChefHat, IconChevronDown, IconUser, IconZoom } from '@tabler/icons-react';
import { Button, Group, Menu, Stack, TextInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { PageTitle } from '@/components/PageTitle';
import { EmployeeModal } from './components/EmployeeModal';
import { JobModal } from './components/JobModal';

export const EmployeeIndex = () => {
  const [isEmployeeModalOpen, { open: openEmployee, close: closeEmployee }] = useDisclosure(false);
  const [isJobModalOpen, { open: openJob, close: closeJob }] = useDisclosure(false);

  return (
    <>
      <Stack>
        <PageTitle>
          Employés
          <PageTitle.Subtitle>Your team’s shifts, delivered.</PageTitle.Subtitle>
          <PageTitle.Actions>
            <Menu
              position="bottom-end"
              transitionProps={{ transition: 'pop-top-right' }}
              shadow="md"
              width={200}
            >
              <Menu.Target>
                <Button c="white" rightSection={<IconChevronDown stroke={1.5} />}>
                  Nouveau
                </Button>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item onClick={openEmployee} leftSection={<IconUser size={14} />}>
                  Employé
                </Menu.Item>
                <Menu.Item onClick={openJob} leftSection={<IconChefHat size={14} />}>
                  Poste
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </PageTitle.Actions>
        </PageTitle>
        <Group>
          <TextInput leftSection={<IconZoom size={18} stroke={1.5} />} placeholder="Search" />
        </Group>
      </Stack>
      <EmployeeModal isModalOpened={isEmployeeModalOpen} closeModal={closeEmployee} />
      <JobModal isModalOpened={isJobModalOpen} closeModal={closeJob} />
    </>
  );
};
