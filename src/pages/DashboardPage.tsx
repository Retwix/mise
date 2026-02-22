import { useEffect, useState } from 'react'
import { Button, Group, Title, Paper, Badge, Text, SimpleGrid } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { MonthPickerInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { IconPlus } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'
import { ManagerShell } from '../components/AppShell'
import type { ScheduleMonth } from '../types'

export function DashboardPage() {
  const [months, setMonths] = useState<ScheduleMonth[]>([])
  const [newMonth, setNewMonth] = useState<string | null>(null)
  const navigate = useNavigate()

  async function load() {
    const { data } = await supabase.from('schedule_months').select('*').order('month', { ascending: false })
    setMonths(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleCreate() {
    if (!newMonth) return
    const month = dayjs(newMonth as string).format('YYYY-MM')
    const { data, error } = await supabase.from('schedule_months').insert({ month }).select().single()
    if (error) { notifications.show({ color: 'red', message: error.message }); return }
    setNewMonth(null)
    load()
    navigate(`/month/${data.id}`)
  }

  return (
    <ManagerShell>
      <Title order={3} mb="md">Planning mensuel</Title>

      <Paper withBorder p="md" mb="xl" maw={400}>
        <Group>
          <MonthPickerInput
            placeholder="Choisir un mois"
            value={newMonth}
            onChange={setNewMonth}
            style={{ flex: 1 }}
          />
          <Button leftSection={<IconPlus size={16} />} onClick={handleCreate} disabled={!newMonth}>
            Créer
          </Button>
        </Group>
      </Paper>

      <SimpleGrid cols={3} spacing="md">
        {months.map(m => (
          <Paper
            key={m.id}
            withBorder
            p="md"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/month/${m.id}`)}
          >
            <Group justify="space-between">
              <Text fw={600}>{dayjs(m.month).format('MMMM YYYY')}</Text>
              <Badge color={m.status === 'published' ? 'green' : 'yellow'}>
                {m.status === 'published' ? 'Publié' : 'Brouillon'}
              </Badge>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>
    </ManagerShell>
  )
}
