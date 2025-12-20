import { PartialDeep } from 'type-fest';
import { createTheme, MantineTheme } from '@mantine/core';

export const typographyTheme: PartialDeep<MantineTheme> = createTheme({
  fontFamily: 'Geist, sans-serif',
  headings: {
    fontFamily: 'Geist, sans-serif',
    sizes: {
      h1: { fontWeight: '700', fontSize: '40px', lineHeight: '56px' },
      h2: { fontWeight: '600', fontSize: '32px', lineHeight: '48px' },
      h3: { fontWeight: '500', fontSize: '28px', lineHeight: '40px' },
      h4: { fontWeight: '500', fontSize: '24px', lineHeight: '32px' },
      h5: { fontWeight: '500', fontSize: '20px', lineHeight: '32px' },
      h6: { fontWeight: '500', fontSize: '16px', lineHeight: '24px' },
    },
  },
});
