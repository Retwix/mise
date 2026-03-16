"""
Mise en place — Restaurant Scheduler
Built with Google OR-Tools (CP-SAT solver) + Claude AI for conflict resolution

ARCHITECTURE
------------
1. OR-Tools runs first and tries to find a valid schedule
2. If it succeeds → return assignments directly
3. If it fails → diagnose_conflict() identifies WHY it failed
4. Claude AI receives the conflict description and suggests which
   constraint to relax and why, in plain French for the manager
5. OR-Tools runs again with the relaxed constraint
6. Manager sees the schedule + Claude's explanation of the compromise

Run this file directly to test with sample data:
  pip install ortools anthropic
  python scheduler_v2.py
"""

from ortools.sat.python import cp_model
from dataclasses import dataclass
from typing import Optional
import anthropic
import json


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
    weekly_contract_hours: float     # e.g. 35.0, 24.0, 20.0 — varies per employee
    team: str = "A"                  # "A" or "B" — for morning/afternoon rotation


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
    Employee(id=0, name="Alice",   role="cook",   weekly_contract_hours=35, team="A"),
    Employee(id=1, name="Bob",     role="cook",   weekly_contract_hours=35, team="B"),
    Employee(id=2, name="Carla",   role="waiter", weekly_contract_hours=35, team="A"),
    Employee(id=3, name="David",   role="waiter", weekly_contract_hours=24, team="B"),
    Employee(id=4, name="Eva",     role="waiter", weekly_contract_hours=35, team="A"),
    Employee(id=5, name="Frank",   role="barman", weekly_contract_hours=35, team="B"),
    Employee(id=6, name="Grace",   role="barman", weekly_contract_hours=20, team="A"),
    Employee(id=7, name="Hugo",    role="cook",   weekly_contract_hours=35, team="B"),
]

SHIFT_TYPES = [
    ShiftType(id=0, label="Morning",   start_hour=9,  end_hour=16, is_closing=False,
              default_required_cooks=1, default_required_waiters=1, default_required_barmen=1),
    ShiftType(id=1, label="Afternoon", start_hour=16, end_hour=23, is_closing=True,
              default_required_cooks=1, default_required_waiters=1, default_required_barmen=1),
]

# Override headcount for specific shift × day-of-week combinations.
# 0=Monday, 5=Saturday, 6=Sunday
SHIFT_REQUIREMENTS = [
    ShiftRequirement(shift_id=0, day_of_week=5, required_cooks=2, required_waiters=2, required_barmen=1),
    ShiftRequirement(shift_id=1, day_of_week=5, required_cooks=2, required_waiters=2, required_barmen=2),
    ShiftRequirement(shift_id=0, day_of_week=6, required_cooks=2, required_waiters=2, required_barmen=1),
    ShiftRequirement(shift_id=1, day_of_week=6, required_cooks=1, required_waiters=2, required_barmen=1),
    ShiftRequirement(shift_id=0, day_of_week=0, required_cooks=1, required_waiters=1, required_barmen=0),
    ShiftRequirement(shift_id=1, day_of_week=0, required_cooks=1, required_waiters=1, required_barmen=1),
]

NUM_DAYS = 31

UNAVAILABILITIES = [
    UnavailabilityEntry(employee_id=2, date_index=4),
    UnavailabilityEntry(employee_id=2, date_index=5),
    UnavailabilityEntry(employee_id=5, date_index=10),
]


# ---------------------------------------------------------------------------
# CONFLICT DIAGNOSIS
# When OR-Tools fails, we try to explain WHY by testing each constraint
# individually. This gives Claude enough context to suggest a smart fix.
# ---------------------------------------------------------------------------

@dataclass
class ConflictReport:
    """Structured description of why OR-Tools couldn't find a solution."""
    failed_constraints: list[str]        # e.g. ["C2 - headcount on Saturdays", "C3 - consecutive days off"]
    problematic_days: list[str]          # e.g. ["Saturday Dec 7", "Saturday Dec 14"]
    understaffed_roles: list[str]        # e.g. ["cook on shift Morning", "barman on shift Afternoon"]
    employees_summary: list[dict]        # name, role, contract_hours, unavailable_days, closing_count_so_far


