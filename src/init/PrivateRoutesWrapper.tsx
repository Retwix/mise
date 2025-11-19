import { Outlet } from 'react-router-dom';
import { AppShell } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Navbar } from '@/components/Navbar';

export const PrivateRoutesWrapper = () => {
  const [opened] = useDisclosure();

  return (
    <AppShell
      padding="xl"
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
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
