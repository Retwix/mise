# Comment fonctionne l'application

## Vue d'ensemble

L'application permet à un gérant de restaurant de générer le planning mensuel de son équipe. Les employés soumettent leurs indisponibilités via un lien unique, et consultent leur planning personnel via un autre lien. Aucun compte n'est nécessaire pour les employés.

---

## Les acteurs

| Acteur | Accès | Authentification |
|--------|-------|-----------------|
| Gérant | Interface complète de gestion | Email + mot de passe (Supabase Auth) |
| Employé | Page dispos + page planning personnel | Token UUID dans l'URL (sans compte) |

---

## Workflow complet

### 1. Configuration initiale (gérant)

1. Le gérant se connecte sur `/login`
2. Il crée ses **types de shifts** (`/shift-types`) : label, horaires, nombre de postes requis, s'il s'agit d'une fermeture
3. Il crée ses **employés** (`/employees`) : nom, email, téléphone, et optionnellement un **max de shifts par mois** (pour les temps partiels)
4. Pour chaque employé, deux liens sont générés automatiquement :
   - **Lien dispos** → `/dispo/{token_dispo}` : l'employé y indique ses indisponibilités
   - **Lien planning** → `/planning/{token_view}` : l'employé y consulte son planning

### 2. Collecte des disponibilités (employés)

Les employés reçoivent leur lien dispos (par SMS, email, WhatsApp…). Sur la page :

- Un calendrier du **mois suivant** s'affiche
- L'employé **clique sur les jours où il n'est PAS disponible** (ils s'affichent en rouge barré)
- Il clique **"Confirmer mes dispos"** pour sauvegarder

Les données sont stockées dans la table `availabilities` via un `upsert` — l'employé peut revenir modifier ses dispos autant de fois que nécessaire.

### 3. Génération du planning (gérant)

1. Le gérant crée un **mois** depuis le dashboard (`/dashboard`) avec le sélecteur de mois
2. Il est redirigé vers la page du mois (`/month/:id`)
3. Il clique **"Générer le planning"** — l'algorithme s'exécute (voir section dédiée)
4. Le planning s'affiche sous forme de grille jour par jour

### 4. Ajustements manuels (gérant)

Sur la page du mois :
- **Retirer une affectation** : cliquer sur le badge d'un employé dans la grille
- **Sidebar "Fermetures"** : affiche par employé :
  - Badge vert/rouge — nombre de fermetures (rouge si l'écart max dépasse 2)
  - Badge bleu — nombre total de shifts affectés ce mois
- Il est possible de **régénérer** le planning à tout moment (les affectations existantes sont supprimées et recalculées)

### 5. Publication (gérant)

Une fois le planning satisfaisant, le gérant clique **"Publier"**. Le statut passe de `draft` à `published` :
- Les employés peuvent désormais voir leurs shifts sur leur page planning
- Les affectations publiées sont accessibles aux anonymes via les RLS Supabase

### 6. Consultation du planning (employés)

Sur `/planning/{token_view}`, l'employé voit :
- La liste de tous ses shifts des mois **publiés**
- Groupés par mois, triés par date
- Avec le label et les horaires de chaque shift

---

## L'algorithme de planification

Fichier : `src/lib/algorithm.ts`

L'algorithme est une fonction pure TypeScript (pas d'appels réseau) :

```
generateSchedule(employees, shiftTypes, year, month, availabilities)
  → Assignment[]
```

**Logique :**

1. Construit un `Set` des paires `employé:date` indisponibles
2. Initialise des compteurs par employé : fermetures, total shifts, streak consécutif, jours de repos forcé
3. Pour chaque jour du mois :
   - Pour chaque type de shift :
     - Filtre les employés **disponibles** (pas indisponible, pas déjà affecté ce jour, pas en repos forcé, pas au plafond mensuel)
     - Trie par charge : fermetures pour les shifts de fermeture, total sinon
     - Prend les N premiers (`required_count`)
   - Après tous les shifts du jour, met à jour les streaks :
     - Employé affecté → streak+1 ; si streak atteint 5 → 2 jours de repos forcé, streak remis à 0
     - Employé non affecté → décrémente repos forcé si actif, sinon remet streak à 0

**Garanties :**
- Un employé indisponible n'est jamais affecté
- Un employé n'est affecté qu'une fois par jour
- Un employé ne travaille jamais plus de 5 jours consécutifs (2 jours de repos forcés ensuite)
- Un employé avec `max_shifts_per_month` ne dépasse jamais ce plafond
- Si moins d'employés que requis sont disponibles, on affecte ce qui est possible
- L'écart de fermetures entre employés reste ≤ 2 sur un mois normal

---

## Base de données (Supabase)

```
employees         → id, name, email, phone, token_dispo, token_view, max_shifts_per_month
shift_types       → id, label, start_time, end_time, required_count, is_closing
schedule_months   → id, month (YYYY-MM), status (draft|published)
availabilities    → employee_id, date, is_unavailable
assignments       → employee_id, schedule_month_id, date, shift_type_id
```

**Sécurité (RLS) :**
- Le gérant authentifié a accès complet à toutes les tables
- Les anonymes peuvent lire les employés (lookup par token)
- Les anonymes peuvent lire/écrire les disponibilités (soumission via token)
- Les anonymes peuvent lire uniquement les affectations des mois **publiés**

---

## Architecture front-end

- **TanStack Query** gère le fetching et l'invalidation du cache sur la page mois
- `MonthPage` est décomposé en hooks (`useMonthData`, `useAssignments`) et composants (`MonthHeader`, `ScheduleGrid`, `ClosingStatsSidebar`)
- Les mutations (générer, retirer, publier) invalident automatiquement les queries concernées

---

## Déploiement

Le fichier `vercel.json` redirige toutes les routes vers `index.html` (requis pour une SPA React Router) :

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Variables d'environnement à configurer (Vercel ou `.env` local) :
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