def diagnose_conflict(
    employees, shift_types, shift_requirements, num_days,
    unavailabilities, month_start_weekday
) -> ConflictReport:
    """
    Runs lightweight checks to identify which constraints are causing
    infeasibility, so Claude has concrete facts to reason about.
    """
    failed = []
    problematic_days = []
    understaffed_roles = []

    # Build unavailability lookup
    unavail_set = {(u.employee_id, u.date_index) for u in unavailabilities}

    # Build requirement lookup
    req_lookup = {}
    for req in shift_requirements:
        req_lookup[(req.shift_id, req.day_of_week)] = req

    def get_req(shift, day_index):
        dow = (month_start_weekday + day_index) % 7
        r = req_lookup.get((shift.id, dow))
        if r:
            return r.required_cooks, r.required_waiters, r.required_barmen
        return shift.default_required_cooks, shift.default_required_waiters, shift.default_required_barmen

    DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

    # Check C2: are there days where available staff can't meet headcount?
    for d in range(num_days):
        dow = (month_start_weekday + d) % 7
        day_name = f"{DAY_NAMES[dow]} {d+1}"
        available = [e for e in employees if (e.id, d) not in unavail_set]

        for s, shift in enumerate(shift_types):
            req_c, req_w, req_b = get_req(shift, d)
            avail_cooks   = sum(1 for e in available if e.role == "cook")
            avail_waiters = sum(1 for e in available if e.role == "waiter")
            avail_barmen  = sum(1 for e in available if e.role == "barman")

            if avail_cooks < req_c:
                failed.append("C2 - effectif insuffisant (cuisiniers)")
                problematic_days.append(f"{day_name} — shift {shift.label}")
                understaffed_roles.append(f"cuisinier · {shift.label} · {day_name}")
            if avail_waiters < req_w:
                failed.append("C2 - effectif insuffisant (serveurs)")
                problematic_days.append(f"{day_name} — shift {shift.label}")
                understaffed_roles.append(f"serveur · {shift.label} · {day_name}")
            if avail_barmen < req_b:
                failed.append("C2 - effectif insuffisant (barmans)")
                problematic_days.append(f"{day_name} — shift {shift.label}")
                understaffed_roles.append(f"barman · {shift.label} · {day_name}")

    # Check C4: any employee whose contract hours can't fit the minimum shifts
    # (simple heuristic: if someone is unavailable more than 3 days in a week,
    # fitting 2 consecutive days off + required shifts gets tight)
    for e in employees:
        for week_start in range(0, num_days, 7):
            week_days = list(range(week_start, min(week_start + 7, num_days)))
            unavail_in_week = sum(1 for d in week_days if (e.id, d) in unavail_set)
            if unavail_in_week >= 5:
                failed.append(f"C3 - repos consécutif difficile pour {e.name} semaine {week_start//7 + 1}")

    # Deduplicate
    failed       = list(dict.fromkeys(failed))
    problematic_days = list(dict.fromkeys(problematic_days))[:5]  # cap at 5 for readability
    understaffed_roles = list(dict.fromkeys(understaffed_roles))[:5]

    # Build employee summary for Claude's context
    employees_summary = [
        {
            "name": e.name,
            "role": e.role,
            "contract_hours": e.weekly_contract_hours,
            "team": e.team,
            "unavailable_days": [u.date_index + 1 for u in unavailabilities if u.employee_id == e.id],
        }
        for e in employees
    ]

    return ConflictReport(
        failed_constraints=failed or ["Contraintes globales — combinaison impossible"],
        problematic_days=problematic_days,
        understaffed_roles=understaffed_roles,
        employees_summary=employees_summary,
    )


# ---------------------------------------------------------------------------
# AI CONFLICT RESOLUTION
# Sends the conflict report to Claude and gets back:
#   - A suggestion in plain French for the manager
#   - A machine-readable relaxation instruction for OR-Tools to retry
# ---------------------------------------------------------------------------

@dataclass
class AIResolution:
    """Claude's response to a scheduling conflict."""
    manager_message: str             # Plain French explanation for the manager
    relaxation: dict                 # Machine-readable instruction for OR-Tools
    # relaxation examples:
    #   {"type": "reduce_headcount", "shift_id": 0, "day_of_week": 5, "role": "cook", "new_value": 1}
    #   {"type": "ignore_unavailability", "employee_id": 3, "date_index": 6}
    #   {"type": "extend_hours", "employee_id": 2, "extra_hours": 4}


