# ShapeForge

ShapeForge is a mobile-first PWA for managing a personal fitness nutrition and training plan.

The app is built around a Bulgarian user experience and keeps all user-facing plan content in Bulgarian. Code, service names, and database entities are kept in English.

## Features

- Nutrition plan overview
- Daily targets and body measurements
- Supplements and advice notes
- Monthly food regime by day and meal slot
- Shopping lists grouped by month and category
- Recipe library with month associations
- Training plan structure with exercise notes, images, and video links
- Supabase authentication and synced data across devices
- PWA support for installing on Android and iOS

## Tech Stack

- React 19
- TypeScript
- Vite
- Supabase
- Vercel
- vite-plugin-pwa
- lucide-react
- Recharts

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Set the Supabase variables:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
```

Start the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Database

Supabase is used for authentication and normalized app data.

Schema migrations live in:

```text
supabase/migrations/
```

The initial data source and database planning docs live in:

```text
docs/initial-data.md
docs/database-schema.md
docs/next-steps.md
```

Private seed scripts with real user data are intentionally kept out of the public migration flow unless explicitly needed.

## Deployment

The app is deployed on Vercel from the GitHub repository.

Required Vercel environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

After changing environment variables in Vercel, redeploy the project so Vite can bake them into the production bundle.

## Notes

- The app is optimized primarily for mobile use.
- The UI is Bulgarian by design.
- The codebase should avoid large files and move toward feature/domain boundaries as the Supabase migration progresses.
