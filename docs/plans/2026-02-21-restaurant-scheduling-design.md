# Restaurant Scheduling MVP — Design Document

**Date**: 2026-02-21
**Stack**: React (Vite) + Supabase + Mantine

---

## Context

A restaurant owner currently manages ~30 student employees' monthly schedule by hand on paper. The process takes 1h–1h30 per month. Key pain points: misreading the grid, manual fairness tracking for closing shifts, and each employee needing to see only their own schedule.

---

## Actors

| Actor | Access |
|-------|--------|
| **Manager** | Supabase Auth account, full admin access |
| **Employee** | Unique UUID link, no account required |

---

## Data Model

```
employees
  id, name, email, phone
  token_dispo  (UUID, renewed each month)
  token_view   (UUID, permanent)

shift_types
  id, label (e.g. "Ouverture", "Fermeture"), start_time, end_time
  required_count  (number of employees needed per day for this shift)

schedule_months
  id, month (YYYY-MM), status (draft | published)

availabilities
  id, employee_id, date, is_unavailable

assignments
  id, employee_id, schedule_month_id, date, shift_type_id
```

---

## User Flows

1. Manager creates a new month → system generates `token_dispo` links per employee
2. Manager sends links to employees (WhatsApp / email)
3. Employees mark unavailable days on `/dispo/{token}` (no login required)
4. Manager clicks "Générer" → algorithm fills assignments
5. Manager adjusts manually on the grid
6. Manager clicks "Publier" → employees can view their schedule on `/planning/{token_view}`

---

## Interfaces

### Manager (authenticated)

**Dashboard**
- List of months (draft / published)
- "Nouveau mois" button

**Month page**
- Calendar grid: rows = days, columns = shift types
- Each cell shows assigned employees (drag & drop to reassign)
- Sidebar: closing shift counter per employee (green if balanced, red if gap > configurable threshold)
- "Générer le planning" button
- "Publier" button

**Employees page**
- List of employees with their tokens
- "Has submitted availability" / "Pending" indicator

### Employee — Availability input `/dispo/{token}`

- Calendar of the upcoming month
- Click a day = unavailable (strikethrough), click again = available
- "Confirmer" button
- No account, no password

### Employee — Personal schedule `/planning/{token_view}`

- List of their shifts for the month (date + hours)
- Read-only
- Mobile-first

---

## Scheduling Algorithm

**Priority order:**
1. Hard: never assign an employee on an unavailable day
2. Hard: never assign the same employee twice on the same day
3. Soft: balance closing shifts across employees
4. Soft: balance total shifts across employees

**Greedy approach:**
For each day, for each shift type:
1. Filter available employees for that day
2. Sort by ascending closing shift count (for closing shifts) or ascending total shifts (for others)
3. Assign the first N employees (N = `required_count` on shift_type)

**Manager configuration:**
- Number of employees required per shift type per day
- Fairness alert threshold (e.g. max gap of 2 closings between employees)

**MVP scope limitations (assumed):**
- No role differentiation (all employees are interchangeable)
- No consecutive day constraints
- No contract/weekly hour constraints

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React + Vite |
| UI library | Mantine |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage) |
| Hosting | Vercel (frontend) + Supabase cloud |

---

## Out of Scope (MVP)

- Role/skill-based assignments
- Notifications / reminders
- Payroll or hour tracking
- Multi-restaurant support
