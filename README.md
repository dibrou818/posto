# Posto

Web app pour découvrir des lieux proposant des activités récurrentes et des
événements ponctuels, avec recherche floue (noms + tags), carte interactive
avec clustering, et un espace propriétaire pour gérer ses lieux.

## Stack

- **Next.js 16** (App Router, TypeScript) + Tailwind CSS v4
- **Supabase** (Postgres + Auth + Storage), recherche floue via `pg_trgm`
- **Leaflet** + `leaflet.markercluster` pour la carte, tuiles **CARTO Voyager**

## Développement local

```bash
npm install
npm run dev
```

Variables d'environnement requises dans `.env.local` (jamais commité) :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_CARTO_API_KEY=   # optionnel, lève la limite de tuiles CARTO
```

## Structure

- `src/app` — pages (App Router) : accueil (liste), `/map` (carte plein écran),
  fiche lieu, auth, dashboard propriétaire
- `src/components` — composants UI, `dashboard/` pour les formulaires de gestion
- `src/lib` — client Supabase (browser/server/middleware), requêtes DB, helpers
