import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { mantineTheme } from './init/mantine';
import { Router } from './Router';

export default function App() {
  return (
    <MantineProvider theme={mantineTheme}>
      <Router />
    </MantineProvider>
  );
}
