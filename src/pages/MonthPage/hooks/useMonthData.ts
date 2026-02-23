import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import type { Availability, Employee, Role, ScheduleMonth, ShiftRequirement, ShiftType } from '../../../types'

async function fetchMonthData(monthId: string) {
  const [
    { data: month },
    { data: emps },
    { data: shifts },
    { data: avails },
    { data: shiftReqs },
    { data: roleRows },
  ] = await Promise.all([
    supabase.from('schedule_months').select('*').eq('id', monthId).single(),
    supabase.from('employees').select('*').order('name'),
    supabase.from('shift_types').select('*').order('start_time'),
    supabase.from('availabilities').select('*'),
    supabase.from('shift_requirements').select('*'),
    supabase.from('roles').select('*').order('name'),
  ])
  return {
    scheduleMonth: month as ScheduleMonth,
    employees: (emps ?? []) as Employee[],
    shiftTypes: (shifts ?? []) as ShiftType[],
    availabilities: (avails ?? []) as Availability[],
    shiftRequirements: (shiftReqs ?? []) as ShiftRequirement[],
    roles: (roleRows ?? []) as Role[],
  }
}

export function useMonthData(monthId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['monthData', monthId],
    queryFn: () => fetchMonthData(monthId),
    enabled: !!monthId,
  })
  return {
    scheduleMonth: data?.scheduleMonth ?? null,
    employees: data?.employees ?? [],
    shiftTypes: data?.shiftTypes ?? [],
    availabilities: data?.availabilities ?? [],
    shiftRequirements: data?.shiftRequirements ?? [],
    roles: data?.roles ?? [],
    isLoading,
  }
}
