# Restaurant Scheduling MVP — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web app that lets a restaurant manager generate a monthly staff schedule, with employees submitting unavailability via a unique link and viewing their personal schedule via another link.

**Architecture:** React SPA with Supabase as backend (PostgreSQL + Auth). Manager authenticates with email/password. Employees access their pages via UUID tokens in the URL (no account). The scheduling algorithm is a pure TypeScript function (greedy, fairness-aware).

**Tech Stack:** React 18, Vite, TypeScript, Mantine v7, Supabase JS v2, React Router v6, Vitest

---

## Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`, `src/App.tsx`, `index.html`
- Create: `.env.example`, `.gitignore`

**Step 1: Scaffold Vite + React + TypeScript**

```bash
npm create vite@latest . -- --template react-ts
npm install
```

**Step 2: Install dependencies**

```bash
npm install @mantine/core @mantine/hooks @mantine/dates @mantine/notifications @mantine/form
npm install @tabler/icons-react dayjs
npm install @supabase/supabase-js
npm install react-router-dom
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

**Step 3: Configure Vite for tests**

Replace content of `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

**Step 4: Create test setup file**

Create `src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

**Step 5: Create `.env.example`**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Create `.env` (copy from `.env.example`, fill in real values after Supabase setup).

**Step 6: Create `.gitignore`**

```
node_modules
dist
.env
.env.local
```

**Step 7: Verify setup compiles**

```bash
npm run build
```
Expected: Build succeeds with no errors.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + Mantine + Supabase"
```

---

## Task 2: Supabase schema

**Files:**
- Create: `supabase/schema.sql`
- Create: `src/types/index.ts`

**Step 1: Create a Supabase project**

Go to https://supabase.com → New project. Copy the URL and anon key into `.env`.

**Step 2: Write the schema**

Create `supabase/schema.sql` and run it in Supabase SQL editor:

```sql
-- Employees
create table employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  token_dispo uuid not null default gen_random_uuid(),
  token_view uuid not null default gen_random_uuid(),
  created_at timestamptz default now()
);

-- Shift types (e.g. "Ouverture 12h-15h", "Fermeture 18h-23h")
create table shift_types (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  start_time text not null, -- "12:00"
  end_time text not null,   -- "15:00"
  required_count int not null default 1,
  is_closing boolean not null default false,
  created_at timestamptz default now()
);

-- Monthly schedules
create table schedule_months (
  id uuid primary key default gen_random_uuid(),
  month text not null, -- "2026-03"
  status text not null default 'draft', -- draft | published
  created_at timestamptz default now(),
  unique(month)
);

-- Employee unavailability
create table availabilities (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  date text not null, -- "2026-03-15"
  is_unavailable boolean not null default true,
  unique(employee_id, date)
);

-- Assignments (generated + manually adjustable)
create table assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  schedule_month_id uuid not null references schedule_months(id) on delete cascade,
  date text not null, -- "2026-03-15"
  shift_type_id uuid not null references shift_types(id) on delete cascade,
  unique(employee_id, date, shift_type_id)
);
```

**Step 3: Set up RLS policies**

Run in Supabase SQL editor:

```sql
-- Enable RLS
alter table employees enable row level security;
alter table shift_types enable row level security;
alter table schedule_months enable row level security;
alter table availabilities enable row level security;
alter table assignments enable row level security;

-- Manager (authenticated) can do everything
create policy "manager full access employees" on employees for all to authenticated using (true) with check (true);
create policy "manager full access shift_types" on shift_types for all to authenticated using (true) with check (true);
create policy "manager full access schedule_months" on schedule_months for all to authenticated using (true) with check (true);
create policy "manager full access availabilities" on availabilities for all to authenticated using (true) with check (true);
create policy "manager full access assignments" on assignments for all to authenticated using (true) with check (true);

-- Anon can read employees (for token lookup on dispo/planning pages)
create policy "anon read employees" on employees for select to anon using (true);

-- Anon can read/write availabilities (employee submits via token)
create policy "anon read availabilities" on availabilities for select to anon using (true);
create policy "anon write availabilities" on availabilities for insert to anon with check (true);
create policy "anon update availabilities" on availabilities for update to anon using (true);

-- Anon can read shift_types and published assignments (for planning page)
create policy "anon read shift_types" on shift_types for select to anon using (true);
create policy "anon read published assignments" on assignments for select to anon using (
  exists (
    select 1 from schedule_months sm
    where sm.id = assignments.schedule_month_id
    and sm.status = 'published'
  )
);
create policy "anon read schedule_months" on schedule_months for select to anon using (true);
```

