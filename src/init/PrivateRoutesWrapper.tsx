import { Navigate, Outlet } from 'react-router-dom';
import { AppShell, Center, Loader } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';

export const PrivateRoutesWrapper = () => {
  const [isOpened] = useDisclosure();
  const { hasSession, isLoading: isSessionLoading } = useAuth();

  if (isSessionLoading)
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );

  if (!hasSession) return <Navigate to="/login" replace />;

  return (
    <AppShell
      padding="xl"
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !isOpened },
      }}
      styles={{
        navbar: { zIndex: 10 },
        main: { zIndex: 0 },
      }}
    >
      <AppShell.Navbar>
        <Navbar />
      </AppShell.Navbar>

      <AppShell.Main style={{ overflowY: 'auto', height: '100vh', paddingTop: '20px' }}>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};
