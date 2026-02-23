import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { generateSchedule } from '../../../lib/algorithm'
import { supabase } from '../../../lib/supabase'
import type { Availability, Employee, ScheduleMonth, ShiftType } from '../../../types'

export function useAssignments(
  monthId: string,
  scheduleMonth: ScheduleMonth | null,
  employees: Employee[],
  shiftTypes: ShiftType[],
  availabilities: Availability[],
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

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!scheduleMonth) return
      await supabase.from('assignments').delete().eq('schedule_month_id', monthId)
      const [year, month] = scheduleMonth.month.split('-').map(Number)
      const generated = generateSchedule(employees, shiftTypes, year, month, availabilities)
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
    remove: removeMutation.mutate,
    publish: publishMutation.mutate,
    generating: generateMutation.isPending,
    publishing: publishMutation.isPending,
    closingCounts,
    maxClosings,
    minClosings,
    totalCounts,
  }
}
