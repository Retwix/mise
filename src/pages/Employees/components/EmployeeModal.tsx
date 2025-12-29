import { useState } from 'react';
import { IconUser } from '@tabler/icons-react';
import { Button, Group, Modal, Select, Stack, Text, TextInput } from '@mantine/core';
import { useLoadPositions } from '../hooks/use-load-positions';

const COMMUNICATION_OPTION = ['Whatsapp', 'Messenger', 'Sms'];

type EmployeeModalProps = {
  isModalOpened: boolean;
  closeModal: () => void;
};

export const EmployeeModal = ({ isModalOpened, closeModal }: EmployeeModalProps) => {
  const [shouldShowPhoneInput, setShouldShowPhoneInput] = useState(false);

  const { positions } = useLoadPositions();

  return (
    <Modal
      title={
        <Group gap={4}>
          <IconUser size={24} stroke={1.5} />
          <Text>Nouvel employé</Text>
        </Group>
      }
      opened={isModalOpened}
      onClose={closeModal}
    >
      <Stack>
        <Group>
          <TextInput label="Prénom" placeholder="John" />
          <TextInput label="Nom" placeholder="Doe" />
        </Group>
        <Select
          label="Poste"
          placeholder="Manager"
          data={positions.map(position => position.name)}
        />
        <Select label="Communication" placeholder="Whatsapp" data={COMMUNICATION_OPTION} />
        {shouldShowPhoneInput && <TextInput label="Téléphone" placeholder="0663398172" />}
        <Group justify="end">
          <Button onClick={closeModal} variant="outline">
            Annuler
          </Button>
          <Button c="white">Sauvegarder</Button>
        </Group>
      </Stack>
    </Modal>
  );
};
