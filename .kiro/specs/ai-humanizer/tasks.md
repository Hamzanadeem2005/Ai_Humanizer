# Tasks — HumanizeAI

> Checkboxes reflect the **actual state of the repository** as of the audit.
> Only features confirmed present in source code are marked complete.

---

## ✅ Completed Features

### Backend — Core
- [x] ASP.NET Core .NET 10 Web API project configured and building
- [x] CORS policy (`AllowAll`) configured for local development
- [x] Static file serving (`UseDefaultFiles` + `UseStaticFiles`) from `wwwroot/`
- [x] API listening on `http://localhost:5000`
- [x] MySQL database schema (`schema.sql`) with all tables, view, trigger, stored procedure
- [x] `DatabaseService` — parameterized queries for all DB operations
- [x] `SynonymEngine` — word lookup from `humanizationdictionary` table
- [x] `BasicHumanizer` — phrase replacement + synonym swap + contractions + polish
- [x] `AdvancedHumanizer` — extends BasicHumanizer with conversational tweaks (offline fallback)
- [x] `ScoreCalculator` — heuristic AI/Human scorer (0–100)
- [x] `POST /api/humanize/basic` — offline rewrite
- [x] `POST /api/humanize/advanced` — OpenRouter AI rewrite with offline fallback
- [x] `POST /api/humanize/detect` — score without rewriting
- [x] `GET /api/humanize/history/{userId}` — last 50 runs
- [x] `DELETE /api/humanize/history/{historyId}` — delete run + feedback
- [x] `GET /api/humanize/stats/{userId}` — aggregate stats
- [x] `GET /api/humanize/test` — health check endpoint
- [x] `POST /api/auth/login` — session creation + IP recording
- [x] `POST /api/auth/register` — new user with duplicate email check
- [x] `GET /api/auth/sessions/{userId}` — list sessions
- [x] `DELETE /api/auth/sessions/{userId}/revoke-others` — revoke old sessions
- [x] `POST /api/feedback` — save star rating + comment
- [x] `GET /api/feedback/{userId}` — retrieve user's feedback
- [x] OpenRouter integration (`gpt-4o-mini`) with 30 s timeout and graceful fallback
- [x] Tone IDs mapped to prompt instructions (Casual/Formal/Academic/Professional)
- [x] Length control (`same`/`shorter`/`longer`) passed to AI prompt
- [x] `UpdateAnalytics` — upsert per-user analytics after every run
- [x] History audit trigger (`trg_history_after_insert` → `historyaudit`)

### Frontend — Pages
- [x] `index.html` — entry point redirect
- [x] `splash.html` — animated curtain-open intro screen
- [x] `landing.html` — public marketing page with features + how-it-works
- [x] `login.html` — email + password form
- [x] `signup.html` — name + email + password + confirm form
- [x] `dashboard.html` — input/output panels + mode/tone/length controls + today's stats
- [x] `history.html` — history list with search input
- [x] `analytics.html` — summary stats + canvas chart + mode bars + detail table
- [x] `settings.html` — profile form + preferences form + logout

### Frontend — JavaScript (`app.js`)
- [x] `initLogin()` — email validation, API call, localStorage save, redirect
- [x] `initSignup()` — all field validation, API call, name mapping, redirect
- [x] `initDashboard()` — mode toggle, tone/length selects, humanize/detect, copy, save, clear
- [x] `initHistory()` — load from API, client-side search, copy, delete
- [x] `initAnalytics()` — stats, canvas chart, mode bars, detail table
- [x] `initSettings()` — profile name save (localStorage), mode preference, logout
- [x] `requireAuth()` — route protection for all authenticated pages
- [x] `initNav()` + hamburger toggle — responsive navigation below 860 px
- [x] User avatar dropdown menu (initials, keyboard accessible, click-outside close)
- [x] `showAlert()` / `fieldError()` / `toast()` — inline and floating notifications
- [x] Loading skeleton + spinner during API calls
- [x] Draft persistence (`hai_draft_{userId}` in localStorage)
- [x] `Ctrl+Enter` / `Cmd+Enter` keyboard shortcut
- [x] "Try an example" button with sample AI text
- [x] `showDetect()` — score meter + verdict + AI pattern highlighting with `<mark>`
- [x] `drawUsageChart()` — Canvas 7-day bar chart with gradient bars
- [x] Download humanized text as `humanized.txt`
- [x] `cleanText()` utility — strips dashes/commas/extra spaces from output

### Deployment / Setup
- [x] `START.bat` — one-click Windows launcher
- [x] `setup_and_run.ps1` — auto-install .NET, MySQL check/start, schema init, wwwroot sync, run
- [x] `Create-Desktop-Shortcut.bat` — creates Windows desktop shortcut
- [x] Frontend auto-synced from `Fronteend/` to `wwwroot/` by setup script

---

## ❌ Remaining Tasks / Known Bugs

### 🔴 Security — Must Fix Before Public Push

- [ ] **S-1**: Move OpenRouter API key out of `HumanizeController.cs` into `appsettings.json` or environment variable — **key is currently committed in plaintext**
- [ ] **S-2**: Move MySQL connection string out of `DatabaseService.cs` into `appsettings.json` — **credentials are currently committed in plaintext**
- [ ] **S-3**: Hash passwords before storing (use BCrypt NuGet package) — currently stored and compared in plaintext

### 🟡 Functionality Bugs

- [ ] **F-1**: History page mode filter dropdown (`#mode-filter`) renders but has no JS wiring — filter does nothing
- [ ] **F-2**: `humanizationdictionary` table ships empty — Basic mode synonym swap phase does nothing until rows are inserted
- [ ] **F-3**: Settings page email field shows current email but has no API endpoint to update it — changes are lost on refresh
- [ ] **F-4**: "Forgot password" link on `login.html` points to `href="#"` — no flow implemented

### 🟢 Documentation Tasks
- [x] `audit-summary.md` created
- [x] `requirements.md` created
- [x] `design.md` created
- [x] `tasks.md` created (this file)
- [ ] `api-contract.md` — to be created
- [ ] `testing.md` — to be created
- [ ] Root `README.md` — to be created
- [ ] `.gitignore` — to be created
- [ ] `.env.example` — to be created
- [ ] `github-readiness.md` — to be created

### 🟢 GitHub Readiness Tasks
- [ ] Create `.gitignore` covering `bin/`, `obj/`, `.vs/`, `*.user`, OS files
- [ ] Create `.env.example` with placeholder values for API key and DB credentials
- [ ] Verify no secrets are present in committed files before first push
- [ ] Consider adding `humanizationdictionary` seed data so Basic mode is functional out of the box

### Testing Tasks
- [ ] No automated tests exist in the repository — add unit tests for `ScoreCalculator` and `BasicHumanizer` (xUnit recommended for .NET)
- [ ] No frontend tests exist — add integration smoke tests if desired
- [ ] Manual testing checklist documented in `testing.md`
