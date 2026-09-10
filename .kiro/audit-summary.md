# Audit Summary — HumanizeAI Project

**Audit Date:** September 2026  
**Auditor:** Kiro AI (automated full-project read)

---

## 1. Verified Project Overview

HumanizeAI is a full-stack web application that rewrites AI-generated text to sound more natural and human. Users paste text produced by AI tools (e.g., ChatGPT, Gemini), choose a rewriting mode and tone, and receive a rewritten version along with an AI/Human score. All runs are saved to a personal history, and per-user analytics are tracked.

The application is a **single-binary local deployment**: the .NET 10 backend serves the frontend HTML/JS/CSS directly from `wwwroot` and exposes REST API endpoints under `/api/`. There is no separate frontend server.

---

## 2. Verified Technology Stack

| Layer | Technology | Version / Detail |
|---|---|---|
| Backend runtime | ASP.NET Core Web API | .NET 10 |
| Backend language | C# | .NET 10 (Nullable + ImplicitUsings enabled) |
| Frontend | Vanilla HTML5 / CSS3 / JavaScript (ES2020) | No build step, no framework |
| Database | MySQL | Schema: `humanizeai_db` |
| MySQL driver | MySqlConnector | 2.3.7 (NuGet) |
| AI provider | OpenRouter API | Model: `openai/gpt-4o-mini` |
| Static file serving | ASP.NET Core static files + `UseDefaultFiles` | Served from `wwwroot/` |
| Package manager | NuGet (backend) | No npm/yarn — no node_modules |
| OS target | Windows (primary) | `START.bat` + PowerShell setup script |

---

## 3. Verified Features

### Authentication
- User registration: full name, email (unique), password (plaintext — not hashed, see Issues)
- User login: email + password, returns a simple `session-{id}` token stored in `localStorage`
- Session tracking: IP address recorded per login in `usersessions` table
- Session management: "Revoke other sessions" endpoint (keeps the newest active session)
- Logout: clears `localStorage`, redirects to login

### Text Humanization — Basic Mode
- Offline, no API call needed
- Phase 1: Stock AI-phrase replacements (hardcoded dictionary in `BasicHumanizer.Process()`)
- Phase 2: Word-by-word synonym swap from `humanizationdictionary` MySQL table
- Phase 3: Formal-to-contraction conversion (`do not` → `don't`, `it is` → `it's`, etc.)
- Final polish pass: removes additional AI phrases, strips em/en dashes, fixes spacing

### Text Humanization — Advanced Mode
- Sends text to OpenRouter (`gpt-4o-mini`) with a detailed system prompt
- Prompt enforces: burstiness, perplexity, contractions, no AI-tell phrases, tone-specific style, length control
- Graceful fallback to offline `AdvancedHumanizer` (extends BasicHumanizer) if API call fails
- Timeout: 30 seconds

### AI Detector
- Scores input text without rewriting
- Returns: `aiScore` (0–100), `humanScore` (0–100), `verdict` string
- Scoring logic: counts AI phrases, AI words, checks contraction density, sentence length variance, formal punctuation
- Frontend highlights detected AI phrases in the output panel

### Scoring Engine (`ScoreCalculator`)
- Heuristic, not ML-based
- AI score = sum of weighted signals (phrases +14 each, words +6 each, low contraction ratio +14, etc.)
- Human score = `100 − aiScore`

### Tone Selection
- 4 tones: Casual (1), Formal (2), Academic (3), Professional (4)
- Stored in `toneprofiles` table
- Applied in Advanced mode AI prompt; recorded in history for all modes

### Length Control (Advanced Mode only)
- Options: `same`, `shorter`, `longer`
- Passed as instruction to the AI prompt

### History
- Last 50 runs per user, newest first
- Each entry shows: original text, humanized text, AI/Human scores, tone name, timestamp
- Searchable client-side (filters by text content)
- Per-entry: Copy humanized text, Delete entry (also deletes associated feedback)
- Draft auto-saved to `localStorage` per user

### Analytics
- Total runs, total words humanized, average AI-score reduction
- 7-day daily usage bar chart (Canvas API)
- Mode breakdown (Basic vs Advanced %) as progress bars
- Detailed table of last 10 runs

### Feedback
- Users can leave a 1–5 star rating + optional comment on any history entry
- Stored in `userfeedback` table
- Retrievable per user via `/api/feedback/{userId}`

### Settings
- Display name update (stored in `localStorage` only — not persisted to DB)
- Default mode preference (stored in `localStorage`)
- Logout button

### Frontend UX
- Splash screen with animated curtain open on first load
- `index.html` auto-redirects to `splash.html`
- Landing page with feature overview and sign-up CTA
- Responsive navigation with hamburger toggle below 860 px
- User avatar dropdown menu (initials-based, keyboard accessible)
- Inline field validation with per-field error messages
- Toast notifications for copy/delete/save actions
- Loading skeleton animations during API calls
- Draft text persisted to `localStorage` between sessions
- Keyboard shortcut: `Ctrl+Enter` / `Cmd+Enter` to trigger humanize
- "Try an example" button pre-fills a sample AI paragraph
- Download humanized output as `.txt` file
- ARIA roles and live regions throughout (`aria-live`, `role="status"`, etc.)

### Database
- 7 tables: `users`, `toneprofiles`, `usersessions`, `transformationhistory`, `useranalytics`, `userfeedback`, `humanizationdictionary`
- 1 view: `vw_user_history`
- 1 stored procedure: `sp_get_user_stats`
- 1 audit trigger: `trg_history_after_insert` → writes to `historyaudit`
- All foreign keys with `ON DELETE CASCADE`

