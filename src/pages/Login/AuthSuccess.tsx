import { IconCheck } from '@tabler/icons-react';
import { Alert, Center, Loader, Paper, Stack, Title } from '@mantine/core';

export const AuthSuccess = () => {
  return (
    <Paper shadow="md" p="xl" radius="md" withBorder maw={400} mx="auto">
      <Stack gap="md" align="center">
        <Title order={2}>Success!</Title>
        <Alert icon={<IconCheck size={16} />} title="Authentication successful" color="green">
          Loading your account...
        </Alert>
        <Center>
          <Loader size="lg" />
        </Center>
      </Stack>
    </Paper>
  );
};
