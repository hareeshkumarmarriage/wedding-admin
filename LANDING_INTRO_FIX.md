# Landing Intro Playback Fix — 2026-08-25

Fixed the landing-page opening flow so the intro video cannot be started twice by competing autoplay/play calls or duplicate completion events.

## Changes
- Removed the duplicate `autoPlay` + manual `video.play()` startup path. Playback now starts once, after the video is ready.
- Added a playback-start guard so React/state updates cannot call `play()` twice for the same source.
- Added a finish guard so `onEnded`, Skip Intro, Continue, or repeated events can only close the intro once.
- Added a per-page session guard so the intro overlay is mounted only once per navigation cycle.
- Prevented the loading overlay completion event from being dispatched twice for the same pathname.
- Removed the old loader marker clearing that could cause the loading screen and intro to overlap during navigation.

## Verification
- Source-level inspection completed.
- TypeScript verification was attempted but the environment is missing the `vitest/globals` type package from the installed dependency tree.
- ESLint was attempted on the three changed files but exceeded the environment timeout.
