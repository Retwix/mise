import { Box, Stack, Title } from '@mantine/core';

export function HomePage() {
  return (
    <Stack>
      <Stack gap={0}>
        <Title fw={500} order={4}>
          Dashboard
        </Title>
        <Title fw={300} order={6} c="dimmed">
          Your team’s shifts, delivered.
        </Title>
      </Stack>
    </Stack>
  );
}
