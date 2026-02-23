"""
Mise en place — Restaurant Scheduler
Built with Google OR-Tools (CP-SAT solver)

STAGE 1 & 2: Data model + Hard constraints
-------------------------------------------
Run this file directly to test with sample data:
  pip install ortools
  python scheduler.py
"""

from ortools.sat.python import cp_model
from dataclasses import dataclass, field
from typing import Optional
import itertools


# ---------------------------------------------------------------------------
# DATA STRUCTURES
# These mirror your Supabase tables. In production you'll load these from
# your database instead of defining them here.
# ---------------------------------------------------------------------------

@dataclass
class Employee:
    id: int
    name: str
    role: str                        # "cook", "waiter", "barman"
    weekly_contract_hours: float     # e.g. 35.0, 24.0, 20.0
    # Skills/permissions can be added later (e.g. can_close: bool)


@dataclass
class ShiftRequirement:
    """
    Headcount requirements for a specific shift on a specific day of week.
    day_of_week: 0=Monday, 1=Tuesday, ..., 5=Saturday, 6=Sunday
    This lets you say "Saturday afternoon needs 2 cooks" vs
    "Monday afternoon only needs 1 cook".
    """
    shift_id: int
    day_of_week: int                 # 0=Monday … 6=Sunday
    required_cooks: int
    required_waiters: int
    required_barmen: int


@dataclass
class ShiftType:
    id: int
    label: str                       # e.g. "Morning", "Afternoon", "Closing"
    start_hour: int                  # e.g. 9
    end_hour: int                    # e.g. 17
    is_closing: bool
    # Default headcount used when no ShiftRequirement matches the day
    default_required_cooks: int
    default_required_waiters: int
    default_required_barmen: int

    @property
    def duration_hours(self) -> float:
        return self.end_hour - self.start_hour


@dataclass
class UnavailabilityEntry:
    employee_id: int
    date_index: int                  # Day of month, 0-indexed (0 = day 1)


# ---------------------------------------------------------------------------
# SAMPLE DATA — replace with real Supabase data in production
# ---------------------------------------------------------------------------

EMPLOYEES = [
    Employee(id=0, name="Alice",   role="cook",   weekly_contract_hours=35),
    Employee(id=1, name="Bob",     role="cook",   weekly_contract_hours=35),
    Employee(id=2, name="Carla",   role="waiter", weekly_contract_hours=35),
    Employee(id=3, name="David",   role="waiter", weekly_contract_hours=24),
    Employee(id=4, name="Eva",     role="waiter", weekly_contract_hours=35),
    Employee(id=5, name="Frank",   role="barman", weekly_contract_hours=35),
    Employee(id=6, name="Grace",   role="barman", weekly_contract_hours=20),
    Employee(id=7, name="Hugo",    role="cook",   weekly_contract_hours=35),
]

SHIFT_TYPES = [
    ShiftType(id=0, label="Morning",   start_hour=9,  end_hour=16, is_closing=False,
              default_required_cooks=1, default_required_waiters=1, default_required_barmen=1),
    ShiftType(id=1, label="Afternoon", start_hour=16, end_hour=23, is_closing=True,
              default_required_cooks=1, default_required_waiters=1, default_required_barmen=1),
]

# Override headcount for specific shift × day-of-week combinations.
# 0=Monday, 5=Saturday, 6=Sunday
# Add as many rules as your client needs — the solver picks the right
# one automatically based on what day of the week each date falls on.
SHIFT_REQUIREMENTS = [
    # Saturday: busier — need more staff on both shifts
    ShiftRequirement(shift_id=0, day_of_week=5, required_cooks=2, required_waiters=2, required_barmen=1),
    ShiftRequirement(shift_id=1, day_of_week=5, required_cooks=2, required_waiters=2, required_barmen=2),
    # Sunday: similar to Saturday
    ShiftRequirement(shift_id=0, day_of_week=6, required_cooks=2, required_waiters=2, required_barmen=1),
    ShiftRequirement(shift_id=1, day_of_week=6, required_cooks=1, required_waiters=2, required_barmen=1),
    # Monday: quieter — lean staffing
    ShiftRequirement(shift_id=0, day_of_week=0, required_cooks=1, required_waiters=1, required_barmen=0),
    ShiftRequirement(shift_id=1, day_of_week=0, required_cooks=1, required_waiters=1, required_barmen=1),
]

# December 2024: 31 days
NUM_DAYS = 31

# Who is unavailable on which days (0-indexed)
UNAVAILABILITIES = [
    UnavailabilityEntry(employee_id=2, date_index=4),   # Carla off day 5
    UnavailabilityEntry(employee_id=2, date_index=5),   # Carla off day 6
    UnavailabilityEntry(employee_id=5, date_index=10),  # Frank off day 11
]


