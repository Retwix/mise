import React from 'react';
import { groupBy, isEmpty } from 'remeda';
import { Box, Group, Stack, Text, Title } from '@mantine/core';

type PageTitleProps = {
  children: React.ReactNode;
};

export const PageTitle = ({ children }: PageTitleProps) => {
  const childrenArray = React.Children.toArray(children);
  const { actions, subtitle, title } = groupBy(childrenArray, classify);

  return (
    <Group justify="space-between">
      <Stack>
        <Title fw={500} order={4}>
          {title}
        </Title>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
      </Stack>
      {actions && <TitleActions>{actions}</TitleActions>}
    </Group>
  );
};

function classify(input: unknown) {
  if (React.isValidElement(input) && typeof input !== 'string' && typeof input.type !== 'string') {
    // @ts-ignore
    if (input.type.displayName === 'TitleActions') return 'actions';
    // @ts-ignore
    if (input.type.displayName === 'Subtitle') return 'subtitle';
    // @ts-ignore
    if (input.type.displayName === 'Back') return 'back';
  }
  return 'title';
}

// #region Actions
interface TitleActionsProps {
  children: React.ReactNode;
}

const TitleActions = ({ children }: TitleActionsProps) => {
  if (children == null) return null;
  return <Group>{children}</Group>;
};

TitleActions.displayName = 'TitleActions';
// #endregion

interface SubtitleProps {
  children: React.ReactNode;
}

const Subtitle = ({ children }: SubtitleProps) => {
  if (children == null) return null;
  return (
    <Text c="dimmed" size="sm" fw={300}>
      {children}
    </Text>
  );
};

PageTitle.Subtitle = Subtitle;
PageTitle.Actions = TitleActions;
