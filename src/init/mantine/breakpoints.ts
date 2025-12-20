import { PartialDeep } from 'type-fest';
import { createTheme, MantineTheme } from '@mantine/core';

export const breakpointsTheme: PartialDeep<MantineTheme> = createTheme({
  breakpoints: {
    mobile: '64em', // TODO conflicts with the other definition
    space1: '4px',
    space2: '8px',
    space3: '12px',
    space4: '16px',
    space5: '20px',
    space6: '24px',
    space7: '28px',
    space8: '32px',
    space9: '36px',
    space10: '40px',
    space20: '80px',
  },
});
