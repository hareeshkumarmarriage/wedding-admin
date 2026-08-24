# Event cover image final repair

- Fixed `/api/media` so Google Drive image covers resolve the same `thumbnailLink` used by the working gallery.
- The cover endpoint first reads Drive file metadata and fetches the Drive thumbnail for image files instead of relying on `files.get?alt=media`.
- Preserves the separate photo/video folder behavior.
- `cover_image_drive_id` remains the source of the event cover and falls back to the existing `cover_image` only when no Drive cover ID is configured.
- The admin Check & Preview flow remains unchanged.
