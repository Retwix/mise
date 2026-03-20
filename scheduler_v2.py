"""
Mise en place — FastAPI scheduling microservice

POST /generate-schedule
  Accepts data collected by the React app from Supabase.
  Runs OR-Tools (CP-SAT). On failure, asks Claude AI for a constraint
  relaxation, then retries. Returns assignments + optional French message.

Run locally:
  pip install fastapi uvicorn ortools anthropic
  uvicorn scheduler_v2:app --reload --port 8000
"""

import sys
import os
import calendar
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import solver primitives from the reference implementation
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "docs"))
from scheduler import (
    Employee,
    ShiftType,
    ShiftRequirement,
    UnavailabilityEntry,
    solve_schedule,
    diagnose_conflict,
    ask_claude_for_resolution,
)

# ---------------------------------------------------------------------------
# French month names (calendar.month_name uses locale — safer to hardcode)
# ---------------------------------------------------------------------------
MOIS_FR = {
    1: "janvier", 2: "février", 3: "mars", 4: "avril",
    5: "mai", 6: "juin", 7: "juillet", 8: "août",
    9: "septembre", 10: "octobre", 11: "novembre", 12: "décembre",
}

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="Mise en place Scheduler")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class EmployeeIn(BaseModel):
    id: str
    name: str
    role: str                      # "cook" | "waiter" | "barman"
    weekly_contract_hours: float
    team: str = "A"                # "A" | "B"


class ShiftTypeIn(BaseModel):
    id: str
    label: str
    start_hour: int
    end_hour: int
    is_closing: bool
    default_required_cooks: int = 0
    default_required_waiters: int = 0
    default_required_barmen: int = 0


class ShiftRequirementIn(BaseModel):
    shift_type_id: str
    day_of_week: int               # 0=Monday … 6=Sunday
    required_cooks: int = 0
    required_waiters: int = 0
    required_barmen: int = 0


class UnavailabilityIn(BaseModel):
    employee_id: str
    date: str                      # "YYYY-MM-DD"


class ScheduleRequest(BaseModel):
    schedule_month_id: str
    month: int
    year: int
    start_weekday: int             # weekday of day 1, 0=Monday … 6=Sunday
    num_days: int
    month_name: Optional[str] = None
    employees: list[EmployeeIn]
    shift_types: list[ShiftTypeIn]
    shift_requirements: list[ShiftRequirementIn] = []
    unavailabilities: list[UnavailabilityIn] = []


class AssignmentOut(BaseModel):
    employee_id: str
    shift_type_id: str
    date: str                      # "YYYY-MM-DD"
    schedule_month_id: str


class ScheduleResponse(BaseModel):
    status: str                    # "ok" | "ok_with_compromise" | "error"
    assignments: Optional[list[AssignmentOut]]
    manager_message: Optional[str]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_solver_inputs(req: ScheduleRequest):
    """Convert UUID-based request data into integer-indexed solver objects."""

    emp_uuid_to_idx = {e.id: i for i, e in enumerate(req.employees)}
    shift_uuid_to_idx = {s.id: i for i, s in enumerate(req.shift_types)}

    employees = [
        Employee(
            id=i,
            name=e.name,
            role=e.role,
            weekly_contract_hours=e.weekly_contract_hours,
            team=e.team,
        )
        for i, e in enumerate(req.employees)
    ]

    shift_types = [
        ShiftType(
            id=i,
            label=s.label,
            start_hour=s.start_hour,
            end_hour=s.end_hour,
            is_closing=s.is_closing,
            default_required_cooks=s.default_required_cooks,
            default_required_waiters=s.default_required_waiters,
            default_required_barmen=s.default_required_barmen,
        )
        for i, s in enumerate(req.shift_types)
    ]

    shift_requirements = [
        ShiftRequirement(
            shift_id=shift_uuid_to_idx[r.shift_type_id],
            day_of_week=r.day_of_week,
            required_cooks=r.required_cooks,
            required_waiters=r.required_waiters,
            required_barmen=r.required_barmen,
        )
        for r in req.shift_requirements
        if r.shift_type_id in shift_uuid_to_idx
    ]

    unavailabilities = [
        UnavailabilityEntry(
            employee_id=emp_uuid_to_idx[u.employee_id],
            date_index=int(u.date.split("-")[2]) - 1,  # "2026-03-15" → 14
        )
        for u in req.unavailabilities
        if u.employee_id in emp_uuid_to_idx
    ]

    return employees, shift_types, shift_requirements, unavailabilities, emp_uuid_to_idx, shift_uuid_to_idx


def _convert_assignments(raw: dict, req: ScheduleRequest) -> list[AssignmentOut]:
    """Convert solver's (emp_idx, day_idx, shift_idx) keys back to UUIDs + date strings."""
    out = []
    for (e_idx, d_idx, s_idx) in raw:
        day = d_idx + 1
        out.append(AssignmentOut(
            employee_id=req.employees[e_idx].id,
            shift_type_id=req.shift_types[s_idx].id,
            date=f"{req.year}-{req.month:02d}-{day:02d}",
            schedule_month_id=req.schedule_month_id,
        ))
    return out


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@app.post("/generate-schedule", response_model=ScheduleResponse)
def generate_schedule(req: ScheduleRequest) -> ScheduleResponse:
    employees, shift_types, shift_requirements, unavailabilities, emp_map, shift_map = (
        _build_solver_inputs(req)
    )

    month_name = req.month_name or f"{MOIS_FR[req.month]} {req.year}"

    # --- Stage 1: Try clean solve ---
    raw = solve_schedule(
        employees, shift_types, shift_requirements,
        req.num_days, unavailabilities, req.start_weekday,
    )
    if raw is not None:
        return ScheduleResponse(
            status="ok",
            assignments=_convert_assignments(raw, req),
            manager_message=None,
        )

    # --- Stage 2: Diagnose why it failed ---
    conflict = diagnose_conflict(
        employees, shift_types, shift_requirements,
        req.num_days, unavailabilities, req.start_weekday,
    )

    # --- Stage 3: Ask Claude for a relaxation ---
    resolution = ask_claude_for_resolution(conflict, employees, shift_types, month_name)

    if resolution.relaxation.get("type") == "no_fix_possible":
        return ScheduleResponse(
            status="error",
            assignments=None,
            manager_message=resolution.manager_message,
        )

    # --- Stage 4: Retry with the relaxed constraint ---
    raw = solve_schedule(
        employees, shift_types, shift_requirements,
        req.num_days, unavailabilities, req.start_weekday,
        relaxation=resolution.relaxation,
    )
    if raw is not None:
        return ScheduleResponse(
            status="ok_with_compromise",
            assignments=_convert_assignments(raw, req),
            manager_message=resolution.manager_message,
        )

    # Still unsolvable — surface both Claude's message and a fallback note
    return ScheduleResponse(
        status="error",
        assignments=None,
        manager_message=(
            resolution.manager_message + "\n\n"
            "Même après ajustement, aucun planning valide n'a pu être généré. "
            "Veuillez vérifier les indisponibilités ou ajouter du personnel."
        ),
    )


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
