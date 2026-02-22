import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Center, Stack, Title, Text, Button, Group, Paper, Loader, Alert } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import { supabase } from '../lib/supabase'
import type { Employee, Availability } from '../types'

dayjs.locale('fr')

export function DispoPage() {
  const { token } = useParams<{ token: string }>()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Show next month's calendar
  const targetMonth = dayjs().add(1, 'month')
  const year = targetMonth.year()
  const month = targetMonth.month() + 1
  const daysInMonth = targetMonth.daysInMonth()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('employees').select('*').eq('token_dispo', token).single()
      if (!data) { setNotFound(true); return }
      setEmployee(data)

      const { data: avails } = await supabase
        .from('availabilities')
        .select('*')
        .eq('employee_id', data.id)
        .like('date', `${year}-${String(month).padStart(2, '0')}-%`)

      const set = new Set<string>()
      avails?.filter((a: Availability) => a.is_unavailable).forEach((a: Availability) => set.add(a.date))
      setUnavailableDates(set)
    }
    load()
  }, [token])

  function toggleDay(date: string) {
    setUnavailableDates(prev => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  async function handleSave() {
    if (!employee) return
    setSaving(true)

    const rows = Array.from({ length: daysInMonth }, (_, i) => {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
      return { employee_id: employee.id, date, is_unavailable: unavailableDates.has(date) }
    })

    const { error } = await supabase.from('availabilities').upsert(rows, { onConflict: 'employee_id,date' })
    setSaving(false)
    if (error) { notifications.show({ color: 'red', message: error.message }); return }
    notifications.show({ color: 'green', message: 'Disponibilités enregistrées !' })
  }

  if (notFound) return <Center h="100vh"><Alert color="red">Lien invalide.</Alert></Center>
  if (!employee) return <Center h="100vh"><Loader /></Center>

  return (
    <Center py="xl" px="md">
      <Stack maw={500} w="100%">
        <Title order={3}>Bonjour {employee.name} 👋</Title>
        <Text c="dimmed">
          Coche les jours où tu n'es <b>pas disponible</b> en {targetMonth.format('MMMM YYYY')}.
        </Text>

        <Group gap={8} wrap="wrap">
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const label = dayjs(date).format('ddd D')
            const unavailable = unavailableDates.has(date)
            return (
              <Paper
                key={date}
                withBorder
                p="xs"
                w={64}
                ta="center"
                style={{
                  cursor: 'pointer',
                  backgroundColor: unavailable ? 'var(--mantine-color-red-1)' : undefined,
                  borderColor: unavailable ? 'var(--mantine-color-red-5)' : undefined,
                  textDecoration: unavailable ? 'line-through' : undefined,
                  userSelect: 'none',
                }}
                onClick={() => toggleDay(date)}
              >
                <Text size="xs">{label}</Text>
              </Paper>
            )
          })}
        </Group>

        <Button onClick={handleSave} loading={saving} size="lg" mt="md">
          Confirmer mes dispos
        </Button>
      </Stack>
    </Center>
  )
}
