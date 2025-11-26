import { Center, Loader, Paper, Stack, Text, Title } from '@mantine/core';

export function VerifyingState() {
  return (
    <Paper shadow="md" p="xl" radius="md" withBorder maw={400} mx="auto">
      <Stack gap="md" align="center">
        <Title order={2}>Verifying...</Title>
        <Text c="dimmed" ta="center">
          Confirming your magic link
        </Text>
        <Center>
          <Loader size="lg" />
        </Center>
      </Stack>
    </Paper>
  );
}