# ---------------------------------------------------------------------------
# SCHEDULER
# ---------------------------------------------------------------------------

def solve_schedule(
    employees: list[Employee],
    shift_types: list[ShiftType],
    shift_requirements: list[ShiftRequirement],
    num_days: int,
    unavailabilities: list[UnavailabilityEntry],
    month_start_weekday: int = 0,   # 0=Monday … 6=Sunday — what weekday is day 1?
) -> Optional[dict]:
    """
    Returns a dict of assignments if a solution is found, or None if impossible.

    month_start_weekday tells the solver what day of the week the 1st of the
    month falls on, so it can apply the right headcount rules per day.
    e.g. for December 2024 (starts on Sunday): month_start_weekday=6
    """

    model = cp_model.CpModel()

    num_employees = len(employees)
    num_shifts = len(shift_types)

    # Build a lookup: (shift_id, day_of_week) -> ShiftRequirement
    # Falls back to shift defaults when no specific rule exists
    req_lookup: dict[tuple[int, int], ShiftRequirement] = {}
    for req in shift_requirements:
        req_lookup[(req.shift_id, req.day_of_week)] = req

    def get_requirement(shift: ShiftType, day_index: int) -> tuple[int, int, int]:
        """Return (cooks, waiters, barmen) needed for this shift on this day."""
        dow = (month_start_weekday + day_index) % 7
        req = req_lookup.get((shift.id, dow))
        if req:
            return req.required_cooks, req.required_waiters, req.required_barmen
        return shift.default_required_cooks, shift.default_required_waiters, shift.default_required_barmen

    # -------------------------------------------------------------------
    # DECISION VARIABLES
    # x[e][d][s] = 1 if employee e works shift s on day d, else 0
    # This is the core of OR-Tools: we define boolean variables and then
    # add rules (constraints) about what combinations are allowed.
    # -------------------------------------------------------------------
    x = {}
    for e in range(num_employees):
        for d in range(num_days):
            for s in range(num_shifts):
                x[e, d, s] = model.NewBoolVar(f"x_e{e}_d{d}_s{s}")


    # -------------------------------------------------------------------
    # C1 — UNAVAILABILITY
    # If an employee is unavailable on a day, they cannot work ANY shift.
    # -------------------------------------------------------------------
    unavail_set = {(u.employee_id, u.date_index) for u in unavailabilities}
    for (e, d) in unavail_set:
        for s in range(num_shifts):
            model.Add(x[e, d, s] == 0)
            # Plain English: "x must equal 0" = employee cannot be assigned


    # -------------------------------------------------------------------
    # C2 — REQUIRED HEADCOUNT PER ROLE (day-of-week aware)
    # Each shift on each day must have at least the required number of
    # cooks, waiters, and barmen — where the requirement can vary by
    # day of week (e.g. Saturday needs more staff than Monday).
    # -------------------------------------------------------------------
    for d in range(num_days):
        for s, shift in enumerate(shift_types):
            req_cooks, req_waiters, req_barmen = get_requirement(shift, d)

            model.Add(
                sum(x[e, d, s] for e in range(num_employees)
                    if employees[e].role == "cook")
                >= req_cooks
            )
            model.Add(
                sum(x[e, d, s] for e in range(num_employees)
                    if employees[e].role == "waiter")
                >= req_waiters
            )
            model.Add(
                sum(x[e, d, s] for e in range(num_employees)
                    if employees[e].role == "barman")
                >= req_barmen
            )


    # -------------------------------------------------------------------
    # C3 — 2 CONSECUTIVE DAYS OFF PER WEEK
    # For each employee, in each 7-day window, there must be at least 2
    # consecutive days where they work no shift at all.
    # -------------------------------------------------------------------
    for e in range(num_employees):
        # Split month into ISO weeks (days 0-6, 7-13, etc.)
        for week_start in range(0, num_days, 7):
            week_days = list(range(week_start, min(week_start + 7, num_days)))
            if len(week_days) < 2:
                continue

            # worked[d] = 1 if employee works ANY shift on day d
            worked_in_week = []
            for d in week_days:
                worked_day = model.NewBoolVar(f"worked_e{e}_d{d}")
                model.AddMaxEquality(worked_day, [x[e, d, s] for s in range(num_shifts)])
                worked_in_week.append((d, worked_day))

            # Find at least one pair of consecutive days both off
            # We create a boolean for each consecutive pair: both_off[i] = 1
            # if day i and day i+1 are both off.
            pair_vars = []
            for i in range(len(worked_in_week) - 1):
                d1, w1 = worked_in_week[i]
                d2, w2 = worked_in_week[i + 1]
                both_off = model.NewBoolVar(f"both_off_e{e}_d{d1}_{d2}")
                # both_off = 1 only if w1=0 AND w2=0
                model.AddBoolAnd([w1.Not(), w2.Not()]).OnlyEnforceIf(both_off)
                model.AddBoolOr([w1, w2]).OnlyEnforceIf(both_off.Not())
                pair_vars.append(both_off)

            # At least one consecutive-off pair must exist in the week
            model.AddBoolOr(pair_vars)


    # -------------------------------------------------------------------
    # C4 — CONTRACT HOURS (per week)
    # Total hours worked in a week must not exceed the employee's contract.
    # We multiply by 10 to avoid floats (OR-Tools works with integers).
    # -------------------------------------------------------------------
    for e in range(num_employees):
        max_hours_x10 = int(employees[e].weekly_contract_hours * 10)
        for week_start in range(0, num_days, 7):
            week_days = list(range(week_start, min(week_start + 7, num_days)))
            total_hours_x10 = sum(
                x[e, d, s] * int(shift_types[s].duration_hours * 10)
                for d in week_days
                for s in range(num_shifts)
            )
            model.Add(total_hours_x10 <= max_hours_x10)


    # -------------------------------------------------------------------
    # C7 (SOFT) — BALANCE CLOSING SHIFTS
    # We minimize the difference between the employee with the most
    # closing shifts and the one with the fewest.
    # This is a "soft" constraint implemented as an objective to minimize.
    # -------------------------------------------------------------------
    closing_shift_ids = [s for s, st in enumerate(shift_types) if st.is_closing]

    closing_counts = []
    for e in range(num_employees):
        count = sum(
            x[e, d, s]
            for d in range(num_days)
            for s in closing_shift_ids
        )
        # OR-Tools needs an IntVar to hold this sum
        count_var = model.NewIntVar(0, num_days, f"closing_count_e{e}")
        model.Add(count_var == count)
        closing_counts.append(count_var)

    # max_closing - min_closing = the "unfairness" we want to minimize
    max_closing = model.NewIntVar(0, num_days, "max_closing")
    min_closing = model.NewIntVar(0, num_days, "min_closing")
    model.AddMaxEquality(max_closing, closing_counts)
    model.AddMinEquality(min_closing, closing_counts)
    imbalance = model.NewIntVar(0, num_days, "imbalance")
    model.Add(imbalance == max_closing - min_closing)

    model.Minimize(imbalance)


    # -------------------------------------------------------------------
    # SOLVE
    # -------------------------------------------------------------------
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30.0  # give up after 30s
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None  # No solution found — return None so API can report error

    # -------------------------------------------------------------------
    # EXTRACT RESULTS
    # -------------------------------------------------------------------
    assignments = {}
    for e in range(num_employees):
        for d in range(num_days):
            for s in range(num_shifts):
                if solver.Value(x[e, d, s]) == 1:
                    assignments[(e, d, s)] = True

    return assignments


