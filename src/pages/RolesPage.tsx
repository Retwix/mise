import {
  ActionIcon, Badge, Button, Group, Modal,
  NumberInput, Stack, Table, Text, TextInput, Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { ManagerShell } from '../components/AppShell'
import { supabase } from '../lib/supabase'
import type { Role } from '../types'

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const form = useForm({ initialValues: { name: '', max_hours_per_month: null as number | null } })

  async function load() {
    const { data } = await supabase.from('roles').select('*').order('name')
    setRoles(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleAdd(values: typeof form.values) {
    const { error } = await supabase.from('roles').insert({
      name: values.name,
      max_hours_per_month: values.max_hours_per_month,
    })
    if (error) { notifications.show({ color: 'red', message: error.message }); return }
    notifications.show({ color: 'green', message: 'Rôle ajouté' })
    setModalOpen(false)
    form.reset()
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('roles').delete().eq('id', id)
    load()
  }

  return (
    <ManagerShell>
      <Group justify="space-between" mb="md">
        <Title order={3}>Rôles</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
          Ajouter
        </Button>
      </Group>

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nom</Table.Th>
            <Table.Th>Max heures / mois</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {roles.map(role => (
            <Table.Tr key={role.id}>
              <Table.Td>{role.name}</Table.Td>
              <Table.Td>
                {role.max_hours_per_month != null
                  ? <Badge color="blue">{role.max_hours_per_month} h/mois</Badge>
                  : <Text size="sm" c="dimmed">Illimité</Text>
                }
              </Table.Td>
              <Table.Td>
                <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(role.id)}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau rôle">
        <form onSubmit={form.onSubmit(handleAdd)}>
          <Stack>
            <TextInput label="Nom" required {...form.getInputProps('name')} />
            <NumberInput
              label="Max heures / mois"
              description="Laisser vide pour aucune limite"
              min={1}
              {...form.getInputProps('max_hours_per_month')}
            />
            <Button type="submit">Ajouter</Button>
          </Stack>
        </form>
      </Modal>
    </ManagerShell>
  )
}
