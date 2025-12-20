import { DEFAULT_THEME, mergeMantineTheme, mergeThemeOverrides } from '@mantine/core';
import { breakpointsTheme } from './breakpoints';
import { colorsTheme } from './colors';
import { componentsTheme } from './components';
import { spacingTheme } from './spacing';
import { typographyTheme } from './typography';

const overrides = mergeThemeOverrides(
  breakpointsTheme,
  colorsTheme,
  componentsTheme,
  spacingTheme,
  typographyTheme
);

export const mantineTheme = mergeMantineTheme(DEFAULT_THEME, overrides);
