// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { generateSchedule } from './algorithm'
import type { Employee, ShiftType, Availability } from '../types'

const emp1: Employee = { id: 'e1', name: 'Alice', email: null, phone: null, token_dispo: 't1', token_view: 'v1', created_at: '', max_shifts_per_month: null }
const emp2: Employee = { id: 'e2', name: 'Bob', email: null, phone: null, token_dispo: 't2', token_view: 'v2', created_at: '', max_shifts_per_month: null }
const emp3: Employee = { id: 'e3', name: 'Carol', email: null, phone: null, token_dispo: 't3', token_view: 'v3', created_at: '', max_shifts_per_month: null }

const closing: ShiftType = { id: 's1', label: 'Fermeture', start_time: '18:00', end_time: '23:00', required_count: 2, is_closing: true, created_at: '' }
const opening: ShiftType = { id: 's2', label: 'Ouverture', start_time: '12:00', end_time: '15:00', required_count: 1, is_closing: false, created_at: '' }

describe('generateSchedule', () => {
  it('assigns required_count employees per shift per day', () => {
    const result = generateSchedule([emp1, emp2], [closing], 2026, 3, [])
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

  it('never exceeds max_shifts_per_month for a capped employee', () => {
    const capped: Employee = { ...emp1, max_shifts_per_month: 3 }
    const result = generateSchedule([capped, emp2, emp3], [closing], 2026, 3, [])
    const cappedCount = result.filter(a => a.employee_id === 'e1').length
    // Alice is capped at 3 — uncapped employees fill the rest
    expect(cappedCount).toBeLessThanOrEqual(3)
    // Without the cap Alice would get ~21; uncapped emp2/emp3 must absorb the remaining slots
    const uncappedTotal = result.filter(a => a.employee_id === 'e2' || a.employee_id === 'e3').length
    expect(uncappedTotal).toBeGreaterThan(cappedCount)
  })

  it('never assigns an employee more than 5 consecutive days', () => {
    // With exactly 2 employees and required_count=2, both must work every day
    // Without the constraint their streak would be 31 — this must fail before the fix
    const result = generateSchedule([emp1, emp2], [closing], 2026, 3, [])

    for (const emp of [emp1, emp2]) {
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
    // Single employee + opening shift (required_count=1) → assigned every possible day
    // After days 1-5 they must sit out days 6-7, then return day 8
    const result = generateSchedule([emp1], [opening], 2026, 3, [])
    const assignedDates = new Set(result.map(a => a.date))

    expect(assignedDates.has('2026-03-01')).toBe(true)
    expect(assignedDates.has('2026-03-05')).toBe(true)
    expect(assignedDates.has('2026-03-06')).toBe(false) // forced rest 1
    expect(assignedDates.has('2026-03-07')).toBe(false) // forced rest 2
    expect(assignedDates.has('2026-03-08')).toBe(true)  // back to work
  })
})
