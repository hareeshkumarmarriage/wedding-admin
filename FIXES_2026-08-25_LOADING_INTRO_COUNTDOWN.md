# Loading, Intro Video, Fullscreen & Countdown Fixes — 2026-08-25

## Intro video mobile rotation
- `introMobilePortrait` applies only to the intro `<video>` element.
- The wedding entry site is never rotated by this option.
- Removed mobile landscape orientation locking from the intro fullscreen button.
- Removed mobile landscape orientation locking from the global website fullscreen button.

## One loading screen
- Removed the duplicate homepage loading implementation from `Index.tsx`.
- Added one shared `PageLoadingOverlay` used by the application.
- The homepage always uses this single loading screen.
- Added Admin > Loading Logo & Intro > **Show loading on all pages**.
- When enabled, the same loading screen appears on route changes to every page.
- When disabled, non-home pages do not show the loading overlay.
- Loading text, heart, layout, font sizes and duration remain controlled by the existing settings.

## Countdown
- The homepage countdown uses the configured Wedding Date, Wedding Time and Timezone.
- Remaining time is recalculated every second against the visitor's current timestamp (`Date.now()`).
- The countdown is clamped to zero after the wedding date/time has passed.
