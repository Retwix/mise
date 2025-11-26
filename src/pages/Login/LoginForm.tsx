import { IconCheck } from '@tabler/icons-react';
import { Alert, Button, Paper, Stack, Text, TextInput, Title } from '@mantine/core';
import { useLogin } from '@/hooks/useLogin';

export const LoginForm = () => {
  const { email, setEmail, loading, error, success, handleLogin } = useLogin();

  if (success) {
    return (
      <Paper shadow="md" p="xl" radius="md" withBorder maw={400} mx="auto">
        <Stack gap="md">
          <Title order={2}>Check your email</Title>
          <Alert icon={<IconCheck size={16} />} title="Magic link sent!" color="green">
            We've sent a magic link to <strong>{email}</strong>. Click the link in the email to sign
            in.
          </Alert>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper shadow="md" p="xl" radius="md" withBorder maw={400} mx="auto">
      <Stack gap="md">
        <Stack gap={0}>
          <Title order={2}>Welcome to Mise</Title>
          <Text c="dimmed" size="sm" mt={5}>
            Sign in via magic link with your email
          </Text>
        </Stack>

        {error && (
          <Alert title="Error" color="red">
            {error}
          </Alert>
        )}

        <form onSubmit={handleLogin}>
          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="your@email.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />

            <Button type="submit" fullWidth loading={loading}>
              Send magic link
            </Button>
          </Stack>
        </form>
      </Stack>
    </Paper>
  );
};
