import { Box, Stack, Title } from '@mantine/core';

export const EmployeeIndex = () => {
  return (
    <Stack>
      <Stack gap={0}>
        <Title fw={500} order={4}>
          Emloyees
        </Title>
        <Title fw={300} order={6} c="dimmed">
          Your team’s shifts, delivered.
        </Title>
      </Stack>
    </Stack>
  );
};
