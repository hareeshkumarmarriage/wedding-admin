# Final fixes — fullscreen, intro, loading, countdown

- Mobile fullscreen no longer requests landscape orientation. Where the browser supports the Fullscreen Orientation API, fullscreen is explicitly locked to `portrait` and unlocked when fullscreen ends.
- The intro video's existing Mobile Portrait Rotation setting remains scoped to the intro video only; it does not rotate the wedding site.
- The intro is now a one-time experience using `localStorage` key `wedding-intro-played-v1`. Returning to Home does not replay it.
- The application uses the shared `PageLoadingOverlay` as the single configurable loading screen. Its `Show loading on all pages` setting controls route navigation.
- Countdown calculates `wedding date + wedding time + configured IANA timezone` against `Date.now()` every second, clamped at zero after the target.
