import { useEffect, useState } from 'react'
import { Table, Button, Group, TextInput, NumberInput, Switch, Modal, Stack, Title, ActionIcon } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { supabase } from '../lib/supabase'
import { ManagerShell } from '../components/AppShell'
import type { ShiftType } from '../types'

export function ShiftTypesPage() {
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  const form = useForm({
    initialValues: { label: '', start_time: '', end_time: '', required_count: 1, is_closing: false },
  })

  async function load() {
    const { data } = await supabase.from('shift_types').select('*').order('start_time')
    setShiftTypes(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleAdd(values: typeof form.values) {
    const { error } = await supabase.from('shift_types').insert(values)
    if (error) { notifications.show({ color: 'red', message: error.message }); return }
    notifications.show({ color: 'green', message: 'Shift ajouté' })
    setModalOpen(false)
    form.reset()
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('shift_types').delete().eq('id', id)
    load()
  }

  return (
    <ManagerShell>
      <Group justify="space-between" mb="md">
        <Title order={3}>Types de shifts</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>Ajouter</Button>
      </Group>

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Label</Table.Th>
            <Table.Th>Début</Table.Th>
            <Table.Th>Fin</Table.Th>
            <Table.Th>Postes requis</Table.Th>
            <Table.Th>Fermeture</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {shiftTypes.map(st => (
            <Table.Tr key={st.id}>
              <Table.Td>{st.label}</Table.Td>
              <Table.Td>{st.start_time}</Table.Td>
              <Table.Td>{st.end_time}</Table.Td>
              <Table.Td>{st.required_count}</Table.Td>
              <Table.Td>{st.is_closing ? 'Oui' : 'Non'}</Table.Td>
              <Table.Td>
                <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(st.id)}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau shift">
        <form onSubmit={form.onSubmit(handleAdd)}>
          <Stack>
            <TextInput label="Label" {...form.getInputProps('label')} required />
            <TextInput label="Heure début (ex: 12:00)" {...form.getInputProps('start_time')} required />
            <TextInput label="Heure fin (ex: 15:00)" {...form.getInputProps('end_time')} required />
            <NumberInput label="Postes requis" min={1} {...form.getInputProps('required_count')} />
            <Switch label="C'est une fermeture" {...form.getInputProps('is_closing', { type: 'checkbox' })} />
            <Button type="submit">Ajouter</Button>
          </Stack>
        </form>
      </Modal>
    </ManagerShell>
  )
}
