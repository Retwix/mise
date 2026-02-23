# Design: Rest day cadence (2 consecutive days per rolling 7-day window)

Date: 2026-02-23

## Context

French labor law requires employees to have at least 2 consecutive rest days per week. The current algorithm ignores this — it can assign an employee every single day of the month.

## Constraint

In any 7-day rolling window, each employee must have at least 2 consecutive rest days. Implemented as: **max 5 consecutive work days, followed by 2 forced rest days.**

## Approach: Consecutive streak tracker

Two new per-employee counters in `generateSchedule`, alongside the existing `closingCounts` and `totalCounts`:

- `streak: Record<string, number>` — consecutive work days (0 = currently resting or fresh)
- `forcedRest: Record<string, number>` — forced rest days remaining (0 = free to work)

### Filter change

Add `forcedRest[e.id] === 0` to the `available` filter so employees under forced rest are never assigned.

### End-of-day update (after all shifts for a day are filled)

For every employee:
- **If assigned today:** increment `streak[e.id]`. If streak reaches 5, set `forcedRest[e.id] = 2` and reset `streak[e.id] = 0`.
- **If not assigned today:** if `forcedRest[e.id] > 0`, decrement it; otherwise reset `streak[e.id] = 0` (any voluntary rest day resets the streak).

### Month boundary

Streaks reset at month start (no cross-month carry-over). This is acceptable for now.

## Files touched

- `src/lib/algorithm.ts` — add streak/forcedRest tracking
- `src/lib/algorithm.test.ts` — two new tests

## No DB or UI changes required.
