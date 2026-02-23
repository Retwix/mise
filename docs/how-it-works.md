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
3. Il crée ses **employés** (`/employees`) : nom, email, téléphone
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
3. Il clique **"Générer le planning"** — l'algorithme s'exécute :
   - Pour chaque jour du mois, pour chaque type de shift
   - Il filtre les employés disponibles ce jour-là
   - Il trie par nombre de fermetures (ou shifts totaux) pour équilibrer la charge
   - Il affecte le nombre requis d'employés (`required_count`)
4. Le planning s'affiche sous forme de grille jour par jour

### 4. Ajustements manuels (gérant)

Sur la page du mois :
- **Retirer une affectation** : cliquer sur le badge d'un employé dans la grille
- **Sidebar "Fermetures"** : affiche le nombre de fermetures par employé et l'écart max, pour repérer les déséquilibres (badge rouge si écart > 2)
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
2. Pour chaque jour du mois :
   - Pour chaque type de shift :
     - Filtre les employés disponibles (pas indisponible, pas déjà affecté ce jour)
     - Trie par charge : fermetures pour les shifts de fermeture, total sinon
     - Prend les N premiers (`required_count`)
3. Met à jour les compteurs après chaque affectation

**Garanties :**
- Un employé indisponible n'est jamais affecté
- Un employé n'est affecté qu'une fois par jour
- Si moins d'employés que requis sont disponibles, on affecte ce qui est possible
- L'écart de fermetures entre employés reste ≤ 2 sur un mois normal

---

## Base de données (Supabase)

```
employees         → id, name, email, phone, token_dispo, token_view
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
