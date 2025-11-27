import { Navigate } from 'react-router-dom';
import { Center, Loader, Stack } from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { useMagicLink } from '@/hooks/useMagicLink';
import { AuthError } from './AuthError';
import { AuthSuccess } from './AuthSuccess';
import { LoginForm } from './LoginForm';
import { VerifyingState } from './VerifyingState';

export function Login() {
  const { session: isAuthenticated, loading: isSessionLoading } = useAuth();
  const { isCheckingOTPToken: verifying, authError, authSuccess, clearError } = useMagicLink();

  if (isSessionLoading)
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );

  if (isAuthenticated) return <Navigate to="/" replace />;

  // Show verification state
  if (verifying) {
    return (
      <Center h="100vh">
        <VerifyingState />
      </Center>
    );
  }

  // Show auth error
  if (authError) {
    return (
      <Center h="100vh">
        <AuthError error={authError} onClear={clearError} />
      </Center>
    );
  }

  // Show auth success (briefly before session loads)
  if (authSuccess && !isAuthenticated) {
    return (
      <Center h="100vh">
        <AuthSuccess />
      </Center>
    );
  }

  return (
    <Center h="100vh">
      <Stack w="100%" maw={400}>
        <LoginForm />
      </Stack>
    </Center>
  );
}
