# Total Shifts Sidebar + Part-time Cap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show per-employee total shift counts in the sidebar, and let the manager cap how many shifts/month an employee can be assigned.

**Architecture:** Add `max_shifts_per_month` (nullable int) to the DB and `Employee` type; thread it into the algorithm's candidate filter; expose `totalCounts` from `useAssignments`; render both counts in `ClosingStatsSidebar`; add a form field + inline table input in `EmployeesPage`.

**Tech Stack:** React 18, TypeScript, Mantine v7, Supabase (PostgreSQL), TanStack Query, Vitest

---

### Task 1: DB migration + type update

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/types/index.ts`

**Step 1: Add column to schema.sql**

In `supabase/schema.sql`, add one line to the `employees` table definition (after the `created_at` line):

```sql
create table employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  token_dispo uuid not null default gen_random_uuid(),
  token_view uuid not null default gen_random_uuid(),
  created_at timestamptz default now(),
  max_shifts_per_month integer
);
```

**Step 2: Run migration against live Supabase DB**

In the Supabase dashboard SQL editor (or via CLI), run:
```sql
alter table employees add column max_shifts_per_month integer;
```

**Step 3: Update the Employee type**

In `src/types/index.ts`, add the field to `Employee`:
```ts
export type Employee = {
  id: string
  name: string
  email: string | null
  phone: string | null
  token_dispo: string
  token_view: string
  created_at: string
  max_shifts_per_month: number | null
}
```

**Step 4: Fix test fixtures (TypeScript will fail until fixtures include the new field)**

In `src/lib/algorithm.test.ts`, add `max_shifts_per_month: null` to every employee fixture:
```ts
const emp1: Employee = { id: 'e1', name: 'Alice', email: null, phone: null, token_dispo: 't1', token_view: 'v1', created_at: '', max_shifts_per_month: null }
const emp2: Employee = { id: 'e2', name: 'Bob', email: null, phone: null, token_dispo: 't2', token_view: 'v2', created_at: '', max_shifts_per_month: null }
const emp3: Employee = { id: 'e3', name: 'Carol', email: null, phone: null, token_dispo: 't3', token_view: 'v3', created_at: '', max_shifts_per_month: null }
```

**Step 5: Verify tests still pass**

```bash
npx vitest run
```
Expected: 5/5 passing.

**Step 6: Commit**
```bash
git add supabase/schema.sql src/types/index.ts src/lib/algorithm.test.ts
git commit -m "feat: add max_shifts_per_month to Employee type and schema"
```

---

### Task 2: Algorithm cap (TDD)

**Files:**
- Modify: `src/lib/algorithm.ts`
- Modify: `src/lib/algorithm.test.ts`

**Step 1: Write the failing test**

Add this test inside the `describe('generateSchedule')` block in `src/lib/algorithm.test.ts`:

```ts
it('never exceeds max_shifts_per_month for a capped employee', () => {
  const capped: Employee = { ...emp1, max_shifts_per_month: 3 }
  // March 2026 has 31 days, closing requires 2 employees per day
  // Without a cap emp1 would get ~20 shifts; with cap=3 should get ≤3
  const result = generateSchedule([capped, emp2, emp3], [closing], 2026, 3, [])
  const cappedCount = result.filter(a => a.employee_id === 'e1').length
  expect(cappedCount).toBeLessThanOrEqual(3)
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run
```
Expected: 5 pass, 1 fail — the new test fails because the algorithm ignores the cap.

**Step 3: Implement the cap in the algorithm**

In `src/lib/algorithm.ts`, add the cap condition to the `available` filter (line 24):

```ts
const available = employees.filter(e =>
  !unavailSet.has(`${e.id}:${date}`) &&
  !assignedToday.has(e.id) &&
  (e.max_shifts_per_month == null || totalCounts[e.id] < e.max_shifts_per_month)
)
```

**Step 4: Run tests to verify all pass**

```bash
npx vitest run
```
Expected: 6/6 passing.

**Step 5: Commit**
```bash
git add src/lib/algorithm.ts src/lib/algorithm.test.ts
git commit -m "feat: respect max_shifts_per_month cap in schedule generation"
```

---

### Task 3: Expose totalCounts from useAssignments + update sidebar

**Files:**
- Modify: `src/pages/MonthPage/hooks/useAssignments.ts`
- Modify: `src/pages/MonthPage/components/ClosingStatsSidebar.tsx`
- Modify: `src/pages/MonthPage/MonthPage.tsx`

**Step 1: Compute and return totalCounts in useAssignments**

In `src/pages/MonthPage/hooks/useAssignments.ts`, add `totalCounts` derivation right after the `closingCounts` block (before the `return`):

```ts
const totalCounts: Record<string, number> = {}
employees.forEach((e) => { totalCounts[e.id] = 0 })
assignments.forEach((a) => {
  totalCounts[a.employee_id] = (totalCounts[a.employee_id] ?? 0) + 1
})
```

Add `totalCounts` to the return object:
```ts
return {
  assignments,
  isLoading,
  generate: generateMutation.mutate,
  remove: removeMutation.mutate,
  publish: publishMutation.mutate,
  generating: generateMutation.isPending,
  publishing: publishMutation.isPending,
  closingCounts,
  maxClosings,
  minClosings,
  totalCounts,
}
```

**Step 2: Add totalCounts prop to ClosingStatsSidebar**

Replace the `Props` type and component in `src/pages/MonthPage/components/ClosingStatsSidebar.tsx`:

```tsx
type Props = {
  employees: Employee[]
  closingCounts: Record<string, number>
  maxClosings: number
  minClosings: number
  totalCounts: Record<string, number>
}

export function ClosingStatsSidebar({ employees, closingCounts, maxClosings, minClosings, totalCounts }: Props) {
  return (
    <Paper withBorder p="md" pos="sticky" top={16}>
      <Title order={5} mb="sm">
        Fermetures
      </Title>
      <Text size="xs" c="dimmed" mb="md">
        Écart max: {maxClosings - minClosings}
      </Text>
      <Stack gap={6}>
        {[...employees]
          .sort((a, b) => (closingCounts[b.id] ?? 0) - (closingCounts[a.id] ?? 0))
          .map((emp) => {
            const count = closingCounts[emp.id] ?? 0
            const isHigh = count === maxClosings && maxClosings - minClosings > 2
            const total = totalCounts[emp.id] ?? 0
            return (
              <Group key={emp.id} justify="space-between">
                <Text size="sm">{emp.name}</Text>
                <Group gap={4}>
                  <Badge color={isHigh ? 'red' : 'green'} title="Fermetures">{count}</Badge>
                  <Badge color="blue" variant="light" title="Total shifts">{total}</Badge>
                </Group>
              </Group>
            )
          })}
      </Stack>
    </Paper>
  )
}
```

**Step 3: Pass totalCounts from MonthPage**

In `src/pages/MonthPage/MonthPage.tsx`, destructure `totalCounts` from `useAssignments` and pass it to `ClosingStatsSidebar`:

```tsx
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
```

```tsx
<ClosingStatsSidebar
  employees={employees}
  closingCounts={closingCounts}
  maxClosings={maxClosings}
  minClosings={minClosings}
  totalCounts={totalCounts}
/>
```

**Step 4: Build check**

```bash
npm run build
```
Expected: clean build, no TypeScript errors.

**Step 5: Commit**
```bash
git add src/pages/MonthPage/hooks/useAssignments.ts src/pages/MonthPage/components/ClosingStatsSidebar.tsx src/pages/MonthPage/MonthPage.tsx
git commit -m "feat: show total shift count per employee in sidebar"
```

---

### Task 4: EmployeesPage — cap field in modal + inline table edit

**Files:**
- Modify: `src/pages/EmployeesPage.tsx`

**Step 1: Add NumberInput to the "Ajouter" modal**

Import `NumberInput` from `@mantine/core` (add it to the existing import line).

In the `useForm` initial values, add the new field:
```ts
const form = useForm({ initialValues: { name: '', email: '', phone: '', max_shifts_per_month: '' as unknown as number | '' } })
```

In the modal `<Stack>`, add before the submit button:
```tsx
<NumberInput
  label="Max shifts / mois"
  description="Laisser vide pour aucune limite"
  min={1}
  {...form.getInputProps('max_shifts_per_month')}
/>
```

In `handleAdd`, cast the value correctly (empty string → null):
```ts
async function handleAdd(values: typeof form.values) {
  const payload = {
    name: values.name,
    email: values.email || null,
    phone: values.phone || null,
    max_shifts_per_month: values.max_shifts_per_month === '' ? null : values.max_shifts_per_month,
  }
  const { error } = await supabase.from('employees').insert(payload)
  ...
}
```

**Step 2: Add "Max/mois" column to the table with inline edit**

Add a new `<Table.Th>Max/mois</Table.Th>` header after the existing headers.

Add a corresponding `<Table.Td>` in the row with an inline `NumberInput`:

```tsx
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
        .update({ max_shifts_per_month: val === '' ? null : val })
        .eq('id', emp.id)
      load()
    }}
  />
</Table.Td>
```

**Step 3: Build check**

```bash
npm run build
```
Expected: clean build.

**Step 4: Run all tests**

```bash
npx vitest run
```
Expected: 6/6 passing.

**Step 5: Commit**
```bash
git add src/pages/EmployeesPage.tsx
git commit -m "feat: add max_shifts_per_month field to employee form and table"
```

---

### Task 5: Final verification

**Step 1: Full build + tests**
```bash
npm run build && npx vitest run
```
Expected: clean build, 6/6 tests.

**Step 2: Manual smoke test**
- Go to `/employees`, set a cap of 3 on one employee
- Go to a month, generate the schedule
- Check the sidebar — the capped employee should have ≤ 3 total shifts (blue badge)
- The closing count (green/red badge) and total count (blue badge) should both be visible
