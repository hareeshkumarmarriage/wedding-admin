# Local Supabase/API configuration

The local Vite API bridge now loads `.env`, `.env.local`, `.env.development`, and `.env.development.local` through Vite's `loadEnv()` and mirrors the server-side Supabase variables into `process.env` before the `/api/*` handlers run.

Recommended `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Server-side aliases used by local API handlers
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
EVENT_UNLOCK_SECRET=YOUR_LONG_RANDOM_SECRET
```

The service-role key must never be prefixed with `VITE_` and must never be exposed in client code.

## Existing admin-event-code configuration logic

The handler accepts either server-side variables or Vite-prefixed variables:

```js
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
```

The bug was that plain Vite does not copy `.env` values into Node's `process.env` automatically. The new `vite.config.ts` loads them for the local API bridge.
