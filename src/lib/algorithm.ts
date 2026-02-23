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
        !unavailSet.has(`${e.id}:${date}`) &&
        !assignedToday.has(e.id) &&
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
  }

  return result
}
