# Design: Total shifts sidebar + Part-time cap

Date: 2026-02-23

## Context

Analysis of the client's paper rota revealed two missing features:
1. A per-employee total shift count visible at a glance (the paper has a TOTAL column)
2. A part-time cap so the algorithm doesn't over-assign employees with limited availability

## Feature 1 — Total shifts per employee in sidebar

### What
Add a "Total" badge next to the closing count in `ClosingStatsSidebar`, showing how many shifts each employee has been assigned this month.

### How
- `useAssignments.ts`: derive `totalCounts: Record<string, number>` from the `assignments` array (same pattern as `closingCounts`)
- `ClosingStatsSidebar`: add `totalCounts` prop, render a second badge per employee row

No DB change required. Pure client-side derivation.

## Feature 2 — max_shifts_per_month per employee

### What
A nullable integer on each employee that caps how many shifts the algorithm assigns them per month. Null = no cap (full-time). Set = capped (part-time or any reduced schedule).

### DB change
```sql
alter table employees add column max_shifts_per_month integer;
```

### Type change
```ts
// src/types/index.ts
max_shifts_per_month: number | null
```

### Algorithm change
In `generateSchedule`, when filtering candidates for a shift, additionally exclude employees who have already reached their cap:
```ts
const available = employees.filter(e =>
  !unavailSet.has(`${e.id}:${date}`) &&
  !assignedToday.has(e.id) &&
  (e.max_shifts_per_month == null || totalCounts[e.id] < e.max_shifts_per_month)
)
```

### UI change (EmployeesPage)
- Add optional `NumberInput` for `max_shifts_per_month` in the "Ajouter" modal
- Add a "Max/mois" column to the employees table with an inline `NumberInput` (updates on blur) so the manager can set/change the cap for existing employees

## Files touched
- `supabase/schema.sql` — add column
- `src/types/index.ts` — add field
- `src/lib/algorithm.ts` — cap filter
- `src/lib/algorithm.test.ts` — add test for cap behaviour
- `src/pages/EmployeesPage.tsx` — modal field + table inline input
- `src/pages/MonthPage/hooks/useAssignments.ts` — expose totalCounts
- `src/pages/MonthPage/components/ClosingStatsSidebar.tsx` — render totalCounts
