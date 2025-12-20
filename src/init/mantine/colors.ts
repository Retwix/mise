import { PartialDeep } from 'type-fest';
import { colorsTuple, createTheme, MantineTheme } from '@mantine/core';

export const colorsTheme: PartialDeep<MantineTheme> = createTheme({
  primaryColor: 'orange',
  primaryShade: 5,
  colors: {
    orange: [
      '#fff1e2',
      '#ffe2cd',
      '#fdc49d',
      '#faa369',
      '#f8883d',
      '#f77e2d',
      '#f76d10',
      '#dc5c03',
      '#c45000',
      '#ab4300',
    ],
    gray: [
      '#FCFCFD',
      '#F6F6F9',
      '#E7E8EE',
      '#DCDCE5',
      '#C4C5D4',
      '#9899B4',
      '#6B6E94',
      '#4F516D',
      '#36374A',
      '#20212C',
      '#09090C',
    ],
  },
});