**Step 4: Create TypeScript types**

Create `src/types/index.ts`:

```typescript
export type Employee = {
  id: string
  name: string
  email: string | null
  phone: string | null
  token_dispo: string
  token_view: string
  created_at: string
}

export type ShiftType = {
  id: string
  label: string
  start_time: string
  end_time: string
  required_count: number
  is_closing: boolean
  created_at: string
}

export type ScheduleMonth = {
  id: string
  month: string // "2026-03"
  status: 'draft' | 'published'
  created_at: string
}

export type Availability = {
  id: string
  employee_id: string
  date: string // "2026-03-15"
  is_unavailable: boolean
}

export type Assignment = {
  id: string
  employee_id: string
  schedule_month_id: string
  date: string
  shift_type_id: string
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: Supabase schema, RLS policies, TypeScript types"
```

---

## Task 3: Supabase client + routing skeleton

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/App.tsx`
- Create: `src/pages/LoginPage.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/MonthPage.tsx`, `src/pages/EmployeesPage.tsx`, `src/pages/ShiftTypesPage.tsx`, `src/pages/DispoPage.tsx`, `src/pages/PlanningPage.tsx`

**Step 1: Create Supabase client**

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Step 2: Create page stubs**

Create each page as a minimal stub. Example for `src/pages/LoginPage.tsx`:

```typescript
export function LoginPage() {
  return <div>Login</div>
}
```

Repeat for: `DashboardPage`, `MonthPage`, `EmployeesPage`, `ShiftTypesPage`, `DispoPage`, `PlanningPage`.

**Step 3: Set up routing in App.tsx**

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { MonthPage } from './pages/MonthPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { ShiftTypesPage } from './pages/ShiftTypesPage'
import { DispoPage } from './pages/DispoPage'
import { PlanningPage } from './pages/PlanningPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/month/:monthId" element={<MonthPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/shift-types" element={<ShiftTypesPage />} />
        <Route path="/dispo/:token" element={<DispoPage />} />
        <Route path="/planning/:token" element={<PlanningPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

**Step 4: Wrap app with Mantine in main.tsx**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider>
      <Notifications />
      <App />
    </MantineProvider>
  </StrictMode>
)
```

**Step 5: Verify app runs**

```bash
npm run dev
```
Expected: App loads at http://localhost:5173, redirects to /login.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: Supabase client, routing skeleton"
```

---

## Task 4: Scheduling algorithm (TDD)

**Files:**
- Create: `src/lib/algorithm.ts`
- Create: `src/lib/algorithm.test.ts`

**Step 1: Write failing tests**

Create `src/lib/algorithm.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateSchedule } from './algorithm'
import type { Employee, ShiftType, Availability, Assignment } from '../types'

const emp1: Employee = { id: 'e1', name: 'Alice', email: null, phone: null, token_dispo: 't1', token_view: 'v1', created_at: '' }
const emp2: Employee = { id: 'e2', name: 'Bob', email: null, phone: null, token_dispo: 't2', token_view: 'v2', created_at: '' }
const emp3: Employee = { id: 'e3', name: 'Carol', email: null, phone: null, token_dispo: 't3', token_view: 'v3', created_at: '' }

const closing: ShiftType = { id: 's1', label: 'Fermeture', start_time: '18:00', end_time: '23:00', required_count: 2, is_closing: true, created_at: '' }
const opening: ShiftType = { id: 's2', label: 'Ouverture', start_time: '12:00', end_time: '15:00', required_count: 1, is_closing: false, created_at: '' }

