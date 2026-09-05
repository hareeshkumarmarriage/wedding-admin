# Wedding Admin Platform Architecture

## Goal
Evolve the existing wedding-admin app into a maintainable production admin platform without breaking existing wedding-site functionality.

## Stack
- React 18 + Vite + TypeScript
- React Router
- Tailwind/shadcn UI
- Supabase for database/auth
- Google Drive for wedding media
- Vercel for deployment/API hosting

## Information architecture
1. Dashboard
2. Website
3. Appearance
4. Loading & Intro
5. Events
6. Media
7. Guestbook
8. Interactions
9. Social & Contact
10. Locations
11. QR Codes
12. Analytics
13. Notifications
14. Administration
15. Security
16. Audit Logs
17. Settings
18. System
19. Backup & Restore
20. Integrations
21. Publishing
22. Testing & Diagnostics
23. Trash & Recovery
24. Help & Support

## Product principles
- Existing functionality must remain available while modules are migrated.
- Draft -> Preview -> Validate -> Publish is the target content workflow.
- Administration answers who can manage the panel; Security protects the platform; Audit Logs record what happened.
- Authorization must be enforced server-side; browser storage is not a security boundary.
- Supabase stores application metadata/state; Google Drive remains the media source.
- All external URLs and configurable social links should be data-driven and validated.
- Destructive operations should support confirmation and, where practical, trash/recovery.
- Every important async operation needs loading, success, and actionable error states.

## Migration strategy
The current Admin page is a large monolithic component. Do not replace it in one risky change. Introduce the new architecture beside the existing implementation, then migrate one capability at a time and remove old code only after parity is verified.

## Delivery phases
1. Foundation and navigation contracts
2. Admin shell and dashboard
3. Website/content management
4. Appearance and loading/intro
5. Events and media
6. Guestbook/interactions/social/locations/QR
7. Administration, roles, permissions
8. Security, audit, notifications
9. Publishing, revisions, backup/recovery
10. Integrations, system health, diagnostics
11. Tests, accessibility, performance, deployment hardening
