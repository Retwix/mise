import { Navigate } from 'react-router-dom';
import { Center, Loader, Stack } from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { useMagicLink } from '@/hooks/useMagicLink';
import { AuthError } from './AuthError';
import { AuthSuccess } from './AuthSuccess';
import { LoginForm } from './LoginForm';
import { VerifyingState } from './VerifyingState';

export const Login = () => {
  const { hasSession, isLoading: isSessionLoading } = useAuth();
  const { isCheckingOTPToken, magicLinkError, isMagicLinkValid, clearError } = useMagicLink();

  if (isSessionLoading)
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );

  if (hasSession) return <Navigate to="/" replace />;

  if (isCheckingOTPToken)
    return (
      <Center h="100vh">
        <VerifyingState />
      </Center>
    );

  if (magicLinkError)
    return (
      <Center h="100vh">
        <AuthError error={magicLinkError} onClear={clearError} />
      </Center>
    );

  if (isMagicLinkValid && !hasSession)
    return (
      <Center h="100vh">
        <AuthSuccess />
      </Center>
    );

  return (
    <Center h="100vh">
      <Stack w="100%" maw={400}>
        <LoginForm />
      </Stack>
    </Center>
  );
};
