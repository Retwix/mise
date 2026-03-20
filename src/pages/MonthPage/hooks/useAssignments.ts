import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { generateSchedule } from '../../../lib/algorithm'
import { supabase } from '../../../lib/supabase'
import type { Availability, Employee, Role, ScheduleMonth, ShiftRequirement, ShiftType } from '../../../types'

/** Compute day-of-week for day 1 of the month, Monday=0 … Sunday=6 */
function monthStartWeekday(year: number, month: number): number {
  const jsDay = new Date(year, month - 1, 1).getDay() // 0=Sunday … 6=Saturday
  return (jsDay + 6) % 7
}

/** Parse a "HH:MM" time string and return the hour as an integer */
function parseHour(time: string): number {
  return parseInt(time.split(':')[0], 10)
}

export function useAssignments(
  monthId: string,
  scheduleMonth: ScheduleMonth | null,
  employees: Employee[],
  shiftTypes: ShiftType[],
  availabilities: Availability[],
  shiftRequirements: ShiftRequirement[],
  roles: Role[],
) {
  const queryClient = useQueryClient()

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments', monthId],
    queryFn: async () => {
      const { data } = await supabase
        .from('assignments')
        .select('*')
        .eq('schedule_month_id', monthId)
      return data ?? []
    },
    enabled: !!monthId,
  })

  // Local JS algorithm (greedy, no role-based headcount)
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!scheduleMonth) return
      await supabase.from('assignments').delete().eq('schedule_month_id', monthId)
      const [year, month] = scheduleMonth.month.split('-').map(Number)
      const generated = generateSchedule(employees, shiftTypes, year, month, availabilities, roles)
      const rows = generated.map((a) => ({ ...a, schedule_month_id: monthId }))
      const { error } = await supabase.from('assignments').insert(rows)
      if (error) throw error
    },
    onSuccess: () => {
      notifications.show({ color: 'green', message: 'Planning généré !' })
      queryClient.invalidateQueries({ queryKey: ['assignments', monthId] })
    },
    onError: (error: Error) => {
      notifications.show({ color: 'red', message: error.message })
    },
  })

  // Python OR-Tools microservice (Section 5 & 6 — respects roles, contract hours, headcount rules)
  const generateWithPythonMutation = useMutation({
    mutationFn: async () => {
      if (!scheduleMonth) return
      const [year, month] = scheduleMonth.month.split('-').map(Number)
      const numDays = new Date(year, month, 0).getDate()

      const body = {
        schedule_month_id: monthId,
        month,
        year,
        start_weekday: monthStartWeekday(year, month),
        num_days: numDays,
        employees: employees.map((e) => ({
          id: e.id,
          name: e.name,
          role: e.role ?? 'waiter',
          weekly_contract_hours: e.weekly_contract_hours ?? 35,
          team: e.team ?? 'A',
        })),
        shift_types: shiftTypes.map((s) => ({
          id: s.id,
          label: s.label,
          start_hour: parseHour(s.start_time),
          end_hour: parseHour(s.end_time),
          is_closing: s.is_closing,
          default_required_cooks: s.default_required_cooks,
          default_required_waiters: s.default_required_waiters,
          default_required_barmen: s.default_required_barmen,
        })),
        shift_requirements: shiftRequirements.map((r) => ({
          shift_type_id: r.shift_type_id,
          day_of_week: r.day_of_week,
          required_cooks: r.required_cooks,
          required_waiters: r.required_waiters,
          required_barmen: r.required_barmen,
        })),
        unavailabilities: availabilities
          .filter((a) => a.is_unavailable)
          .map((a) => ({ employee_id: a.employee_id, date: a.date })),
      }

      const schedulerUrl = import.meta.env.VITE_SCHEDULER_URL ?? 'http://localhost:8000'
      const res = await fetch(`${schedulerUrl}/generate-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(`Scheduler responded ${res.status}`)
      const json = await res.json()
      if (json.status === 'error') throw new Error(json.message)

      await supabase.from('assignments').delete().eq('schedule_month_id', monthId)
      const rows = (json.assignments as Array<{ employee_id: string; shift_type_id: string; date: string }>).map(
        (a) => ({ ...a, schedule_month_id: monthId }),
      )
      const { error } = await supabase.from('assignments').insert(rows)
      if (error) throw error
    },
    onSuccess: () => {
      notifications.show({ color: 'green', message: 'Planning généré (OR-Tools) !' })
      queryClient.invalidateQueries({ queryKey: ['assignments', monthId] })
    },
    onError: (error: Error) => {
      notifications.show({ color: 'red', message: error.message })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      await supabase.from('assignments').delete().eq('id', assignmentId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', monthId] })
    },
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('schedule_months').update({ status: 'published' }).eq('id', monthId)
    },
    onSuccess: () => {
      notifications.show({ color: 'green', message: 'Planning publié !' })
      queryClient.invalidateQueries({ queryKey: ['monthData', monthId] })
    },
  })

  const closingShiftIds = shiftTypes.filter((s) => s.is_closing).map((s) => s.id)
  const closingCounts: Record<string, number> = {}
  employees.forEach((e) => { closingCounts[e.id] = 0 })
  assignments.forEach((a) => {
    if (closingShiftIds.includes(a.shift_type_id))
      closingCounts[a.employee_id] = (closingCounts[a.employee_id] ?? 0) + 1
  })
  const maxClosings = Math.max(0, ...Object.values(closingCounts))
  const minClosings = Math.min(0, ...Object.values(closingCounts))

  const totalCounts: Record<string, number> = {}
  employees.forEach((e) => { totalCounts[e.id] = 0 })
  assignments.forEach((a) => {
    totalCounts[a.employee_id] = (totalCounts[a.employee_id] ?? 0) + 1
  })

  return {
    assignments,
    isLoading,
    generate: generateMutation.mutate,
    generateWithPython: generateWithPythonMutation.mutate,
    remove: removeMutation.mutate,
    publish: publishMutation.mutate,
    generating: generateMutation.isPending,
    generatingWithPython: generateWithPythonMutation.isPending,
    publishing: publishMutation.isPending,
    closingCounts,
    maxClosings,
    minClosings,
    totalCounts,
  }
}
