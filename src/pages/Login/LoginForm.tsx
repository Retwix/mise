import { IconCheck } from '@tabler/icons-react';
import { Alert, Button, Center, Paper, Stack, Text, TextInput, Title } from '@mantine/core';
import { Logo } from '@/components/Logo';
import { useLogin } from '@/hooks/useLogin';

export const LoginForm = () => {
  const { loginEmail, setLoginEmail, isLoading, loginError, isSuccess, handleLogin } = useLogin();

  if (isSuccess)
    return (
      <Paper shadow="md" p="xl" radius="md" withBorder maw={400} mx="auto">
        <Stack gap="md">
          <Title order={2}>Check your email</Title>
          <Alert icon={<IconCheck size={16} />} title="Magic link sent!" color="green">
            We've sent a magic link to <strong>{loginEmail}</strong>. Click the link in the email to
            sign in.
          </Alert>
        </Stack>
      </Paper>
    );

  return (
    <Paper shadow="md" p="xl" radius="md" withBorder maw={400} mx="auto">
      <Stack gap="md">
        <Stack gap={0}>
          <Center mb="lg">
            <Logo size={80} />
          </Center>
          <Title order={2}>Welcome to Mise.</Title>
          <Text c="dimmed" size="sm" mt={5}>
            Sign in via magic link with your email
          </Text>
        </Stack>

        {loginError && (
          <Alert title="Error" color="red">
            {loginError}
          </Alert>
        )}

        <form onSubmit={handleLogin}>
          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="your@email.com"
              type="email"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              required
              disabled={isLoading}
            />

            <Button type="submit" fullWidth loading={isLoading}>
              Send magic link
            </Button>
          </Stack>
        </form>
      </Stack>
    </Paper>
  );
};
