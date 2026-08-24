# Content/Admin Changes — 2026-08-25

## Requested changes implemented

1. **Primary theme**
   - Replaced free-text theme entry with a dropdown.
   - Added: Rose, Gold, Sage, Blush, Mauve, Terracotta, Lavender, Navy.
   - Added matching CSS theme variables.

2. **Home Page Section Manager**
   - Edit and View both open the selected Content section.
   - The selected section is expanded automatically before scrolling.
   - Scrolls to the actual Control Center selection instead of opening the public website.

3. **Loading Logo & Intro**
   - One loading screen only.
   - Loading text 1 is editable.
   - Blinking heart is shown between the two text lines.
   - Loading text 2 is editable.
   - Loading duration is editable in seconds (0.5–10 seconds).
   - Show intro video is an explicit toggle.
   - Intro Drive ID, Autoplay, Mute and Skip Button are disabled/locked until Show intro video is enabled.

4. **Countdown**
   - Countdown now counts DOWN to the configured wedding date and time.
   - Uses the configured wedding timezone, defaulting to Asia/Kolkata.
   - Shows Days / Hours / Minutes / Seconds.
   - Countdown respects the existing Countdown enabled switch.

5. **Google Maps**
   - Open Location in Google Maps button is centered.

6. **Timeline**
   - Icon is now a dropdown instead of free text.
   - Options: Church, Camera, Heart, Welcome / Drinks, Food / Dinner, Music, Cake, Depart.

7. **YouTube**
   - YouTube blog videos are centered and constrained to a readable maximum width.

## Verification

- package.json, package-lock.json and vercel.json parse successfully.
- Source-level checks completed for the requested controls.
- npm dependency installation was attempted but timed out in the execution environment, so a fresh production build could not be completed here.
