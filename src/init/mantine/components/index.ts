import { PartialDeep } from 'type-fest';
import { MantineTheme, mergeThemeOverrides } from '@mantine/core';
import { ThemedMantineButton } from './Button';

export const componentsTheme: PartialDeep<MantineTheme> = mergeThemeOverrides(ThemedMantineButton);
