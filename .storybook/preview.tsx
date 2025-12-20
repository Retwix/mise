import '@mantine/core/styles.css';

import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { mantineTheme } from '@/init/mantine';

export const decorators = [
  (renderStory: any, context: any) => {
    const scheme = (context.globals.theme || 'light') as 'light' | 'dark';
    return (
      <MantineProvider theme={mantineTheme} forceColorScheme={scheme}>
        <ColorSchemeScript />
        {renderStory()}
      </MantineProvider>
    );
  },
];
