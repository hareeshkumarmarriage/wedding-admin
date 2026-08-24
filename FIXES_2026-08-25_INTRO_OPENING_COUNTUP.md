# Intro opening + video mode + wedding elapsed timer

- H ♥ P opening is shown every time the Home page is entered.
- Admin > Loading Logo & Intro now has `Intro video play mode`: Play video once / Play video every visit.
- The actual video uses a separate localStorage key and no longer mixes v1/v2 flags.
- If the video is set to once and has already played, the H ♥ P opening still appears, then the page continues without replaying the video.
- Countdown now counts down before the configured wedding date/time and counts upward after it, showing the exact days/hours/minutes/seconds elapsed since the wedding.
- Wedding date/time is interpreted using the configured IANA timezone.
