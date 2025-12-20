import { css } from '@emotion/css';
import { PartialDeep } from 'type-fest';
import { Button, createTheme, MantineTheme } from '@mantine/core';

const buttonStyles = {
  root: (theme: MantineTheme) => css`
    &[data-variant='default'] {
      background-color: ${theme.colors.gray[0]};
      color: ${theme.colors.gray[8]};
      &:hover {
        background-color: ${theme.colors.gray[1]};
      }
      box-shadow: 0px 3px 1px -2px rgba(0, 0, 0, 0.06);
    }

    &[data-variant='filled'] {
      background: ${theme.colors.orange[6]};
    }
    &[data-disabled='true'] {
      background: ${theme.colors.gray[2]};
      color: ${theme.colors.gray[4]};
    }
    &[data-size='sm'] {
      padding: 4px 8px;
    }
  `,
};

export const ThemedMantineButton: PartialDeep<MantineTheme> = createTheme({
  components: {
    Button: Button.extend({
      defaultProps: {
        radius: 8,
        autoContrast: true,
        style: {
          transition: 'color 0.08s ease-in-out, background-color 0.08s ease-in-out',
        },
      },
      styles: {
        root: {
          color: 'white',
          fontWeight: 500,
        },
      },
      classNames: theme => ({
        root: buttonStyles.root(theme),
      }),
    }),
  },
});