def ask_claude_for_resolution(
    conflict: ConflictReport,
    employees: list[Employee],
    shift_types: list[ShiftType],
    month_name: str = "ce mois-ci",
) -> AIResolution:
    """
    Sends the conflict context to Claude and asks for a resolution suggestion.
    Claude responds with both a human-readable message and a structured
    relaxation instruction that OR-Tools can act on.
    """
    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from environment

    # Build a rich context prompt
    prompt = f"""Tu es un assistant de planification pour un restaurant.
Le planning du mois ({month_name}) ne peut pas être généré automatiquement car des contraintes sont en conflit.

PROBLÈMES DÉTECTÉS:
{json.dumps(conflict.failed_constraints, ensure_ascii=False, indent=2)}

JOURS PROBLÉMATIQUES:
{json.dumps(conflict.problematic_days, ensure_ascii=False, indent=2)}

POSTES EN SOUS-EFFECTIF:
{json.dumps(conflict.understaffed_roles, ensure_ascii=False, indent=2)}

RÉSUMÉ DES EMPLOYÉS:
{json.dumps(conflict.employees_summary, ensure_ascii=False, indent=2)}

TYPES DE SHIFTS DISPONIBLES:
{json.dumps([{"id": s.id, "label": s.label, "is_closing": s.is_closing} for s in shift_types], ensure_ascii=False, indent=2)}

Ta réponse doit être un JSON valide avec exactement ces deux champs:
1. "manager_message": une explication courte et claire en français pour le manager (2-3 phrases max),
   indiquant quel compromis tu suggères et pourquoi c'est la meilleure option.
2. "relaxation": un objet décrivant la contrainte à assouplir, avec un champ "type" parmi:
   - "reduce_headcount": réduire l'effectif requis (ajouter: shift_id, day_of_week, role, new_value)
   - "ignore_unavailability": ignorer l'indisponibilité d'un employé (ajouter: employee_id, date_index)
   - "extend_hours": autoriser des heures supplémentaires (ajouter: employee_id, extra_hours)
   - "no_fix_possible": aucune solution raisonnable (ajouter: reason)

Réponds UNIQUEMENT avec le JSON, sans texte autour."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()

    try:
        parsed = json.loads(raw)
        return AIResolution(
            manager_message=parsed.get("manager_message", "Aucune suggestion disponible."),
            relaxation=parsed.get("relaxation", {"type": "no_fix_possible", "reason": "Parsing error"}),
        )
    except json.JSONDecodeError:
        return AIResolution(
            manager_message="L'IA n'a pas pu analyser le conflit. Veuillez ajuster manuellement.",
            relaxation={"type": "no_fix_possible", "reason": "JSON parse error"},
        )


# ---------------------------------------------------------------------------
# SCHEDULER CORE
# ---------------------------------------------------------------------------

def solve_schedule(
    employees: list[Employee],
    shift_types: list[ShiftType],
    shift_requirements: list[ShiftRequirement],
    num_days: int,
    unavailabilities: list[UnavailabilityEntry],
    month_start_weekday: int = 0,
    relaxation: Optional[dict] = None,   # ← injected by AI resolution on retry
) -> Optional[dict]:
    """
    Returns a dict of assignments if a solution is found, or None if impossible.
    On retry, pass a relaxation dict from AIResolution to loosen one constraint.
    """

    model = cp_model.CpModel()
    num_employees = len(employees)
    num_shifts = len(shift_types)

    req_lookup = {}
    for req in shift_requirements:
        req_lookup[(req.shift_id, req.day_of_week)] = req

    def get_requirement(shift: ShiftType, day_index: int) -> tuple[int, int, int]:
        dow = (month_start_weekday + day_index) % 7
        req = req_lookup.get((shift.id, dow))
        if req:
            return req.required_cooks, req.required_waiters, req.required_barmen
        return shift.default_required_cooks, shift.default_required_waiters, shift.default_required_barmen

    # -------------------------------------------------------------------
    # Apply AI relaxation if present — modify inputs before building model
    # -------------------------------------------------------------------
    effective_unavailabilities = list(unavailabilities)
    relaxed_headcounts = {}   # (shift_id, day_of_week, role) -> new_value
    extended_hours = {}       # employee_id -> extra_hours

    if relaxation:
        rtype = relaxation.get("type")

        if rtype == "ignore_unavailability":
            # Remove one unavailability entry so OR-Tools can assign that employee
            effective_unavailabilities = [
                u for u in unavailabilities
                if not (u.employee_id == relaxation["employee_id"]
                        and u.date_index == relaxation["date_index"])
            ]

        elif rtype == "reduce_headcount":
            key = (relaxation["shift_id"], relaxation["day_of_week"], relaxation["role"])
            relaxed_headcounts[key] = relaxation["new_value"]

        elif rtype == "extend_hours":
            extended_hours[relaxation["employee_id"]] = relaxation["extra_hours"]

    # -------------------------------------------------------------------
    # DECISION VARIABLES
    # x[e][d][s] = 1 if employee e works shift s on day d, else 0
    # -------------------------------------------------------------------
    x = {}
    for e in range(num_employees):
        for d in range(num_days):
            for s in range(num_shifts):
                x[e, d, s] = model.NewBoolVar(f"x_e{e}_d{d}_s{s}")

    # -------------------------------------------------------------------
    # C1 — UNAVAILABILITY
    # -------------------------------------------------------------------
    unavail_set = {(u.employee_id, u.date_index) for u in effective_unavailabilities}
    for (e, d) in unavail_set:
        for s in range(num_shifts):
            model.Add(x[e, d, s] == 0)

    # -------------------------------------------------------------------
    # C2 — REQUIRED HEADCOUNT PER ROLE (day-of-week aware)
    # Relaxation: reduce_headcount overrides one specific (shift×dow×role)
    # -------------------------------------------------------------------
    for d in range(num_days):
        dow = (month_start_weekday + d) % 7
        for s, shift in enumerate(shift_types):
            req_c, req_w, req_b = get_requirement(shift, d)

            # Apply relaxation if it targets this exact shift/dow/role
            if ("reduce_headcount",) and relaxed_headcounts:
                key_c = (shift.id, dow, "cook")
                key_w = (shift.id, dow, "waiter")
                key_b = (shift.id, dow, "barman")
                req_c = relaxed_headcounts.get(key_c, req_c)
                req_w = relaxed_headcounts.get(key_w, req_w)
                req_b = relaxed_headcounts.get(key_b, req_b)

            model.Add(
                sum(x[e, d, s] for e in range(num_employees)
                    if employees[e].role == "cook") >= req_c
            )
            model.Add(
                sum(x[e, d, s] for e in range(num_employees)
                    if employees[e].role == "waiter") >= req_w
            )
            model.Add(
                sum(x[e, d, s] for e in range(num_employees)
                    if employees[e].role == "barman") >= req_b
            )

    # -------------------------------------------------------------------
    # C3 — 2 CONSECUTIVE DAYS OFF PER WEEK
    # -------------------------------------------------------------------
    for e in range(num_employees):
        for week_start in range(0, num_days, 7):
            week_days = list(range(week_start, min(week_start + 7, num_days)))
            if len(week_days) < 2:
                continue

            worked_in_week = []
            for d in week_days:
                worked_day = model.NewBoolVar(f"worked_e{e}_d{d}")
                model.AddMaxEquality(worked_day, [x[e, d, s] for s in range(num_shifts)])
                worked_in_week.append((d, worked_day))

            pair_vars = []
            for i in range(len(worked_in_week) - 1):
                d1, w1 = worked_in_week[i]
                d2, w2 = worked_in_week[i + 1]
                both_off = model.NewBoolVar(f"both_off_e{e}_d{d1}_{d2}")
                model.AddBoolAnd([w1.Not(), w2.Not()]).OnlyEnforceIf(both_off)
                model.AddBoolOr([w1, w2]).OnlyEnforceIf(both_off.Not())
                pair_vars.append(both_off)

            model.AddBoolOr(pair_vars)

    # -------------------------------------------------------------------
    # C4 — CONTRACT HOURS (per week)
    # Relaxation: extend_hours adds a buffer for one specific employee
    # -------------------------------------------------------------------
    for e in range(num_employees):
        base_hours = employees[e].weekly_contract_hours
        extra = extended_hours.get(employees[e].id, 0)
        max_hours_x10 = int((base_hours + extra) * 10)

        for week_start in range(0, num_days, 7):
            week_days = list(range(week_start, min(week_start + 7, num_days)))
            total_hours_x10 = sum(
                x[e, d, s] * int(shift_types[s].duration_hours * 10)
                for d in week_days
                for s in range(num_shifts)
            )
            model.Add(total_hours_x10 <= max_hours_x10)

    # -------------------------------------------------------------------
    # C6 (SOFT) — BALANCE CLOSING SHIFTS
    # -------------------------------------------------------------------
    closing_shift_ids = [s for s, st in enumerate(shift_types) if st.is_closing]
    closing_counts = []
    for e in range(num_employees):
        count = sum(x[e, d, s] for d in range(num_days) for s in closing_shift_ids)
        count_var = model.NewIntVar(0, num_days, f"closing_count_e{e}")
        model.Add(count_var == count)
        closing_counts.append(count_var)

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
    solver.parameters.max_time_in_seconds = 30.0
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None

    assignments = {}
    for e in range(num_employees):
        for d in range(num_days):
            for s in range(num_shifts):
                if solver.Value(x[e, d, s]) == 1:
                    assignments[(e, d, s)] = True

    return assignments


# ---------------------------------------------------------------------------
# MAIN ORCHESTRATOR
# This is what your FastAPI endpoint will call.
# Returns either a schedule or an AI-assisted resolution attempt.
# ---------------------------------------------------------------------------

@dataclass
class ScheduleResult:
    status: str                          # "ok", "ok_with_compromise", "error"
    assignments: Optional[dict]          # The schedule if found
    manager_message: Optional[str]       # AI explanation if a compromise was made
    conflict: Optional[ConflictReport]   # Raw conflict details if still unresolvable


def generate_schedule(
    employees, shift_types, shift_requirements,
    num_days, unavailabilities,
    month_start_weekday=0,
    month_name="ce mois-ci",
    use_ai_fallback=True,
) -> ScheduleResult:
    """
    Full pipeline:
    1. Try OR-Tools normally
    2. If fails → diagnose → ask Claude → retry with relaxation
    3. Return result with appropriate status and message
    """

    # --- Step 1: Try clean solve ---
    assignments = solve_schedule(
        employees, shift_types, shift_requirements,
        num_days, unavailabilities, month_start_weekday
    )

    if assignments is not None:
        return ScheduleResult(
            status="ok",
            assignments=assignments,
            manager_message=None,
            conflict=None,
        )

    if not use_ai_fallback:
        return ScheduleResult(status="error", assignments=None, manager_message=None, conflict=None)

    # --- Step 2: Diagnose the conflict ---
    conflict = diagnose_conflict(
        employees, shift_types, shift_requirements,
        num_days, unavailabilities, month_start_weekday
    )

    # --- Step 3: Ask Claude for a resolution ---
    resolution = ask_claude_for_resolution(conflict, shift_types, month_name)

    if resolution.relaxation.get("type") == "no_fix_possible":
        return ScheduleResult(
            status="error",
            assignments=None,
            manager_message=resolution.manager_message,
            conflict=conflict,
        )

    # --- Step 4: Retry OR-Tools with the relaxation ---
    assignments = solve_schedule(
        employees, shift_types, shift_requirements,
        num_days, unavailabilities, month_start_weekday,
        relaxation=resolution.relaxation,
    )

    if assignments is not None:
        return ScheduleResult(
            status="ok_with_compromise",
            assignments=assignments,
            manager_message=resolution.manager_message,
            conflict=conflict,
        )

    # Still failed even after relaxation
    return ScheduleResult(
        status="error",
        assignments=None,
        manager_message=(
            resolution.manager_message +
            "\n\nMême après ajustement, aucun planning valide n'a pu être généré. "
            "Veuillez vérifier les indisponibilités ou ajouter du personnel."
        ),
        conflict=conflict,
    )


# ---------------------------------------------------------------------------
# PRETTY PRINT — for testing in terminal
# ---------------------------------------------------------------------------

def print_schedule(result: ScheduleResult, employees, shift_types, num_days):
    if result.status == "error":
        print("\n❌ Aucun planning valide trouvé.")
        if result.manager_message:
            print(f"\n💬 Message: {result.manager_message}")
        return

    if result.status == "ok_with_compromise":
        print("\n⚠️  Planning généré avec un compromis.")
        print(f"\n💬 {result.manager_message}\n")
    else:
        print("\n✅ Planning généré avec succès!\n")

    assignments = result.assignments
    print(f"{'Employé':<12}", end="")
    for d in range(num_days):
        print(f" D{d+1:02}", end="")
    print(f"  {'Ferm.':>5}")
    print("-" * (12 + num_days * 5 + 7))

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
        print(f"  {closes:>5}")


# ---------------------------------------------------------------------------
# ENTRY POINT
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("🔧 Génération du planning avec données de test...")
    result = generate_schedule(
        employees=EMPLOYEES,
        shift_types=SHIFT_TYPES,
        shift_requirements=SHIFT_REQUIREMENTS,
        num_days=NUM_DAYS,
        unavailabilities=UNAVAILABILITIES,
        month_start_weekday=6,   # December 2024 starts on Sunday
        month_name="décembre 2024",
        use_ai_fallback=True,    # Set to False to skip Claude and just get the error
    )
    print_schedule(result, EMPLOYEES, SHIFT_TYPES, NUM_DAYS)