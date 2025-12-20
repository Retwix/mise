import { Stack } from '@mantine/core';
import { PageTitle } from '@/components/PageTitle';

export const EmployeeIndex = () => {
  return (
    <Stack>
      <PageTitle>
        Employés
        <PageTitle.Subtitle>Your team’s shifts, delivered.</PageTitle.Subtitle>
      </PageTitle>
    </Stack>
  );
};
