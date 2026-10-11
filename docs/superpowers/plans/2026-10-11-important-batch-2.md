# Important batch 2 — Problem.md items 15, 12, 13, 14, 17

> Spec: none as a file. The approved design (chat, 2026-10-11, classified architectural) is the binding authority; this plan is its argument.

**Branch:** `fix/important-batch-2` (based on `main` @ `24b0848`). Do not merge, push, or switch branches. Do not touch `Problem.md`.

**Stack:** React 19 + TypeScript + Vite + Vitest (frontend, root `package.json`); Express 4 + Zod + Drizzle + Postgres (backend in `backend/`). Backend tests need the PostgreSQL test container on `127.0.0.1:5432` (`study-test-postgres`, already running).

**Baselines before this batch:** backend `npm test` = 13 files / 101 tests; frontend `npm test` = 42 files / 244 tests; `npx tsc -b` (root) and `npx tsc --noEmit` (backend) exit 0.

**Task order:** 1 (item 15) → 2 (item 12) → 3 (item 13) → 4 (item 14) → 5 (item 17, CI) → 6 (item 17, e2e smoke).

## Global Constraints

- Each task ends with a commit made by the implementer. Commit message style follows the repo: `fix:` / `test:` / `ci:` / `chore:` prefix, short subject, body with the why.
- Do not read or write `.env` files. Do not put secrets in tracked files. Test values for CI and e2e are passed as environment variables.
- Pomodoro limits (server truth, `backend/src/lib/validation.ts`, `settingsSchema`): work 1–120, short break 1–60, long break 1–120 minutes.
- Server-side lesson date validation stays shape-only (`isoDate`), unchanged.
- No behavior changes outside the task's scope. Pre-existing problems found on the way go into the report, not into the diff.
- Subagents never spawn subagents. Use the explicit model given by the controller.

---

## Task 1: Vulnerable dependencies (Problem.md item 15)

**Context:** `npm audit --omit=dev` on the backend reports 8 issues: `tar` (critical) and `@mapbox/node-pre-gyp` (high) come through `bcrypt@5`; `proxy-addr` (critical) comes through `express@4.22.2`; `drizzle-orm` (high) needs `0.45.4`; `brace-expansion` (high); `qs`, `body-parser` (moderate). The frontend has 2 high issues (`nanoid`, `brace-expansion`), fixable without breaking changes. `bcrypt@6.0.0` depends only on `node-addon-api` and `node-gyp-build`, so the `tar` chain goes away. Password hashes are standard `$2b$` bcrypt and stay valid.

**Files:** `backend/package.json`, `backend/package-lock.json`, `package.json`, `package-lock.json`, `backend/test/password.test.ts` (new). Possibly `backend/package.json` for removing `@types/bcrypt` if `bcrypt@6` ships its own types.

**Steps:**
1. Compatibility guard, written BEFORE the upgrade. Generate a hash with the currently installed `bcrypt@5` for `password123` (run `node -e` inside `backend/`, do not write the hash into a file by hand). Create `backend/test/password.test.ts` with a test that `verifyPassword('password123', <that hash literal>)` resolves `true`, and that `verifyPassword('wrong-password', <that hash literal>)` resolves `false`. Use `hashPassword`/`verifyPassword` from `backend/src/lib/password.ts`. Run it: it must pass on the current code (this is the guard, not a red test). Commit it as `test: pin bcrypt hash compatibility before upgrade`.
2. Upgrade in `backend/`: `npm install bcrypt@^6.0.0 express@^4.22.3 drizzle-orm@^0.45.4`. Then check `npm ls tar` shows no `tar` under `bcrypt`. If `bcrypt@6` ships its own types, remove `@types/bcrypt` and keep `tsc` green; otherwise keep it.
3. Root (frontend): `npm audit fix` (no `--force`).
4. Verify: `cd backend && npx tsc --noEmit`; `cd backend && npm test` (expect 14 files, 104 tests); root `npx tsc -b`; root `npm test` (expect 42 files, 244 tests); `npm audit --omit=dev` in both directories.
5. If `drizzle-orm@0.45.4` or `express@4.22.3` breaks anything, fix within the upgrade or report BLOCKED with the exact error. Do not fall back to `--force`.
6. Commit as `chore: upgrade bcrypt, express and drizzle-orm to fix audit findings`. In the report, include the `npm audit --omit=dev` summary before and after for both directories. Any remaining issue must be listed by package name with its severity and whether a non-breaking fix exists.

