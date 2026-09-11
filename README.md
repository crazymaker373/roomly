# Roomly

WG-Einrichtungsausgaben-Tracker für eine 4-Personen-Wohngemeinschaft mit interaktivem 3D-Grundriss.

## Features

- **3D-Grundriss** – Klickbare Räume mit sanfter Kamera-Zoomfahrt (React Three Fiber)
- **Ausgaben-CRUD** – Möbel, Deko, Elektronik und mehr pro Raum erfassen
- **Fair-Share-Abrechnung** – Wer hat wie viel bezahlt, wer schuldet wem beim Auszug
- **WG-Onboarding** – WG gründen oder per Einladungscode beitreten
- **Dark/Light Theme** – shadcn/ui mit next-themes

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS
- Supabase (Auth, Postgres, RLS, Storage)
- React Three Fiber + Drei CameraControls
- Framer Motion

## Lokale Entwicklung

1. `.env.local` anlegen:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

2. Abhängigkeiten installieren und Dev-Server starten:

```bash
npm install
npm run dev
```

App läuft auf [http://localhost:4317](http://localhost:4317).

## Supabase

Roomly teilt das **DriveLog**-Supabase-Projekt (Free-Plan, max. 2 Projekte). Die Tabellen liegen im Schema `roomly` und kollidieren nicht mit DriveLogs `public.expenses` / Fahrzeugen.

Auth (E-Mail-Bestätigung, Google) bleibt die DriveLog-Konfiguration. Neue User bekommen automatisch ein `roomly.profiles`-Row. DriveLog-Redirects bleiben unverändert; Roomly-Callbacks sind zusätzlich erlaubt.

```env
NEXT_PUBLIC_SUPABASE_URL=https://frdgpfvpzhvmriqxyabi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Projektstruktur

```
app/
  (auth)/login, register
  auth/callback/route.ts
  onboarding/
  (app)/dashboard, expenses, settle, rooms/[roomId]
components/
  floorplan/, expenses/, stats/, ui/
lib/
  data/          # Repository + Supabase-Provider
  services/      # Domain-Logik (Settlement)
  supabase/      # SSR-Clients
  actions/       # Server Actions
supabase/migrations/
```

## Auth

- E-Mail/Passwort (v1)
- Google OAuth vorbereitet (Callback-URLs), noch nicht aktiv
- Nach Registrierung → Onboarding (WG gründen oder beitreten)

## Deployment

- **GitHub**: privates Repo `roomly`
- **Vercel**: Production-Deploy mit `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase Auth Site URL auf die Vercel-Production-URL setzen
