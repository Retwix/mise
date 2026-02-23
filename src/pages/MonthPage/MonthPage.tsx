import { Center, Grid, Loader, Text } from '@mantine/core'
import { useParams } from 'react-router-dom'
import { ManagerShell } from '../../components/AppShell'
import { ClosingStatsSidebar } from './components/ClosingStatsSidebar'
import { MonthHeader } from './components/MonthHeader'
import { ScheduleGrid } from './components/ScheduleGrid'
import { useAssignments } from './hooks/useAssignments'
import { useMonthData } from './hooks/useMonthData'

export function MonthPage() {
  const { monthId } = useParams<{ monthId: string }>()
  const { scheduleMonth, employees, shiftTypes, availabilities, isLoading: dataLoading } =
    useMonthData(monthId!)
  const {
    assignments,
    isLoading: assignmentsLoading,
    generate,
    remove,
    publish,
    generating,
    publishing,
    closingCounts,
    maxClosings,
    minClosings,
    totalCounts,
  } = useAssignments(monthId!, scheduleMonth, employees, shiftTypes, availabilities)

  if (dataLoading || assignmentsLoading)
    return (
      <ManagerShell>
        <Center h="100%">
          <Loader />
        </Center>
      </ManagerShell>
    )

  if (!scheduleMonth)
    return (
      <ManagerShell>
        <Text>Mois introuvable.</Text>
      </ManagerShell>
    )

  return (
    <ManagerShell>
      <MonthHeader
        scheduleMonth={scheduleMonth}
        onGenerate={generate}
        onPublish={publish}
        generating={generating}
        publishing={publishing}
      />
      <Grid>
        <Grid.Col span={9}>
          <ScheduleGrid
            scheduleMonth={scheduleMonth}
            employees={employees}
            shiftTypes={shiftTypes}
            assignments={assignments}
            onRemove={remove}
          />
        </Grid.Col>
        <Grid.Col span={3}>
          <ClosingStatsSidebar
            employees={employees}
            closingCounts={closingCounts}
            maxClosings={maxClosings}
            minClosings={minClosings}
            totalCounts={totalCounts}
          />
        </Grid.Col>
      </Grid>
    </ManagerShell>
  )
}
