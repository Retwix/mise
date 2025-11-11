import { AppShell, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Navbar } from '@/components/Navbar';

interface PrivateRoutesWrappedProps extends React.PropsWithChildren<{}> {}

export const PrivateRoutesWrapper = ({ children }: PrivateRoutesWrappedProps) => {
  const [opened, { toggle }] = useDisclosure();

  console.log('ok');
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
      <AppShell.Navbar p="md" bg="#F3F3F3">
        <Navbar />
      </AppShell.Navbar>

      <AppShell.Main
        style={{ overflowY: 'auto', height: '100vh', paddingTop: '20px' }}
        bg="#F3F3F3"
      >
        {children}
      </AppShell.Main>
    </AppShell>
  );
};
