import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Group, Title, Button, Stack, Text, Badge, Paper, Grid, ScrollArea, Loader, Center } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import { supabase } from '../lib/supabase'
import { generateSchedule } from '../lib/algorithm'
import { ManagerShell } from '../components/AppShell'
import type { Employee, ShiftType, ScheduleMonth, Availability, Assignment } from '../types'

dayjs.locale('fr')

export function MonthPage() {
  const { monthId } = useParams<{ monthId: string }>()
  const [scheduleMonth, setScheduleMonth] = useState<ScheduleMonth | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([])
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)

  async function load() {
    const [
      { data: month },
      { data: emps },
      { data: shifts },
      { data: avails },
      { data: assigns },
    ] = await Promise.all([
      supabase.from('schedule_months').select('*').eq('id', monthId).single(),
      supabase.from('employees').select('*').order('name'),
      supabase.from('shift_types').select('*').order('start_time'),
      supabase.from('availabilities').select('*'),
      supabase.from('assignments').select('*').eq('schedule_month_id', monthId),
    ])
    setScheduleMonth(month)
    setEmployees(emps ?? [])
    setShiftTypes(shifts ?? [])
    setAvailabilities(avails ?? [])
    setAssignments(assigns ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [monthId])

  async function handleGenerate() {
    if (!scheduleMonth) return
    setGenerating(true)

    await supabase.from('assignments').delete().eq('schedule_month_id', monthId)

    const [year, month] = scheduleMonth.month.split('-').map(Number)
    const generated = generateSchedule(employees, shiftTypes, year, month, availabilities)

    const rows = generated.map(a => ({ ...a, schedule_month_id: monthId! }))
    const { error } = await supabase.from('assignments').insert(rows)
    setGenerating(false)
    if (error) { notifications.show({ color: 'red', message: error.message }); return }
    notifications.show({ color: 'green', message: 'Planning généré !' })
    load()
  }

  async function handleRemoveAssignment(assignmentId: string) {
    await supabase.from('assignments').delete().eq('id', assignmentId)
    setAssignments(prev => prev.filter(a => a.id !== assignmentId))
  }

  async function handlePublish() {
    setPublishing(true)
    await supabase.from('schedule_months').update({ status: 'published' }).eq('id', monthId)
    setPublishing(false)
    notifications.show({ color: 'green', message: 'Planning publié !' })
    load()
  }

  if (loading) return <ManagerShell><Center h="100%"><Loader /></Center></ManagerShell>
  if (!scheduleMonth) return <ManagerShell><Text>Mois introuvable.</Text></ManagerShell>

  const [year, month] = scheduleMonth.month.split('-').map(Number)
  const daysInMonth = dayjs(scheduleMonth.month).daysInMonth()

  const closingShiftIds = shiftTypes.filter(s => s.is_closing).map(s => s.id)
  const closingCounts: Record<string, number> = {}
  employees.forEach(e => { closingCounts[e.id] = 0 })
  assignments.forEach(a => {
    if (closingShiftIds.includes(a.shift_type_id)) closingCounts[a.employee_id] = (closingCounts[a.employee_id] ?? 0) + 1
  })

  const maxClosings = Math.max(0, ...Object.values(closingCounts))
  const minClosings = Math.min(0, ...Object.values(closingCounts))

  return (
    <ManagerShell>
      <Group justify="space-between" mb="md">
        <Stack gap={0}>
          <Title order={3}>{dayjs(scheduleMonth.month).format('MMMM YYYY')}</Title>
          <Badge color={scheduleMonth.status === 'published' ? 'green' : 'yellow'}>
            {scheduleMonth.status === 'published' ? 'Publié' : 'Brouillon'}
          </Badge>
        </Stack>
        <Group>
          <Button onClick={handleGenerate} loading={generating} variant="outline">
            Générer le planning
          </Button>
          {scheduleMonth.status === 'draft' && (
            <Button onClick={handlePublish} loading={publishing} color="green">
              Publier
            </Button>
          )}
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={9}>
          <ScrollArea>
            <Stack gap={4}>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayAssignments = assignments.filter(a => a.date === date)
                return (
                  <Paper key={date} withBorder p="xs">
                    <Group gap="md" align="flex-start" wrap="nowrap">
                      <Text w={80} size="sm" fw={600} c="dimmed">
                        {dayjs(date).format('ddd D')}
                      </Text>
                      <Group gap={8} wrap="wrap" style={{ flex: 1 }}>
                        {shiftTypes.map(st => {
                          const shiftAssigns = dayAssignments.filter(a => a.shift_type_id === st.id)
                          return (
                            <Paper key={st.id} withBorder p={6} miw={120}>
                              <Text size="xs" c="dimmed" mb={4}>{st.label}</Text>
                              <Stack gap={4}>
                                {shiftAssigns.map(a => {
                                  const emp = employees.find(e => e.id === a.employee_id)
                                  return (
                                    <Badge
                                      key={a.id}
                                      variant="light"
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => handleRemoveAssignment(a.id)}
                                      title="Cliquer pour retirer"
                                    >
                                      {emp?.name ?? '?'}
                                    </Badge>
                                  )
                                })}
                                {shiftAssigns.length < st.required_count && (
                                  <Text size="xs" c="red">
                                    {st.required_count - shiftAssigns.length} poste(s) manquant(s)
                                  </Text>
                                )}
                              </Stack>
                            </Paper>
                          )
                        })}
                      </Group>
                    </Group>
                  </Paper>
                )
              })}
            </Stack>
          </ScrollArea>
        </Grid.Col>

        <Grid.Col span={3}>
          <Paper withBorder p="md" pos="sticky" top={16}>
            <Title order={5} mb="sm">Fermetures</Title>
            <Text size="xs" c="dimmed" mb="md">Écart max: {maxClosings - minClosings}</Text>
            <Stack gap={6}>
              {employees
                .sort((a, b) => (closingCounts[b.id] ?? 0) - (closingCounts[a.id] ?? 0))
                .map(emp => {
                  const count = closingCounts[emp.id] ?? 0
                  const isHigh = count === maxClosings && maxClosings - minClosings > 2
                  return (
                    <Group key={emp.id} justify="space-between">
                      <Text size="sm">{emp.name}</Text>
                      <Badge color={isHigh ? 'red' : 'green'}>{count}</Badge>
                    </Group>
                  )
                })}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </ManagerShell>
  )
}