# ---------------------------------------------------------------------------
# PRETTY PRINT — for testing in terminal
# ---------------------------------------------------------------------------

def print_schedule(assignments, employees, shift_types, num_days):
    if assignments is None:
        print("❌ No valid schedule found. Check your constraints.")
        return

    print("\n✅ Schedule found!\n")
    print(f"{'Employee':<12}", end="")
    for d in range(num_days):
        print(f" D{d+1:02}", end="")
    print(f"  {'Closes':>6}")
    print("-" * (12 + num_days * 5 + 8))

    for e, emp in enumerate(employees):
        print(f"{emp.name:<12}", end="")
        closes = 0
        for d in range(num_days):
            cell = "    "
            for s, shift in enumerate(shift_types):
                if (e, d, s) in assignments:
                    cell = f" {shift.label[:3].upper()}"
                    if shift.is_closing:
                        closes += 1
            print(cell, end="")
        print(f"  {closes:>6}")


# ---------------------------------------------------------------------------
# ENTRY POINT
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("🔧 Running scheduler with sample data...")
    # December 2024 starts on a Sunday → weekday index 6
    result = solve_schedule(
        EMPLOYEES,
        SHIFT_TYPES,
        SHIFT_REQUIREMENTS,
        NUM_DAYS,
        UNAVAILABILITIES,
        month_start_weekday=6,
    )
    print_schedule(result, EMPLOYEES, SHIFT_TYPES, NUM_DAYS)
