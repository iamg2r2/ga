# g2r2 Academy — Developer & Administrator Manual

> Working guide for the GitHub Pages + Supabase Academy. This describes the repository after the 2026 modularization. **Not a production-readiness certificate:** complete browser, authorization and 200-user load tests before student rollout.

## 1. Where to change what

| Want to change | Edit / manage |
|---|---|
| Public Academy title, course code and Supabase URL | `config.js` (public configuration only) |
| Browser title, favicon, app shell metadata | `index.html` |
| Colors, spacing, responsive sidebar and typography | `styles.css` |
| Logo, rocket and campus hero images | `assets/` (replace existing assets using their filenames, or update references) |
| Student and faculty dashboard layout | `pages/dashboards.js` |
| Course chooser | `pages/my-courses.js` |
| Study notes reading interface | `pages/study-notes.js` |
| Complete Study Manual interface | `pages/study-manual.js` |
| Lab Record Studio interface | `pages/lab-studio.js` |
| Live classroom interface | `pages/classroom.js` |
| Revision, requests, practice and reports | `pages/learning-workflows.js` |
| Faculty/admin record interfaces | `pages/administration.js` |
| Navigation, event handlers, UI state and mutations | `app.js` |
| Supabase API requests, login and workspace loading | `services/academy-api.js` |
| Course alert aggregation | `services/course-alerts.js` |
| Icon artwork | `components/icons.js` |
| Offline cache and PWA updates | `service-worker.js` |
| Automated tests | `tests/*.test.mjs` |
| CI validation | `.github/workflows/frontend-checks.yml` |

**Important:** The compatibility entrypoints `api.js` and `my-courses.js` re-export modular implementations. Prefer editing the files in `services/` and `pages/`, not the compatibility files.

## 2. Course content and permissions

Course offerings, lessons, materials, lab practicals, unlocks and enrollments are stored in **Supabase**, not as hard-coded content in the page modules. Editing a page renderer changes presentation, not the saved teaching content. Faculty unlock lessons and labs through the Academy interface; students should only receive materials permitted by server-side row-level security (RLS).

Relevant tables include `courses`, `course_units`, `offerings`, `enrollments`, `lessons`, `lesson_materials`, `lesson_unlocks`, `lab_practicals`, `lab_unlocks`, `class_sessions`, `attendance`, `activities`, `activity_releases`, `activity_attempts`, `learning_requests`, `access_grants`, `revision_sets`, `personal_notes` and `profiles`.

Student registration numbers, passwords, role assignments, access grants and destructive admin operations must be managed through the supported authenticated workflows. **Do not** change roles by modifying browser data or trust `user_metadata` for authorization.

## 3. Change Academy branding

1. Replace the appropriate image in `assets/`, keeping the same filename, or update its reference.
2. Adjust the layout/colors in `styles.css`.
3. Update the visible title/description in `index.html` and public defaults in `config.js`.
4. Increment the `CACHE` version in `service-worker.js` when changing cached files.
5. Test on a phone-width browser, refresh while inside a course, and verify offline shell loading.

For a different institute, replace branding and configure its own Supabase project, course offerings and users. **Do not share a production Supabase database across institutions without an explicitly designed tenant isolation model and tested RLS.**

## 4. Add or change lessons and labs

1. Use a faculty/admin account to select the intended course offering.
2. Create/edit teaching hours and their material; check unit and teaching-hour ordering.
3. Preview notes as faculty, then unlock only intended lessons for students.
4. Manage Dart/Flutter practicals separately through Lab Record Studio; check experiment ordering and lab unlocks.
5. Test using a student account. A locked lesson or lab must remain unavailable, including through direct API calls.
6. Test learning requests: selected students, access until revoked by default, and no changes to original graded attempts.

For schema changes, maintain a reviewed SQL migration and retest RLS; do not edit the database casually from the browser.

## 5. Deploy with GitHub Pages + Supabase

- Frontend: push reviewed changes to the repository's `main` branch and confirm GitHub Pages is publishing the intended branch/folder.
- Backend: create or configure the Supabase project, Auth settings, tables, RLS policies, RPCs and any required Edge Functions.
- In `config.js`, use only the public project URL and **publishable** key. Never commit service-role keys, secrets, admin credentials or student passwords.
- Run CI: `node --check app.js` and `node --experimental-default-type=module --test tests/*.test.mjs`.
- Verify login, course chooser, notes, labs, live session, revision, student requests, account management, refresh/deep links and mobile layouts.
- Review Supabase Security and Performance Advisors after backend changes.

## 6. Operational maintenance

- **Student cannot see course:** check enrollment, course offering, active account and RLS.
- **Notes not visible:** verify lesson materials, unlocks, special grants and selected offering.
- **Old UI persists:** deploy a new service-worker cache version; reload and verify cached assets.
- **Login fails:** check Supabase Auth configuration and registration-number Edge Function, then browser network errors.
- **Classroom updates slowly:** inspect scoped session queries, polling behavior and Supabase latency.
- **Admin action fails:** check RPC authorization and audit logs; never disable RLS to work around a permission error.

## 7. Release acceptance checklist (must be evidenced)

- [ ] All GitHub Actions checks pass on the release commit.
- [ ] Browser E2E: faculty, student and admin roles on desktop and mobile.
- [ ] Security: direct API attempts cannot read locked notes, other students' records or cross-course data.
- [ ] Course switching, refresh, offline shell and new-login behavior verified.
- [ ] Graded classroom attempt remains immutable; revision practice stays ungraded.
- [ ] Backup/restore and student import/export verified.
- [ ] 200 simulated concurrent users tested against an isolated test dataset; record latency, errors and throttling.
- [ ] Supabase Security Advisor warnings individually reviewed and documented.

## 8. Future multi-institution release

The current Academy is a single-deployment application. To package it for multiple institutes, add institution-scoped tables/roles, tenant-aware RLS and administrator configuration, an installation/migration process, institution themes, and isolated backup/export. Treat this as a separate product phase, not an automatic result of the current refactor.