**Acceptance:** backend prod audit has no critical or high; frontend prod audit has no high; all tests green; the compatibility guard test is in the suite.

---

## Task 2: Pomodoro duration fields (Problem.md item 12)

**Context:** `src/pages/SettingsPage.tsx` (lines ~24–47) and `src/pages/FocusPage.tsx` (lines ~17–21, ~41–48) call `updateSettings` on every keystroke. An empty field is replaced by the default (25) at once; values above the server limit are rejected with 400 and rolled back; `FocusPage` allows long break up to 60 while the server allows 120.

**Files:** `src/lib/constants.ts` (add `POMODORO_LIMITS`), new `src/components/settings/PomodoroDurationInput.tsx`, new `src/components/settings/PomodoroDurationInput.test.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/SettingsPage.test.tsx`, `src/pages/FocusPage.tsx`, `src/pages/FocusPage.test.tsx`, `backend/test/settings.test.ts`.

**Behavior:**
- `POMODORO_LIMITS = { pomodoroWorkMinutes: { min: 1, max: 120 }, pomodoroShortBreakMinutes: { min: 1, max: 60 }, pomodoroLongBreakMinutes: { min: 1, max: 120 } }`, with a comment that these mirror `settingsSchema` on the server.
- `PomodoroDurationInput` props: `label`, `min`, `max`, `value` (committed number), `onCommit(value: number)`. It keeps a local draft string. It does not call `onCommit` on change.
- On blur or Enter: if the draft is empty or not a number, restore the draft to `value` and do not commit. Otherwise clamp to `[min, max]`, set the draft to the clamped value, and call `onCommit` only if the clamped value differs from `value`.
- Keep the existing labels: `Работа (минут)`, `Короткий перерыв (минут)`, `Длинный перерыв (минут)`. Set `type="number"`, `min`, `max` attributes.
- `SettingsPage` uses the component for the three fields. `FocusPage` uses it for the active mode's duration, with limits taken from `POMODORO_LIMITS`. The FocusPage long-break max becomes 120.
- Draft syncs from `value` when the committed value changes from outside (for example after a rollback), so the field never shows a stale number.

**Steps (TDD):**
1. Write failing tests: component (typing does not commit; blur with `200` commits `120` for max 120; blur with empty draft restores and does not commit; Enter commits; blur with the same value does not commit). SettingsPage: several keystrokes followed by blur produce exactly one `updateSettings` call. FocusPage: long-break field has `max="120"`. `backend/test/settings.test.ts`: `settingsSchema` accepts min and max and rejects max+1 and 0 for each field. Confirm red for the right reasons (the FocusPage max test and the per-keystroke test must fail on current code).
2. Implement. Confirm green.
3. Run `npx vitest run src/components/settings src/pages/SettingsPage.test.tsx src/pages/FocusPage.test.tsx`, `npm test` (root), `npx tsc -b`, `cd backend && npx vitest run test/settings.test.ts`.
4. Commit as `fix: validate pomodoro durations locally and save once on blur`.

**Out of scope:** the timer drift and long-break logic (item 11).

---

## Task 3: Lesson dates (Problem.md item 13)

**Context:** `src/components/schedule/LessonForm.tsx` line ~89 sets `min={toISODate(new Date())}` on the one-off lesson date, which blocks saving past lessons (RANEPA imports contain past dates). Line ~67 computes `new Date(values.date).getDay()`; `new Date('YYYY-MM-DD')` parses as UTC midnight, so in time zones west of UTC the weekday is one day early.

**Files:** `src/lib/date.ts` (add `parseLocalDate`), `src/lib/date.test.ts`, `src/components/schedule/LessonForm.tsx`, `src/components/schedule/LessonForm.test.tsx`.

**Behavior:**
- `parseLocalDate(iso: string): Date` returns `new Date(y, m - 1, d)` from a `YYYY-MM-DD` string.
- `LessonForm` uses `parseLocalDate(values.date).getDay()` for the weekday of one-off lessons.
- Remove the `min` attribute from the date input entirely (past dates are allowed for new and edited lessons). Remove the now-unused import if it becomes unused.

