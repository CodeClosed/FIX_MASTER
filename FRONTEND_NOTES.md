# FIX_MASTER — Frontend Notes

Status as of the `fix/backend-hardening` branch: all backend gaps the frontend
was originally built against (B1–B7) have since been implemented, and the
frontend has been rewired to use the real endpoints in place of the mock
shims it originally used. Full detail and reproduction steps for the backend
side of each fix are in [`docs/BUGFIXES.md`](docs/BUGFIXES.md).

## Gap-by-gap status

### B1 — Staff Roster (manual dispatch)
**Implemented.** `GET /api/meta/staff?specialization=` (SUPERVISOR/ADMIN
only), including a live `active_task_count`. `DispatchDrawer.tsx` now calls
`metaApi.getStaff(complaint.required_specialization)` instead of the old
mock array, so it's pre-filtered to the trade the ticket actually needs.

### B2 — Common Area Facilities
**Implemented.** `GET /api/meta/blocks/:block_id/common-areas`.
`NewComplaintForm.tsx` calls `metaApi.getCommonAreas(blockId)` instead of
the old mock list.

### B3 — Student Room Allotment
**Implemented**, layered on top of the existing localStorage cache rather
than replacing it. `GET /api/me/allotment` returns the student's current
room; `StudentHome.tsx` fetches it on mount and writes it into the same
`fixmaster_student_allotment` cache the manual `AllotmentModal` already
used. A 404 (no allotment on record - true for any freshly self-registered
account, since registration doesn't create a room assignment) falls back to
the manual modal exactly as before. The cache stays as the synchronous,
offline-friendly read that `NewComplaintForm` and the quick-action handler
use.

### B4 — Single Complaint GET
**Implemented.** `GET /api/complaints/:id`, with the same visibility rules
as the list endpoint (STUDENT: own only, STAFF: assigned only,
SUPERVISOR/ADMIN: unrestricted). Not yet wired into a deep-link flow - the
app still resolves complaint detail views from the cached list query, which
remains a valid approach since the list is always fetched first.

### B5 — Staff Task Transition to IN_PROGRESS
**Implemented.** `PATCH /api/dispatch/tasks/:assignment_id/start`, with the
same ownership check as the existing "mark done" transition. `StaffQueue.tsx`'s
"Start Work" button - previously a permanently disabled placeholder - now
calls `dispatchApi.startWork()` and the task card switches to an
"In Progress" indicator on success.

### B6 — Seed Account Hashes
**Fixed at the source.** `database/seed_data.sql` now uses a real, verified
bcrypt hash of `Password@123` for all 12 seed users. `RegisterScreen.tsx`
no longer exposes a role picker at all - see the security note below - so
this is now purely a login-page convenience note rather than a required
workaround.

### B7 — Complaint Audit Trail
**Implemented.** `GET /api/complaints/:id/logs`, attributing each row to
the acting user by name (via the audit trigger's session-GUC fix - see
`docs/BUGFIXES.md` #10). `ComplaintDetail.tsx` now fetches real log rows and
falls back to the client-side `reconstructTimeline()` only when the log is
empty, which is expected and correct for a brand-new `OPEN` ticket (the
trigger fires on a status *change*, not on creation).

## A security fix made along the way

The original `RegisterScreen.tsx` exposed a public role picker
(STUDENT/STAFF/SUPERVISOR/ADMIN) with no server-side restriction behind it -
anyone could register as ADMIN. The backend fix
(`src/controllers/authController.js`) now forces `role = 'STUDENT'` for any
unauthenticated registration request; only an already-authenticated ADMIN
may create a STAFF/SUPERVISOR/ADMIN account. The frontend's public
registration form was updated to match: it no longer offers a role picker
at all and always registers a STUDENT. Leaving the picker in place would
have meant a user could select "STAFF," fill in a specialization, submit,
and silently get back a STUDENT account with no explanation - the two
needed to change together.

## A second integration fix

`api/client.ts` originally treated both 401 and 403 as "log the user out."
That was correct for 401 but wrong for 403: `authorize()` (RBAC) and the new
ownership checks (e.g. "you can only complete your own tasks") also return
403 for entirely normal permission boundaries that should show as an
ordinary error, not force a logout. The backend was changed to return 401
(not 403) specifically for an invalid/expired token
(`src/middleware/auth.js`), and the frontend now only auto-logs-out on 401.

## Verification

- `npm run lint` (`tsc --noEmit`) and `npm run build` both pass clean.
- A 14-step scripted integration test drove the exact call sequence each
  rewired screen makes (register → login → allotment auto-fetch → quick
  action → common-area filing → staff-filtered dispatch → auto-dispatch →
  start work → mark done → verify/close-loop → audit log → KPIs → filters →
  cross-staff IDOR still blocked) against the live backend, plus a separate
  pass for the escalation branch (reject → ESCALATED → EscalatedQueue →
  reassign). All checks passed.
- No browser-automation tool was available in this environment, so no
  actual click-through/visual QA was performed - the checks above verify
  every API contract the UI depends on, and that the TypeScript compiles
  and bundles cleanly, but not pixel-level rendering or click interactions.

## Running locally

```bash
# backend (from the repo root)
node src/server.js            # expects .env from .env.example, Postgres loaded via database/init_all.sql

# frontend
cd client
npm install
npm run dev                   # http://localhost:3000, talks to http://localhost:5000/api by default
```
