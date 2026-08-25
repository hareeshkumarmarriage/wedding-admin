# Admin / Content Fixes — 2026-08-25

## Root cause of the Backspace / jump-to-top bug

The `Admin.tsx` Content renderer defined `Field`, `SaveButton`, and `Section` as new React component functions **inside the `renderTab()` function**. Every keystroke changed React state, which recreated those component types. React therefore treated the controls as different component types and remounted the affected subtree. That caused input focus/caret loss and could make the next Backspace act outside the input, triggering browser history navigation. It also reset `<details>` state and contributed to scroll jumps.

### Fix

- Moved the Content form components to module scope:
  - `ContentField`
  - `ContentSaveButton`
  - `ContentSection`
- `ContentSection` now owns its open/closed state so accordion state survives normal form state updates.
- All buttons explicitly use `type="button"`.
- The Backspace guard remains as a defensive measure, but Backspace inside inputs/textareas is allowed normally.
- Save/action operations capture and restore `window.scrollY`.
- The Control Center alert is sticky near the top and uses `aria-live`.
- Save and validation results are routed to the central alert area.

## Intro video / media fixes

- Same-origin `/api/media?id=...` proxy is retained for Google Drive media.
- CSP allows the necessary media/image/frame sources.
- Intro video remounts cleanly when a fallback source changes (`key={source}`).
- Intro uses `loadeddata`/`canplay` readiness handling.
- Intro autoplay/mute settings are read from saved wedding settings.
- Existing fallback behavior remains in place if Drive media cannot be accessed.

## Groom / Bride images

The site continues to use the same-origin Drive media proxy for Drive image IDs and falls back to bundled local images when the Drive image fails.

## Verification

- TypeScript: `tsc --noEmit` — PASS
- Static Admin Content component identity check — PASS
- Static button `type="button"` check — PASS (0 missing)
- Backspace guard check — PASS
- Sticky alert check — PASS
- Scroll restoration check — PASS
- Same-origin media proxy check — PASS
- CSP frame/media directives check — PASS
- Intro source remount/readiness check — PASS
- No zero-byte files found

## Environment limitation

The ZIP does not include `node_modules`, and ESLint/Vite/Vitest dependencies are not installed in the available runtime. Therefore a production Vite build, browser automation run, and project ESLint/Vitest run could not be truthfully reported as executed here. The TypeScript compiler was available and passed.
