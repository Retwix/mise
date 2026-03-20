import dayjs from 'dayjs'
import type { Employee, ShiftType, Availability, Assignment, Role } from '../types'

function shiftDuration(shift: ShiftType): number {
  const [sh, sm] = shift.start_time.split(':').map(Number)
  const [eh, em] = shift.end_time.split(':').map(Number)
  let minutes = (eh * 60 + em) - (sh * 60 + sm)
  if (minutes < 0) minutes += 24 * 60
  return minutes / 60
}

export function generateSchedule(
  employees: Employee[],
  shiftTypes: ShiftType[],
  year: number,
  month: number,
  availabilities: Availability[],
  roles: Role[] = []
): Omit<Assignment, 'id' | 'schedule_month_id'>[] {
  const daysInMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).daysInMonth()
  const unavailSet = new Set(availabilities.filter(a => a.is_unavailable).map(a => `${a.employee_id}:${a.date}`))

  const closingCounts: Record<string, number> = Object.fromEntries(employees.map(e => [e.id, 0]))
  const totalCounts: Record<string, number> = Object.fromEntries(employees.map(e => [e.id, 0]))
  const hoursWorked: Record<string, number> = Object.fromEntries(employees.map(e => [e.id, 0]))
  const streak: Record<string, number> = Object.fromEntries(employees.map(e => [e.id, 0]))
  const forcedRest: Record<string, number> = Object.fromEntries(employees.map(e => [e.id, 0]))

  const result: Omit<Assignment, 'id' | 'schedule_month_id'>[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const assignedToday = new Set<string>()

    for (const shift of shiftTypes) {
      const available = employees.filter(e => {
        if (unavailSet.has(`${e.id}:${date}`)) return false
        if (assignedToday.has(e.id)) return false
        if (forcedRest[e.id] !== 0) return false
        if (e.max_shifts_per_month != null && totalCounts[e.id] >= e.max_shifts_per_month) return false
        const role = roles.find(r => r.id === e.role_id)
        if (role?.max_hours_per_month != null && hoursWorked[e.id] + shiftDuration(shift) > role.max_hours_per_month) return false
        return true
      })

      const sorted = [...available].sort((a, b) => {
        if (shift.is_closing) return closingCounts[a.id] - closingCounts[b.id]
        return totalCounts[a.id] - totalCounts[b.id]
      })

      const needed = shift.default_required_cooks + shift.default_required_waiters + shift.default_required_barmen
      const assigned = sorted.slice(0, needed)

      for (const emp of assigned) {
        result.push({ employee_id: emp.id, date, shift_type_id: shift.id })
        assignedToday.add(emp.id)
        totalCounts[emp.id]++
        if (shift.is_closing) closingCounts[emp.id]++
        hoursWorked[emp.id] += shiftDuration(shift)
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
