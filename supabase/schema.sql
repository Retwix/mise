-- Roles (contract type: employee, student, manager, …)
create table roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  max_hours_per_month integer,
  created_at timestamptz default now()
);

-- Jobs (position: cook, waiter, barman, … — used in future sprint)
create table jobs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- Employees
create table employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  token_dispo uuid not null default gen_random_uuid(),
  token_view uuid not null default gen_random_uuid(),
  created_at timestamptz default now(),
  max_shifts_per_month integer,
  role_id uuid references roles(id) on delete set null,
  job_id  uuid references jobs(id)  on delete set null,
  role text check (role in ('cook', 'waiter', 'barman')),
  weekly_contract_hours float,
  team text check (team in ('A', 'B')) default 'A'
);

-- Shift types (e.g. "Ouverture 12h-15h", "Fermeture 18h-23h")
create table shift_types (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  start_time text not null, -- "12:00"
  end_time text not null,   -- "15:00"
  default_required_cooks int not null default 0,
  default_required_waiters int not null default 0,
  default_required_barmen int not null default 0,
  is_closing boolean not null default false,
  created_at timestamptz default now(),
  job_id uuid references jobs(id) on delete set null
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

-- Shift headcount overrides per shift × day-of-week
-- e.g. Saturday needs 2 cooks on the afternoon shift instead of the default 1
create table shift_requirements (
  id uuid primary key default gen_random_uuid(),
  shift_type_id uuid not null references shift_types(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Monday … 6=Sunday
  required_cooks int not null default 0,
  required_waiters int not null default 0,
  required_barmen int not null default 0,
  unique(shift_type_id, day_of_week)
);

-- Assignments (generated + manually adjustable)
create table assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  schedule_month_id uuid not null references schedule_months(id) on delete cascade,
  date text not null, -- "2026-03-15"
  shift_type_id uuid not null references shift_types(id) on delete cascade,
  is_manual_override boolean not null default false,
  unique(employee_id, date, shift_type_id)
);

-- ============================================================
-- RLS
-- ============================================================

-- Enable RLS
alter table roles enable row level security;
alter table jobs  enable row level security;
alter table employees enable row level security;
alter table shift_types enable row level security;
alter table schedule_months enable row level security;
alter table availabilities enable row level security;
alter table shift_requirements enable row level security;
alter table assignments enable row level security;

-- Manager (authenticated) can do everything
create policy "manager full access roles" on roles for all to authenticated using (true) with check (true);
create policy "manager full access jobs"  on jobs  for all to authenticated using (true) with check (true);
create policy "manager full access employees" on employees for all to authenticated using (true) with check (true);
create policy "manager full access shift_types" on shift_types for all to authenticated using (true) with check (true);
create policy "manager full access schedule_months" on schedule_months for all to authenticated using (true) with check (true);
create policy "manager full access availabilities" on availabilities for all to authenticated using (true) with check (true);
create policy "manager full access shift_requirements" on shift_requirements for all to authenticated using (true) with check (true);
create policy "manager full access assignments" on assignments for all to authenticated using (true) with check (true);

-- Anon can read employees (for token lookup on dispo/planning pages)
create policy "anon read employees" on employees for select to anon using (true);

-- Anon can read roles and jobs
create policy "anon read roles" on roles for select to anon using (true);
create policy "anon read jobs"  on jobs  for select to anon using (true);

-- Anon can read/write availabilities (employee submits via token)
create policy "anon read availabilities" on availabilities for select to anon using (true);
create policy "anon write availabilities" on availabilities for insert to anon with check (true);
create policy "anon update availabilities" on availabilities for update to anon using (true);

-- Anon can read shift_types, shift_requirements and published assignments (for planning page)
create policy "anon read shift_types" on shift_types for select to anon using (true);
create policy "anon read shift_requirements" on shift_requirements for select to anon using (true);
create policy "anon read published assignments" on assignments for select to anon using (
  exists (
    select 1 from schedule_months sm
    where sm.id = assignments.schedule_month_id
    and sm.status = 'published'
  )
);
create policy "anon read schedule_months" on schedule_months for select to anon using (true);
