import React from 'react';
import { groupBy } from 'remeda';
import { Box, Stack, Text, Title } from '@mantine/core';

type PageTitleProps = {
  children: React.ReactNode;
};

export const PageTitle = ({ children }: PageTitleProps) => {
  const childrenArray = React.Children.toArray(children);
  const { title, subtitle } = groupBy(childrenArray, classify);

  return (
    <Stack>
      <Title fw={500} order={4}>
        {title}
      </Title>
      {subtitle && <Subtitle>{subtitle}</Subtitle>}
    </Stack>
  );
};

function classify(input: unknown) {
  if (React.isValidElement(input) && typeof input !== 'string' && typeof input.type !== 'string') {
    // @ts-ignore
    if (input.type.displayName === 'Subtitle') return 'subtitle';
  }
  return 'title';
}

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