**Steps (TDD):**
1. Failing tests: `date.test.ts` sets `process.env.TZ = 'America/Los_Angeles'` in a `beforeAll` (restore it in `afterAll`) and asserts `parseLocalDate('2026-10-12').getDay() === 1` (Monday). Before the fix the test must fail (the UTC parse gives Sunday under that zone), which is the red evidence. `LessonForm.test.tsx`: the date input has no `min` attribute; a one-off lesson with a past date can be saved.
2. Implement, confirm green.
3. Run `npx vitest run src/lib/date.test.ts src/components/schedule/LessonForm.test.tsx`, `npm test` (root), `npx tsc -b`.
4. Commit as `fix: parse one-off lesson dates locally and allow past dates`.

**Observation only (do not change):** `formatDate`, `daysUntil`, `isToday` in `src/lib/date.ts` may parse dates the same UTC way. Report whether they do, with file:line, but leave them alone.

---

## Task 4: RANEPA import hardening, rate limits (Problem.md item 14)

**Context:** `backend/src/lib/ranepaFetch.ts` calls `fetch(url, { redirect: 'follow' })` and checks the host only after all redirects (`res.url`). The response body is read with `res.text()` without a size limit. `/api/ranepa/*` has no rate limit. `authLimiter` in `backend/src/routes/auth.ts` is skipped unless `NODE_ENV === 'production'`, so it does not run in development.

**Files:** `backend/src/lib/ranepaFetch.ts`, `backend/test/ranepaFetch.test.ts` (existing, read it first and follow its style), new `backend/src/lib/rateLimit.ts`, `backend/src/routes/ranepa.ts`, `backend/src/routes/auth.ts`, new `backend/test/rateLimit.test.ts`.

**Behavior:**
- `fetchSchedulePage(url)`: `redirect: 'manual'`. Follow at most 3 redirects. On each 3xx, resolve `Location` against the current URL, require `https:` and `hostname === 'spb.ranepa.ru'`, otherwise throw `Ссылка ведёт за пределы spb.ranepa.ru`. More than 3 redirects throws `Слишком много перенаправлений`. A 3xx without `Location` throws the existing `РАНХиГС ответил статусом ${status}, попробуйте позже`. Remove the final `res.url` check.
- Body cap: `MAX_SCHEDULE_BYTES = 2 * 1024 * 1024`. If `Content-Length` is larger, throw `Страница расписания слишком большая`. Otherwise read the stream with a byte counter, cancel and throw the same message when the cap is exceeded, decode as UTF-8.
- One `AbortSignal.timeout(10_000)` covers the whole fetch chain.
- `createLimiter({ windowMs, limit, skip?, keyGenerator? })` in `backend/src/lib/rateLimit.ts` wraps `express-rate-limit` (already a dependency). `skip` defaults to `() => process.env.NODE_ENV === 'test'`.
- `ranepaRouter` applies `createLimiter({ windowMs: 60_000, limit: 10, keyGenerator: (req) => req.userId })` to all its routes (the router is mounted after `requireAuth`, so `req.userId` is set).
- `authLimiter` uses the same test-only skip, so it runs in development and production.

**Steps (TDD):**
1. Failing tests in `backend/test/ranepaFetch.test.ts` (mock global `fetch`): redirect to `https://evil.example/x` is rejected with the foreign-host message; a redirect within `spb.ranepa.ru` is followed and the body returned; a redirect loop of 4 hops is rejected with the too-many-redirects message; a body over the cap is rejected; a `Content-Length` over the cap is rejected. The foreign-redirect test must fail on current code (red evidence).
2. `backend/test/rateLimit.test.ts`: a small express app with `createLimiter({ limit: 2, windowMs: 60_000, skip: () => false, keyGenerator: () => 'k' })` returns 429 on the third request.
3. Implement, confirm green.
4. Run `cd backend && npx vitest run test/ranepaFetch.test.ts test/rateLimit.test.ts test/auth.test.ts test/ranepa.test.ts`, then `cd backend && npx tsc --noEmit`, then `cd backend && npm test`.
5. Commit as `fix: validate every RANEPA redirect, cap response size, rate limit imports`.

**Note for the report:** `ranepa.test.ts` may hit the new limit if it makes many requests. If so, report it and adjust only the test's request count, not the limit.

---

## Task 5: CI workflow (Problem.md item 17, part 1)

**Context:** The repository has no `.github` directory and no CI. The remote is `github.com/Raviil-IV/study-dashboard`.

**Files:** new `.github/workflows/ci.yml`.

