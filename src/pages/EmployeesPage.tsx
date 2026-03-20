import { useEffect, useState } from 'react'
import { Table, Button, Group, TextInput, Modal, Stack, Title, ActionIcon, CopyButton, Tooltip, Badge, Text, NumberInput, Select } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconTrash, IconCopy, IconCheck } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'
import { ManagerShell } from '../components/AppShell'
import type { Employee, Role } from '../types'

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set())
  const [roles, setRoles] = useState<Role[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  const form = useForm({ initialValues: { name: '', email: '', phone: '', max_shifts_per_month: null as number | null, role_id: null as string | null } })

  // Next month prefix e.g. "2026-03"
  const nextMonthPrefix = dayjs().add(1, 'month').format('YYYY-MM')

  async function load() {
    const [{ data: emps }, { data: avails }, { data: roleRows }] = await Promise.all([
      supabase.from('employees').select('*').order('name'),
      supabase.from('availabilities').select('employee_id').like('date', `${nextMonthPrefix}-%`),
      supabase.from('roles').select('*').order('name'),
    ])
    setEmployees(emps ?? [])
    setRespondedIds(new Set((avails ?? []).map((a: { employee_id: string }) => a.employee_id)))
    setRoles(roleRows ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleAdd(values: typeof form.values) {
    const { error } = await supabase.from('employees').insert({
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
      max_shifts_per_month: values.max_shifts_per_month,
      role_id: values.role_id,
    })
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
        <Stack gap={0}>
          <Title order={3}>Employés</Title>
          <Text size="xs" c="dimmed">Disponibilités pour {dayjs().add(1, 'month').format('MMMM YYYY')}</Text>
        </Stack>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>Ajouter</Button>
      </Group>

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nom</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Dispos</Table.Th>
            <Table.Th>Lien dispos</Table.Th>
            <Table.Th>Lien planning</Table.Th>
            <Table.Th>Rôle</Table.Th>
            <Table.Th>Max/mois</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {employees.map(emp => (
            <Table.Tr key={emp.id}>
              <Table.Td>{emp.name}</Table.Td>
              <Table.Td>{emp.email ?? '—'}</Table.Td>
              <Table.Td>
                {respondedIds.has(emp.id)
                  ? <Badge color="green">A répondu</Badge>
                  : <Badge color="gray">En attente</Badge>
                }
              </Table.Td>
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
                <Select
                  value={emp.role_id ?? ''}
                  placeholder="—"
                  clearable
                  size="xs"
                  w={120}
                  data={roles.map(r => ({ value: r.id, label: r.name }))}
                  onChange={async (val) => {
                    await supabase
                      .from('employees')
                      .update({ role_id: val || null })
                      .eq('id', emp.id)
                    load()
                  }}
                />
              </Table.Td>
              <Table.Td>
                <NumberInput
                  value={emp.max_shifts_per_month ?? ''}
                  min={1}
                  placeholder="—"
                  w={70}
                  size="xs"
                  styles={{ input: { textAlign: 'center' } }}
                  onChange={async (val) => {
                    await supabase
                      .from('employees')
                      .update({ max_shifts_per_month: val === '' ? null : Number(val) })
                      .eq('id', emp.id)
                    load()
                  }}
                />
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
            <Select
              label="Rôle"
              placeholder="Aucun rôle"
              clearable
              data={roles.map(r => ({ value: r.id, label: r.name }))}
              {...form.getInputProps('role_id')}
            />
            <NumberInput
              label="Max shifts / mois"
              description="Laisser vide pour aucune limite"
              min={1}
              {...form.getInputProps('max_shifts_per_month')}
            />
            <Button type="submit">Ajouter</Button>
          </Stack>
        </form>
      </Modal>
    </ManagerShell>
  )
}
