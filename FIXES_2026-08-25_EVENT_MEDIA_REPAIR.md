# Event media repair — 2026-08-25

- Event photos use `photos_drive_folder_id`.
- Event videos use `videos_drive_folder_id`.
- Event cover images use `cover_image_drive_id`.
- The browser now falls back to the configured `VITE_GOOGLE_DRIVE_API_KEY` when the same-origin `/api/drive` proxy is unavailable/misconfigured (never for 401/403 lock responses).
- Cover images now use `/api/media` so the selected Drive file is actually rendered through the same media proxy used by the site.
- Drive API errors are surfaced with the provider's message instead of the generic gallery error.

For production, set these server environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EVENT_UNLOCK_SECRET`, and `GOOGLE_DRIVE_API_KEY`. If using the browser fallback in local development, also set `VITE_GOOGLE_DRIVE_API_KEY`.