describe('generateSchedule', () => {
  it('assigns required_count employees per shift per day', () => {
    const result = generateSchedule([emp1, emp2, emp3], [closing], 2026, 3, [])
    const day1Closings = result.filter(a => a.date === '2026-03-01' && a.shift_type_id === 's1')
    expect(day1Closings).toHaveLength(2)
  })

  it('never assigns an unavailable employee', () => {
    const unavail: Availability = { id: 'a1', employee_id: 'e1', date: '2026-03-01', is_unavailable: true }
    const result = generateSchedule([emp1, emp2, emp3], [closing], 2026, 3, [unavail])
    const day1 = result.filter(a => a.date === '2026-03-01' && a.shift_type_id === 's1')
    expect(day1.map(a => a.employee_id)).not.toContain('e1')
  })

  it('never assigns the same employee twice on the same day', () => {
    const result = generateSchedule([emp1, emp2, emp3], [closing, opening], 2026, 3, [])
    const emp1Day1 = result.filter(a => a.date === '2026-03-01' && a.employee_id === 'e1')
    expect(emp1Day1).toHaveLength(1)
  })

  it('balances closing shifts across employees', () => {
    const employees = [emp1, emp2, emp3]
    const result = generateSchedule(employees, [closing], 2026, 3, [])
    const counts = employees.map(e => result.filter(a => a.employee_id === e.id && a.shift_type_id === 's1').length)
    const max = Math.max(...counts)
    const min = Math.min(...counts)
    expect(max - min).toBeLessThanOrEqual(2)
  })

  it('does not assign more employees than available', () => {
    // Only 1 employee available on day 1 but required_count is 2
    const unavail1: Availability = { id: 'a1', employee_id: 'e1', date: '2026-03-01', is_unavailable: true }
    const unavail2: Availability = { id: 'a2', employee_id: 'e2', date: '2026-03-01', is_unavailable: true }
    const result = generateSchedule([emp1, emp2, emp3], [closing], 2026, 3, [unavail1, unavail2])
    const day1 = result.filter(a => a.date === '2026-03-01' && a.shift_type_id === 's1')
    expect(day1).toHaveLength(1)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/algorithm.test.ts
```
Expected: FAIL — "generateSchedule is not a function"

**Step 3: Implement the algorithm**

Create `src/lib/algorithm.ts`:

```typescript
import dayjs from 'dayjs'
import type { Employee, ShiftType, Availability, Assignment } from '../types'

export function generateSchedule(
  employees: Employee[],
  shiftTypes: ShiftType[],
  year: number,
  month: number,
  availabilities: Availability[]
): Omit<Assignment, 'id' | 'schedule_month_id'>[] {
  const daysInMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).daysInMonth()
  const unavailSet = new Set(availabilities.filter(a => a.is_unavailable).map(a => `${a.employee_id}:${a.date}`))

  const closingCounts: Record<string, number> = Object.fromEntries(employees.map(e => [e.id, 0]))
  const totalCounts: Record<string, number> = Object.fromEntries(employees.map(e => [e.id, 0]))

  const result: Omit<Assignment, 'id' | 'schedule_month_id'>[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const assignedToday = new Set<string>()

    for (const shift of shiftTypes) {
      const available = employees.filter(e =>
        !unavailSet.has(`${e.id}:${date}`) && !assignedToday.has(e.id)
      )

      const sorted = [...available].sort((a, b) => {
        if (shift.is_closing) return closingCounts[a.id] - closingCounts[b.id]
        return totalCounts[a.id] - totalCounts[b.id]
      })

      const assigned = sorted.slice(0, shift.required_count)

      for (const emp of assigned) {
        result.push({ employee_id: emp.id, date, shift_type_id: shift.id })
        assignedToday.add(emp.id)
        totalCounts[emp.id]++
        if (shift.is_closing) closingCounts[emp.id]++
      }
    }
  }

  return result
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/algorithm.test.ts
```
Expected: All 5 tests PASS.

**Step 5: Commit**

```bash
git add src/lib/algorithm.ts src/lib/algorithm.test.ts
git commit -m "feat: scheduling algorithm with fairness balancing (TDD)"
```

---

## Task 5: Manager auth — Login page

**Files:**
- Modify: `src/pages/LoginPage.tsx`
- Create: `src/components/RequireAuth.tsx`

**Step 1: Implement LoginPage**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TextInput, PasswordInput, Button, Stack, Title, Paper, Center } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      notifications.show({ color: 'red', message: error.message })
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <Center h="100vh">
      <Paper p="xl" w={360} withBorder>
        <Stack>
          <Title order={2}>Connexion gérant</Title>
          <TextInput label="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <PasswordInput label="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} />
          <Button onClick={handleLogin} loading={loading}>Se connecter</Button>
        </Stack>
      </Paper>
    </Center>
  )
}
```

**Step 2: Create auth guard**

Create `src/components/RequireAuth.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Center, Loader } from '@mantine/core'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ? 'authenticated' : 'unauthenticated')
    })
  }, [])

  if (session === 'loading') return <Center h="100vh"><Loader /></Center>
  if (session === 'unauthenticated') return <Navigate to="/login" replace />
  return <>{children}</>
}
```

**Step 3: Wrap manager routes in App.tsx**

```typescript
// Wrap DashboardPage, MonthPage, EmployeesPage, ShiftTypesPage with RequireAuth:
<Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
<Route path="/month/:monthId" element={<RequireAuth><MonthPage /></RequireAuth>} />
<Route path="/employees" element={<RequireAuth><EmployeesPage /></RequireAuth>} />
<Route path="/shift-types" element={<RequireAuth><ShiftTypesPage /></RequireAuth>} />
```

**Step 4: Create a manager account in Supabase**

In Supabase dashboard → Authentication → Users → Invite user (or use the SQL editor):
```sql
-- Use Supabase dashboard UI to create the first manager account
```

**Step 5: Test login manually**

Run `npm run dev`, go to http://localhost:5173/login, log in. Expected: redirects to /dashboard.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: manager login page with Supabase auth"
```

---

## Task 6: Manager layout + navigation

**Files:**
- Create: `src/components/AppShell.tsx`
- Modify: `src/pages/DashboardPage.tsx`, `src/pages/EmployeesPage.tsx`, `src/pages/ShiftTypesPage.tsx`

**Step 1: Create AppShell with nav**

Create `src/components/AppShell.tsx`:

```typescript
import { AppShell, NavLink, Group, Title, Button } from '@mantine/core'
import { useNavigate, useLocation } from 'react-router-dom'
import { IconCalendar, IconUsers, IconClock, IconLogout } from '@tabler/icons-react'
import { supabase } from '../lib/supabase'

const navItems = [
  { label: 'Planning', path: '/dashboard', icon: IconCalendar },
  { label: 'Employés', path: '/employees', icon: IconUsers },
  { label: 'Types de shifts', path: '/shift-types', icon: IconClock },
]

export function ManagerShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <AppShell navbar={{ width: 220, breakpoint: 'sm' }} padding="md">
      <AppShell.Navbar p="md">
        <Title order={4} mb="md">Mise en place</Title>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            label={item.label}
            leftSection={<item.icon size={16} />}
            active={location.pathname === item.path}
            onClick={() => navigate(item.path)}
            mb={4}
          />
        ))}
        <Button
          variant="subtle"
          color="red"
          leftSection={<IconLogout size={16} />}
          mt="auto"
          onClick={handleLogout}
        >
          Déconnexion
        </Button>
      </AppShell.Navbar>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  )
}
```

**Step 2: Wrap manager pages with ManagerShell in their respective page files**

Example for DashboardPage:
```typescript
import { ManagerShell } from '../components/AppShell'
export function DashboardPage() {
  return <ManagerShell><div>Dashboard</div></ManagerShell>
}
```

Repeat for EmployeesPage, ShiftTypesPage.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: manager app shell with navigation"
```

