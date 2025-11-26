import { IconX } from '@tabler/icons-react';
import { Alert, Button, Paper, Stack, Title } from '@mantine/core';

interface AuthErrorProps {
  error: string;
  onClear: () => void;
}

export function AuthError({ error, onClear }: AuthErrorProps) {
  return (
    <Paper shadow="md" p="xl" radius="md" withBorder maw={400} mx="auto">
      <Stack gap="md">
        <Title order={2}>Authentication Failed</Title>
        <Alert icon={<IconX size={16} />} title="Error" color="red">
          {error}
        </Alert>
        <Button onClick={onClear} variant="outline">
          Return to login
        </Button>
      </Stack>
    </Paper>
  );
}
