# Rest Day Cadence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce 2 consecutive rest days per rolling 7-day window by limiting employees to 5 consecutive work days, after which they are blocked for exactly 2 days.

**Architecture:** Add `streak` and `forcedRest` counters (per employee) to `generateSchedule`. Filter out employees with `forcedRest > 0` when picking candidates. After each day's assignments are finalized, update both counters for every employee. Pure algorithm change — no DB or UI changes.

**Tech Stack:** TypeScript, Vitest

---

### Task 1: Failing tests first (TDD)

**Files:**
- Modify: `src/lib/algorithm.test.ts`

**Step 1: Write two failing tests**

Add both tests inside the existing `describe('generateSchedule')` block in `src/lib/algorithm.test.ts`, after the existing tests:

```ts
it('never assigns an employee more than 5 consecutive days', () => {
  // 3 employees, closing shift (required_count=2), full March
  // Without the constraint every employee would work ~20 days straight
  const result = generateSchedule([emp1, emp2, emp3], [closing], 2026, 3, [])

  for (const emp of [emp1, emp2, emp3]) {
    const assignedDates = new Set(
      result.filter(a => a.employee_id === emp.id).map(a => a.date)
    )
    let maxStreak = 0
    let streak = 0
    for (let day = 1; day <= 31; day++) {
      const date = `2026-03-${String(day).padStart(2, '0')}`
      if (assignedDates.has(date)) {
        streak++
        maxStreak = Math.max(maxStreak, streak)
      } else {
        streak = 0
      }
    }
    expect(maxStreak).toBeLessThanOrEqual(5)
  }
})

it('enforces exactly 2 consecutive rest days after a 5-day streak', () => {
  // Single employee + required_count=1 → they work every possible day
  // After days 1-5 they must sit out days 6-7, then return day 8
  const result = generateSchedule([emp1], [opening], 2026, 3, [])
  const assignedDates = new Set(result.map(a => a.date))

  expect(assignedDates.has('2026-03-01')).toBe(true)
  expect(assignedDates.has('2026-03-05')).toBe(true)
  expect(assignedDates.has('2026-03-06')).toBe(false) // forced rest 1
  expect(assignedDates.has('2026-03-07')).toBe(false) // forced rest 2
  expect(assignedDates.has('2026-03-08')).toBe(true)  // back to work
})
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run --project default 2>&1
```
Expected: 6 pass, 2 fail — both new tests fail because the algorithm ignores streaks.

**Step 3: Commit the failing tests**

```bash
git add src/lib/algorithm.test.ts
git commit -m "test: add failing tests for rest day cadence constraint"
```

---

### Task 2: Implement streak tracking in the algorithm

**Files:**
- Modify: `src/lib/algorithm.ts`

**Step 1: Add streak and forcedRest counters**

After the `totalCounts` initialisation (currently line 15), add:

```ts
const streak: Record<string, number> = Object.fromEntries(employees.map(e => [e.id, 0]))
const forcedRest: Record<string, number> = Object.fromEntries(employees.map(e => [e.id, 0]))
```

**Step 2: Add forcedRest to the available filter**

The current filter (lines 24-28) is:
```ts
const available = employees.filter(e =>
  !unavailSet.has(`${e.id}:${date}`) &&
  !assignedToday.has(e.id) &&
  (e.max_shifts_per_month == null || totalCounts[e.id] < e.max_shifts_per_month)
)
```

Add one condition:
```ts
const available = employees.filter(e =>
  !unavailSet.has(`${e.id}:${date}`) &&
  !assignedToday.has(e.id) &&
  forcedRest[e.id] === 0 &&
  (e.max_shifts_per_month == null || totalCounts[e.id] < e.max_shifts_per_month)
)
```

**Step 3: Add end-of-day streak/forcedRest update**

After the inner `for (const shift of shiftTypes)` loop closes (after line 43, still inside the outer `for (let day...)` loop), add:

```ts
for (const emp of employees) {
  if (assignedToday.has(emp.id)) {
    streak[emp.id]++
    if (streak[emp.id] >= 5) {
      forcedRest[emp.id] = 2
      streak[emp.id] = 0
    }
  } else {
    if (forcedRest[emp.id] > 0) {
      forcedRest[emp.id]--
    } else {
      streak[emp.id] = 0
    }
  }
}
```

The complete updated function body should look like:

```ts
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
  const streak: Record<string, number> = Object.fromEntries(employees.map(e => [e.id, 0]))
  const forcedRest: Record<string, number> = Object.fromEntries(employees.map(e => [e.id, 0]))

  const result: Omit<Assignment, 'id' | 'schedule_month_id'>[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const assignedToday = new Set<string>()

    for (const shift of shiftTypes) {
      const available = employees.filter(e =>
        !unavailSet.has(`${e.id}:${date}`) &&
        !assignedToday.has(e.id) &&
        forcedRest[e.id] === 0 &&
        (e.max_shifts_per_month == null || totalCounts[e.id] < e.max_shifts_per_month)
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

    for (const emp of employees) {
      if (assignedToday.has(emp.id)) {
        streak[emp.id]++
        if (streak[emp.id] >= 5) {
          forcedRest[emp.id] = 2
          streak[emp.id] = 0
        }
      } else {
        if (forcedRest[emp.id] > 0) {
          forcedRest[emp.id]--
        } else {
          streak[emp.id] = 0
        }
      }
    }
  }

  return result
}
```

**Step 4: Run all tests**

```bash
npx vitest run 2>&1
```
Expected: 8/8 passing.

**Step 5: Commit**

```bash
git add src/lib/algorithm.ts
git commit -m "feat: enforce 2 consecutive rest days after 5-day work streak"
```
