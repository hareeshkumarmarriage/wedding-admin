# Admin Event Security Code

The Admin dashboard now has a **Change code** control for every event.

## How it works

1. Sign in at `/admin` with an administrator account.
2. Open the **Events** section.
3. Under an event, enter a new security code and confirm it.
4. Click **Change code**.
5. The code is normalized (trimmed/lowercased) and stored only as a SHA-256 hash.
6. The plaintext code is never returned by the API or stored in the database.
7. The change is recorded in `admin_audit_logs`.
8. Existing unlock cookies for that event are invalidated because the event's `updated_at` becomes the unlock token's code version.

## Database migration

Run the current `supabase/schema.sql` in Supabase SQL Editor. The schema includes the `change_event_code` audit action and, importantly, no longer overwrites an existing event's security-code hash when the seed section is re-run.

## Vercel environment variables

The API requires these server-side variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EVENT_UNLOCK_SECRET`

The service-role key must **never** use a `VITE_` prefix and must never be committed to source control.


### Server environment
The change-code endpoint accepts the normal Supabase anonymous key on the server and uses the logged-in admin's bearer token with RLS. Configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` on Vercel. The existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` can also be used as a fallback. A service-role key is not required for changing an event code.
