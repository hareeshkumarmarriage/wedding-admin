# Final Loading / Intro / Countdown Fixes — 2026-08-25

- Removed the separate global PageLoadingOverlay from App.tsx so the landing page no longer stacks the custom loader over the intro experience.
- Intro video remains the single first-visit intro experience and is persisted with localStorage key `wedding-intro-played-v2`.
- Intro mobile portrait rotation is scoped to the intro video element only.
- Countdown is recalculated every second from the configured Wedding Date + Wedding Time in the configured IANA timezone against `Date.now()`.
- Countdown clamps at zero after the wedding time has passed.
- The recording supplied on 25 Aug 2026 shows an April 2026 wedding date; therefore zero countdown is expected for that configuration. Set a future wedding date/time in Admin to see the live countdown decrease.
