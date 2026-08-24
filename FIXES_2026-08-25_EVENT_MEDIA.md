# Event media configuration update

- Replaced the single event Google Drive folder field in Admin > Events with separate Photos and Videos Google Drive folder IDs.
- Added a Google Drive cover/coverage image file ID for every event.
- Added Check & Preview for cover images. Production validation uses `/api/drive-file`; local development falls back to `VITE_GOOGLE_DRIVE_API_KEY` when available.
- Event gallery reads the Photos folder and event videos read the Videos folder, with legacy `drive_folder_id` retained as a fallback.
- Cover images are rendered from the Drive file ID with the existing cover URL/image fallback preserved.
- Added additive Supabase migration columns: `photos_drive_folder_id`, `videos_drive_folder_id`, and `cover_image_drive_id`. Existing `drive_folder_id` values are copied into both new media folder fields on migration.

Run the updated `supabase/schema.sql` in the existing Supabase project before using the new fields.
