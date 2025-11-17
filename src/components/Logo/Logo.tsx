import { Image } from '@mantine/core';

export const Logo = ({ size }: { size: number }) => (
  <Image fit="contain" h={size} w={size} src="/image/bernard.png" alt="Bernard Logo" />
);
