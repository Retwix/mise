# Design: Système de rôles

Date: 2026-02-23

## Contexte

Les employés ont des statuts contractuels différents (salarié, étudiant, manager) qui impliquent des plafonds d'heures différents. Le gérant doit pouvoir créer/supprimer des rôles et configurer leur max d'heures mensuelles.

**À venir (sprint suivant) :** une table `jobs` (cuisinier, serveur, barman) déterminera quels shifts chaque employé peut faire. Pour éviter une migration destructive, les colonnes `job_id` sont ajoutées maintenant (nullable, sans logique).

---

## Modèle de données

### Nouvelle table `roles`
```sql
create table roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  max_hours_per_month integer, -- nullable = pas de limite
  created_at timestamptz default now()
);
```

### Nouvelle table `jobs` (stub pour le futur)
```sql
create table jobs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);
```

### Modifications `employees`
```sql
alter table employees add column role_id uuid references roles(id) on delete set null;
alter table employees add column job_id  uuid references jobs(id)  on delete set null;
```

### Modifications `shift_types`
```sql
alter table shift_types add column job_id uuid references jobs(id) on delete set null;
```

---

## Deux dimensions orthogonales

| Dimension | Table | Effet |
|-----------|-------|-------|
| **Rôle** | `roles` | Plafond d'heures/mois par contrat |
| **Métier** | `jobs` *(futur)* | Quels shifts l'employé peut faire |

Un employé peut être "étudiant barman" : rôle=étudiant (max 80h), métier=barman (shifts de bar uniquement).

---

## Algorithme (`src/lib/algorithm.ts`)

### Nouveau paramètre
```ts
generateSchedule(employees, shiftTypes, year, month, availabilities, roles)
```

### Suivi des heures travaillées
```ts
const hoursWorked: Record<string, number> = Object.fromEntries(employees.map(e => [e.id, 0]))
```

Durée d'un shift calculée depuis `start_time`/`end_time` :
```ts
function shiftDuration(shift: ShiftType): number {
  const [sh, sm] = shift.start_time.split(':').map(Number)
  const [eh, em] = shift.end_time.split(':').map(Number)
  const minutes = (eh * 60 + em) - (sh * 60 + sm)
  return minutes / 60 // heures
}
```

### Filtre candidats
Ajouter la condition heures dans le filtre `available` :
```ts
&& (() => {
  const role = roles.find(r => r.id === e.role_id)
  if (!role?.max_hours_per_month) return true
  return hoursWorked[e.id] + shiftDuration(shift) <= role.max_hours_per_month
})()
```

Après chaque affectation, incrémenter `hoursWorked[emp.id] += shiftDuration(shift)`.

Le `max_shifts_per_month` existant reste indépendant.

---

## TypeScript

```ts
export type Role = {
  id: string
  name: string
  max_hours_per_month: number | null
  created_at: string
}

export type Job = {
  id: string
  name: string
  created_at: string
}
```

`Employee` reçoit :
```ts
role_id: string | null
job_id: string | null
```

---

## UI

### Nouvelle page `/roles`
- Liste des rôles : nom + badge `max X h/mois` (ou "Illimité")
- Modal "Ajouter un rôle" : nom (requis) + max heures (optionnel)
- Bouton supprimer (désassigne les employés via `ON DELETE SET NULL`)
- Lien "Rôles" dans la nav `ManagerShell`

### EmployeesPage
- Modal d'ajout : `Select` de rôle (optionnel)
- Tableau : colonne "Rôle" avec badge + `Select` inline pour modifier

---

## RLS

```sql
-- Gérant : accès complet
create policy "manager full access roles" on roles for all to authenticated using (true) with check (true);
create policy "manager full access jobs"  on jobs  for all to authenticated using (true) with check (true);
-- Anon : lecture seule (pour résoudre les rôles côté planning employé si besoin)
create policy "anon read roles" on roles for select to anon using (true);
create policy "anon read jobs"  on jobs  for select to anon using (true);
```

---

## Fichiers touchés

- `supabase/schema.sql` — nouvelles tables + colonnes
- `src/types/index.ts` — types `Role`, `Job`, champs sur `Employee`
- `src/lib/algorithm.ts` — paramètre `roles`, suivi `hoursWorked`, filtre
- `src/lib/algorithm.test.ts` — tests du plafond horaire
- `src/pages/MonthPage/hooks/useMonthData.ts` — fetch roles
- `src/pages/MonthPage/hooks/useAssignments.ts` — passer roles à generateSchedule
- `src/pages/EmployeesPage.tsx` — Select rôle dans modal + tableau
- `src/pages/RolesPage.tsx` — nouvelle page (créer/supprimer)
- `src/components/AppShell.tsx` — lien nav "Rôles"
- `src/App.tsx` — route `/roles`
