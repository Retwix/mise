-- Employees
create table employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  token_dispo uuid not null default gen_random_uuid(),
  token_view uuid not null default gen_random_uuid(),
  created_at timestamptz default now()
);

-- Shift types (e.g. "Ouverture 12h-15h", "Fermeture 18h-23h")
create table shift_types (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  start_time text not null, -- "12:00"
  end_time text not null,   -- "15:00"
  required_count int not null default 1,
  is_closing boolean not null default false,
  created_at timestamptz default now()
);

-- Monthly schedules
create table schedule_months (
  id uuid primary key default gen_random_uuid(),
  month text not null, -- "2026-03"
  status text not null default 'draft', -- draft | published
  created_at timestamptz default now(),
  unique(month)
);

-- Employee unavailability
create table availabilities (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  date text not null, -- "2026-03-15"
  is_unavailable boolean not null default true,
  unique(employee_id, date)
);

-- Assignments (generated + manually adjustable)
create table assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  schedule_month_id uuid not null references schedule_months(id) on delete cascade,
  date text not null, -- "2026-03-15"
  shift_type_id uuid not null references shift_types(id) on delete cascade,
  unique(employee_id, date, shift_type_id)
);

-- ============================================================
-- RLS
-- ============================================================

-- Enable RLS
alter table employees enable row level security;
alter table shift_types enable row level security;
alter table schedule_months enable row level security;
alter table availabilities enable row level security;
alter table assignments enable row level security;

-- Manager (authenticated) can do everything
create policy "manager full access employees" on employees for all to authenticated using (true) with check (true);
create policy "manager full access shift_types" on shift_types for all to authenticated using (true) with check (true);
create policy "manager full access schedule_months" on schedule_months for all to authenticated using (true) with check (true);
create policy "manager full access availabilities" on availabilities for all to authenticated using (true) with check (true);
create policy "manager full access assignments" on assignments for all to authenticated using (true) with check (true);

-- Anon can read employees (for token lookup on dispo/planning pages)
create policy "anon read employees" on employees for select to anon using (true);

-- Anon can read/write availabilities (employee submits via token)
create policy "anon read availabilities" on availabilities for select to anon using (true);
create policy "anon write availabilities" on availabilities for insert to anon with check (true);
create policy "anon update availabilities" on availabilities for update to anon using (true);

-- Anon can read shift_types and published assignments (for planning page)
create policy "anon read shift_types" on shift_types for select to anon using (true);
create policy "anon read published assignments" on assignments for select to anon using (
  exists (
    select 1 from schedule_months sm
    where sm.id = assignments.schedule_month_id
    and sm.status = 'published'
  )
);
create policy "anon read schedule_months" on schedule_months for select to anon using (true);
