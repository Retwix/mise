// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { generateSchedule } from './algorithm'
import type { Employee, ShiftType, Availability } from '../types'

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
