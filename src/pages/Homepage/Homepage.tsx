import { Box, Stack, Title } from '@mantine/core';

export function HomePage() {
  return (
    <Stack>
      <Box bg="white" w={'100%'} p={'md'} bdrs={8}>
        <Title order={4}>Dashboard</Title>
      </Box>
    </Stack>
  );
}
