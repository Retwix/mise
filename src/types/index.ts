export type Employee = {
  id: string
  name: string
  email: string | null
  phone: string | null
  token_dispo: string
  token_view: string
  created_at: string
}

export type ShiftType = {
  id: string
  label: string
  start_time: string
  end_time: string
  required_count: number
  is_closing: boolean
  created_at: string
}

export type ScheduleMonth = {
  id: string
  month: string // "2026-03"
  status: 'draft' | 'published'
  created_at: string
}

export type Availability = {
  id: string
  employee_id: string
  date: string // "2026-03-15"
  is_unavailable: boolean
}

export type Assignment = {
  id: string
  employee_id: string
  schedule_month_id: string
  date: string
  shift_type_id: string
}