---

## Task 7: Shift types page (manager)

**Files:**
- Modify: `src/pages/ShiftTypesPage.tsx`

**Step 1: Implement ShiftTypesPage**

```typescript
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
```

**Step 2: Test manually** — add a "Fermeture 18h-23h" shift, verify it appears in the table.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: shift types CRUD page"
```

---

## Task 8: Employees page (manager)

**Files:**
- Modify: `src/pages/EmployeesPage.tsx`

**Step 1: Implement EmployeesPage**

```typescript
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
```

**Step 2: Test manually** — add 2-3 test employees, verify copy buttons work.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: employees CRUD page with token copy links"
```

---

## Task 9: Dashboard — Month management

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

**Step 1: Implement DashboardPage**

```typescript
import { useEffect, useState } from 'react'
import { Stack, Button, Group, Title, Paper, Badge, Text, SimpleGrid } from '@mantine/core'
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
  const [newMonth, setNewMonth] = useState<Date | null>(null)
  const navigate = useNavigate()

  async function load() {
    const { data } = await supabase.from('schedule_months').select('*').order('month', { ascending: false })
    setMonths(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleCreate() {
    if (!newMonth) return
    const month = dayjs(newMonth).format('YYYY-MM')
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
```

**Step 2: Test manually** — create a month, verify redirect to month page.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: dashboard with month creation and listing"
```

---

## Task 10: Employee availability page (`/dispo/:token`)

**Files:**
- Modify: `src/pages/DispoPage.tsx`

**Step 1: Implement DispoPage**

```typescript
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
      avails?.filter(a => a.is_unavailable).forEach(a => set.add(a.date))
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
```

**Step 2: Test manually** — visit `/dispo/{token}` for a test employee, toggle days, confirm.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: employee availability input page"
```

