import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Center, Stack, Title, Text, Paper, Group, Loader, Alert, Badge } from '@mantine/core'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import { supabase } from '../lib/supabase'
import type { Employee, Assignment, ShiftType, ScheduleMonth } from '../types'

dayjs.locale('fr')

type AssignmentFull = Assignment & { shiftType: ShiftType; month: ScheduleMonth }

export function PlanningPage() {
  const { token } = useParams<{ token: string }>()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [assignments, setAssignments] = useState<AssignmentFull[]>([])
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: emp } = await supabase.from('employees').select('*').eq('token_view', token).single()
      if (!emp) { setNotFound(true); setLoading(false); return }
      setEmployee(emp)

      const { data: assigns } = await supabase
        .from('assignments')
        .select('*, schedule_months!inner(*), shift_types(*)')
        .eq('employee_id', emp.id)
        .eq('schedule_months.status', 'published')
        .order('date')

      setAssignments(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (assigns ?? []).map((a: any) => ({
          ...a,
          shiftType: a.shift_types,
          month: a.schedule_months,
        }))
      )
      setLoading(false)
    }
    load()
  }, [token])

  if (loading) return <Center h="100vh"><Loader /></Center>
  if (notFound) return <Center h="100vh"><Alert color="red">Lien invalide.</Alert></Center>

  const byMonth: Record<string, AssignmentFull[]> = {}
  assignments.forEach(a => {
    const m = a.month.month
    if (!byMonth[m]) byMonth[m] = []
    byMonth[m].push(a)
  })

  return (
    <Center py="xl" px="md">
      <Stack maw={500} w="100%">
        <Title order={3}>Bonjour {employee?.name} 👋</Title>
        <Text c="dimmed">Voici tes shifts du mois.</Text>

        {Object.entries(byMonth).sort().map(([month, assigns]) => (
          <Stack key={month}>
            <Text fw={700} tt="capitalize">{dayjs(month).format('MMMM YYYY')}</Text>
            {assigns.map(a => (
              <Paper key={a.id} withBorder p="sm">
                <Group justify="space-between">
                  <Text fw={500} tt="capitalize">{dayjs(a.date).format('dddd D MMMM')}</Text>
                  <Badge color={a.shiftType.is_closing ? 'red' : 'blue'}>
                    {a.shiftType.label}
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">{a.shiftType.start_time} – {a.shiftType.end_time}</Text>
              </Paper>
            ))}
          </Stack>
        ))}

        {assignments.length === 0 && (
          <Text c="dimmed" ta="center">Aucun shift publié pour le moment.</Text>
        )}
      </Stack>
    </Center>
  )
}