**Jobs:**
- `frontend`: `ubuntu-latest`, Node 22, `actions/setup-node` with `cache: npm` and `cache-dependency-path: package-lock.json`; `npm ci`; `npx tsc -b`; `npm test`.
- `backend`: `ubuntu-latest`, Node 22, service container `postgres:17-alpine` with `POSTGRES_PASSWORD: ci-only`, health check, port 5432; env `TEST_DATABASE_URL: postgres://postgres:ci-only@localhost:5432/study_dashboard_test`; cache paths use `backend/package-lock.json`; `npm ci` in `backend`; `npx tsc --noEmit`; `npm test`.
- `audit`: `npm audit --omit=dev --audit-level=high` in the root and in `backend` (use `working-directory`).
- Triggers: `push` to `main`, and `pull_request`.

**Steps:**
1. Write the workflow.
2. Validate YAML syntax: `ruby -ryaml -e 'YAML.load_file(".github/workflows/ci.yml"); puts "ok"'`. If ruby is unavailable, say so.
3. Run the same commands locally to prove they pass: `npx tsc -b`, `npm test`, `cd backend && npx tsc --noEmit`, `cd backend && npm test`, both audits with `--audit-level=high`. Report exact exit codes. If an audit fails, report which package; do not weaken the threshold.
4. Commit as `ci: run type checks, tests and audit on push and pull requests`.

**Note:** GitHub Actions cannot run locally here. State this explicitly in the report, and say that the workflow runs for real only after a push.

---

## Task 6: End-to-end smoke test (Problem.md item 17, part 2)

**Context:** Frontend tests mock the API, so the real client-server contract is not tested. Items 1, 2, and 8 were exactly the kind of bugs that mocks hide. The e2e test runs in a real browser against the docker-compose stack.

**Files:** root `package.json` (devDependency `@playwright/test`, script `"e2e": "playwright test"`), `package-lock.json`, new `playwright.config.ts`, new `e2e/smoke.spec.ts`, `.gitignore` (add `playwright-report/` and `test-results/`), `.github/workflows/ci.yml` (add an `e2e` job).

**Config:** `baseURL` from `E2E_BASE_URL`, default `http://localhost:8080`. Single worker, no retries. No `webServer` block: the stack is started externally by docker compose.

**Scenarios** (one spec, sequential, unique login per run like `e2e_<timestamp>`, password `password123`):
1. Register and land on the dashboard.
2. Create a task with no due date ("Без срока"); it appears in the list (item 1 regression).
3. In that browser context, before the app loads, remove `crypto.randomUUID` with `page.addInitScript` (simulates plain HTTP). Create a task, then edit its title, reload, and check the edited title (item 2 regression).
4. Log out; login page is shown; log in again; the tasks from steps 2 and 3 are still there.
5. Expired session: after login, clear cookies with `context.clearCookies()`, then create a task. The app must return to `/login` and show the toast `Сессия истекла, войдите снова` (item 4 regression).

**CI job:** `e2e` needs `frontend` and `backend` to pass. Steps: `docker compose up -d --build --wait` with env `POSTGRES_PASSWORD=ci-only`, `JWT_SECRET=ci-only-not-for-prod`, `FRONTEND_PORT=8080`; `npx playwright install --with-deps chromium`; `npm run e2e`; always `docker compose down -v`.

**Local run rules (these are rulings, see the ledger):**
- Start the stack with a separate project name so the running `study-dashboard` containers are not touched: `docker compose -p sd-e2e up -d --build --wait`, with env `POSTGRES_PASSWORD=local-e2e-only`, `JWT_SECRET=local-e2e-only-secret`, `FRONTEND_PORT=8099`. Pass the values inline on the command line; do not write them to `.env`.
- Run `E2E_BASE_URL=http://localhost:8099 npm run e2e`.
- Stop with `docker compose -p sd-e2e down -v`. Never run `docker system prune`, `docker volume prune`, or any command that touches the `study-dashboard` project.
- Compose sets fixed image names, so building retags the `study-dashboard-*` images. Report this as a side effect.

**Steps:**
1. Install the dependency and browsers; write the config and spec.
2. Write the spec first; it will fail until the stack is up, which is expected. Record the failure.
3. Start the stack as described; run `npm run e2e`; all five scenarios must pass. If the browser cannot be installed in this environment, stop and report BLOCKED with the exact error; do not drop scenarios.
4. Validate the workflow YAML as in Task 5.
5. Stop the stack with `down -v` for `sd-e2e` only.
6. Commit as `test: add playwright smoke test for the docker-compose stack`.

**Report:** the exact result of `npm run e2e`, the list of scenarios, and the side effects (image retagging, the `sd-e2e` volume removed at the end).