### Startup Automation
- `START.bat` → `setup_and_run.ps1`
- Script: checks/installs .NET SDK, detects/starts MySQL, runs `schema.sql`, copies `Fronteend/` to `wwwroot/`, runs `dotnet run`
- `Create-Desktop-Shortcut.bat` creates a Windows desktop shortcut

---

## 4. Verified User Flow

```
index.html
  └─> splash.html (animated intro, auto-redirect after ~3s)
        └─> landing.html (marketing page)
              ├─> signup.html → POST /api/auth/register → login.html
              └─> login.html → POST /api/auth/login → dashboard.html
                                                          ├─> POST /api/humanize/basic or /advanced
                                                          ├─> POST /api/humanize/detect
                                                          ├─> history.html → GET /api/humanize/history/{uid}
                                                          ├─> analytics.html (uses same history endpoint)
                                                          └─> settings.html (local settings + logout)
```

---

## 5. Important Folders / Files and Their Purpose

| Path | Purpose |
|---|---|
| `Fronteend/` | Source frontend files (canonical copy) |
| `Fronteend/app.js` | All frontend JS: auth, dashboard, history, analytics, settings logic |
| `Fronteend/styles.css` | All global CSS |
| `Fronteend/index.html` | Entry point — redirects to splash |
| `Fronteend/splash.html` | Animated splash screen with inline CSS/JS |
| `Fronteend/landing.html` | Public marketing/landing page |
| `Backeend/HumanizeAI_Project/` | .NET 10 Web API project root |
| `Backeend/.../Program.cs` | App bootstrap: CORS, static files, routing, port 5000 |
| `Backeend/.../Controllers/HumanizeController.cs` | `/api/humanize/*` endpoints + OpenRouter call |
| `Backeend/.../Controllers/AuthController.cs` | `/api/auth/*` endpoints |
| `Backeend/.../Controllers/FeedbackController.cs` | `/api/feedback` endpoints |
| `Backeend/.../Services/DatabaseService.cs` | All MySQL queries (hardcoded connection string) |
| `Backeend/.../Services/HumanizerEngine.cs` | `BasicHumanizer`, `AdvancedHumanizer`, `ScoreCalculator`, `SynonymEngine` |
| `Backeend/.../Models/Models.cs` | Request/response DTOs |
| `Backeend/.../schema.sql` | Full DB schema + seed data + trigger + stored procedure |
| `Backeend/.../wwwroot/` | Runtime copy of frontend (auto-synced by setup script) |
| `Backeend/.../HumanizeAI_API.csproj` | Project file: TargetFramework net10.0, MySqlConnector 2.3.7 |
| `START.bat` | Windows one-click launcher |
| `setup_and_run.ps1` | Full automated setup + launch script |
| `Create-Desktop-Shortcut.bat` | Creates Windows desktop shortcut |

---

## 6. Unclear or Missing Areas

| Area | Status |
|---|---|
| Password hashing | **Not implemented** — passwords stored and compared in plaintext |
| Token/session validation on API requests | **Not implemented** — no middleware checks the session token on protected endpoints |
| Input character limit enforcement on backend | **Not implemented** — only enforced client-side (`maxlength="5000"`) |
| `humanizationdictionary` seed data | Schema creates the table but includes no `INSERT` rows — Basic mode starts with an empty dictionary |
| "Forgot password" flow | UI link exists on login page but has no backend or redirect |
| Email verification | Not implemented |
| Profile email update | Settings form shows email field but does not call any API to update it |
| HTTPS in production | `launchSettings.json` has an `https` profile, but `Program.cs` hardcodes `http://localhost:5000` |
| Rate limiting | Not implemented |
| `feedback` display in UI | API exists, but no UI page reads or displays feedback data |
| Mode filter on history page | HTML `select` element exists but `app.js` does not wire it up |

---

## 7. Real Issues Found

### 🔴 Critical — Security

| # | Issue | Location |
|---|---|---|
| S-1 | **Hardcoded OpenRouter API key** in source code | `HumanizeController.cs` ~line 78 |
| S-2 | **Hardcoded MySQL credentials** (`Uid=root;Pwd=root1234`) in source code | `DatabaseService.cs` line 14 |
| S-3 | **Passwords stored in plaintext** — no hashing (BCrypt/Argon2/etc.) | `DatabaseService.cs` `RegisterUser()` / `GetUserByCredentials()` |
| S-4 | **No JWT or session token validation** on API endpoints — any caller can pass any `userId` | All controllers |
| S-5 | **CORS set to `AllowAnyOrigin`** in production-bound code | `Program.cs` |

### 🟡 Medium — Functionality Gaps

| # | Issue | Location |
|---|---|---|
| F-1 | History mode filter dropdown is rendered but not wired to any JS filter logic | `history.html` / `app.js` |
| F-2 | `humanizationdictionary` table has no seed rows — Basic mode synonym swaps do nothing without them | `schema.sql` |
| F-3 | Profile email field in Settings has no API backing — changes are lost on refresh | `settings.html` / `app.js` |
| F-4 | "Forgot password" link is a dead `href="#"` | `login.html` |

### 🟢 Low — GitHub Hygiene

| # | Issue | Location |
|---|---|---|
| G-1 | No `.gitignore` — `bin/`, `obj/`, `.vs/` would be committed | Root |
| G-2 | No `README.md` | Root |
| G-3 | Folder names have typos: `Fronteend`, `Backeend` | Root |
| G-4 | `.vs/` IDE folders present in both `Backeend/` and `Backeend/HumanizeAI_Project/` | Root |

---

*End of audit. Do not edit this file — it is generated from the actual repository state.*
