import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { PrivateRoutesWrapper } from './init/PrivateRoutesWrapper';
import { Router } from './Router';
import { theme } from './theme';

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <PrivateRoutesWrapper>
        <Router />
      </PrivateRoutesWrapper>
    </MantineProvider>
  );
}