---

## Task 11: Month page — Generate, grid, fairness sidebar

**Files:**
- Modify: `src/pages/MonthPage.tsx`

**Step 1: Implement MonthPage**

This is the most complex page. Break it into sub-steps.

Create `src/pages/MonthPage.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Group, Title, Button, Stack, Text, Badge, Paper, Grid, ScrollArea, Loader, Center } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import { supabase } from '../lib/supabase'
import { generateSchedule } from '../lib/algorithm'
import { ManagerShell } from '../components/AppShell'
import type { Employee, ShiftType, ScheduleMonth, Availability, Assignment } from '../types'

dayjs.locale('fr')

type AssignmentWithDetails = Assignment & { employee: Employee; shiftType: ShiftType }

export function MonthPage() {
  const { monthId } = useParams<{ monthId: string }>()
  const navigate = useNavigate()
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

    // Delete existing assignments for this month
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

  // Closing counts per employee
  const closingShiftIds = shiftTypes.filter(s => s.is_closing).map(s => s.id)
  const closingCounts: Record<string, number> = {}
  employees.forEach(e => { closingCounts[e.id] = 0 })
  assignments.forEach(a => {
    if (closingShiftIds.includes(a.shift_type_id)) closingCounts[a.employee_id] = (closingCounts[a.employee_id] ?? 0) + 1
  })

  const maxClosings = Math.max(...Object.values(closingCounts))
  const minClosings = Math.min(...Object.values(closingCounts))

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
```

**Step 2: Test manually**

1. Go to a month page
2. Click "Générer le planning" — verify assignments appear
3. Click a badge to remove an assignment
4. Check fairness sidebar updates

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: month page with grid, generation, manual removal, fairness sidebar"
```

---

## Task 12: Employee personal planning page (`/planning/:token`)

**Files:**
- Modify: `src/pages/PlanningPage.tsx`

**Step 1: Implement PlanningPage**

```typescript
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Center, Stack, Title, Text, Paper, Group, Loader, Alert, Badge } from '@mantine/core'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import { supabase } from '../lib/supabase'
import type { Employee, Assignment, ShiftType, ScheduleMonth } from '../types'

dayjs.locale('fr')

export function PlanningPage() {
  const { token } = useParams<{ token: string }>()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [assignments, setAssignments] = useState<(Assignment & { shiftType: ShiftType; month: ScheduleMonth })[]>([])
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

  // Group by month
  const byMonth: Record<string, typeof assignments> = {}
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
```

**Step 2: Test manually**

1. Publish a month
2. Visit `/planning/{token_view}` for an employee
3. Verify only their shifts appear, only from published months

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: employee personal planning page"
```

---

## Task 13: Final polish + deployment

**Files:**
- Modify: `src/pages/MonthPage.tsx` (availability indicators)
- Create: `vercel.json`

**Step 1: Add availability response indicator on employees page**

In `EmployeesPage.tsx`, after loading employees, also fetch availabilities to show which employees have responded for the current month. Add a `Badge color="green">A répondu</Badge>` or `Badge color="gray">En attente</Badge>` per employee.

**Step 2: Add `vercel.json` for SPA routing**

Create `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Step 3: Deploy to Vercel**

```bash
npm install -g vercel
vercel --prod
```

Set environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: vercel deployment config"
```

---

## Summary

| Task | What it builds |
|------|---------------|
| 1 | Project scaffolding (Vite + Mantine + Supabase + Router) |
| 2 | Supabase schema + RLS + TypeScript types |
| 3 | Supabase client + routing skeleton |
| 4 | Scheduling algorithm (TDD with Vitest) |
| 5 | Manager login + auth guard |
| 6 | Manager app shell + navigation |
| 7 | Shift types CRUD |
| 8 | Employees CRUD + token copy links |
| 9 | Dashboard — month creation + listing |
| 10 | Employee availability input page (`/dispo/:token`) |
| 11 | Month page — generate, grid, manual removal, fairness sidebar |
| 12 | Employee personal planning page (`/planning/:token`) |
| 13 | Polish + Vercel deployment |
