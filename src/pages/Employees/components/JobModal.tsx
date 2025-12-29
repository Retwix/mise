import { useState } from 'react';
import { IconChefHat } from '@tabler/icons-react';
import { Alert, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { useCreatePosition } from '../hooks/use-create-position';

type JobModalProps = {
  isModalOpened: boolean;
  closeModal: () => void;
};

export const JobModal = ({ isModalOpened, closeModal }: JobModalProps) => {
  const [positionName, setPositionName] = useState('');
  const { createPosition, isLoading, error, resetState } = useCreatePosition();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await createPosition({ name: positionName });

    if (result.success) {
      setPositionName('');
      closeModal();
    }
  };

  const handleClose = () => {
    setPositionName('');
    resetState();
    closeModal();
  };

  return (
    <Modal
      title={
        <Group gap={4}>
          <IconChefHat size={24} stroke={1.5} />
          <Text>Nouveau poste</Text>
        </Group>
      }
      opened={isModalOpened}
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit}>
        <Stack>
          {error && (
            <Alert title="Erreur" color="red">
              {error}
            </Alert>
          )}
          <TextInput
            label="Intitulé du poste"
            placeholder="Manager"
            value={positionName}
            onChange={e => setPositionName(e.target.value)}
            required
            disabled={isLoading}
          />
          <Group justify="end">
            <Button onClick={handleClose} variant="outline" disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" c="white" loading={isLoading}>
              Sauvegarder
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
