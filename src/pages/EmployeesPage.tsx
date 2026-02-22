import { useEffect, useState } from 'react'
import { Table, Button, Group, TextInput, Modal, Stack, Title, ActionIcon, CopyButton, Tooltip, Badge } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconTrash, IconCopy, IconCheck } from '@tabler/icons-react'
import { supabase } from '../lib/supabase'
import { ManagerShell } from '../components/AppShell'
import type { Employee } from '../types'

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  const form = useForm({ initialValues: { name: '', email: '', phone: '' } })

  async function load() {
    const { data } = await supabase.from('employees').select('*').order('name')
    setEmployees(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleAdd(values: typeof form.values) {
    const { error } = await supabase.from('employees').insert(values)
    if (error) { notifications.show({ color: 'red', message: error.message }); return }
    notifications.show({ color: 'green', message: 'Employé ajouté' })
    setModalOpen(false)
    form.reset()
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('employees').delete().eq('id', id)
    load()
  }

  function dispoUrl(token: string) {
    return `${window.location.origin}/dispo/${token}`
  }

  function planningUrl(token: string) {
    return `${window.location.origin}/planning/${token}`
  }

  return (
    <ManagerShell>
      <Group justify="space-between" mb="md">
        <Title order={3}>Employés</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>Ajouter</Button>
      </Group>

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nom</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Lien dispos</Table.Th>
            <Table.Th>Lien planning</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {employees.map(emp => (
            <Table.Tr key={emp.id}>
              <Table.Td>{emp.name}</Table.Td>
              <Table.Td>{emp.email ?? '—'}</Table.Td>
              <Table.Td>
                <CopyButton value={dispoUrl(emp.token_dispo)}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copié !' : dispoUrl(emp.token_dispo)}>
                      <Badge
                        color={copied ? 'green' : 'blue'}
                        style={{ cursor: 'pointer' }}
                        leftSection={copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                        onClick={copy}
                      >
                        Lien dispos
                      </Badge>
                    </Tooltip>
                  )}
                </CopyButton>
              </Table.Td>
              <Table.Td>
                <CopyButton value={planningUrl(emp.token_view)}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copié !' : planningUrl(emp.token_view)}>
                      <Badge
                        color={copied ? 'green' : 'teal'}
                        style={{ cursor: 'pointer' }}
                        leftSection={copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                        onClick={copy}
                      >
                        Lien planning
                      </Badge>
                    </Tooltip>
                  )}
                </CopyButton>
              </Table.Td>
              <Table.Td>
                <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(emp.id)}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Nouvel employé">
        <form onSubmit={form.onSubmit(handleAdd)}>
          <Stack>
            <TextInput label="Nom" {...form.getInputProps('name')} required />
            <TextInput label="Email" {...form.getInputProps('email')} />
            <TextInput label="Téléphone" {...form.getInputProps('phone')} />
            <Button type="submit">Ajouter</Button>
          </Stack>
        </form>
      </Modal>
    </ManagerShell>
  )
}
