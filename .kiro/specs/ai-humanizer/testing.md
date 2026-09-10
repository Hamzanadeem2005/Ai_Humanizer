# Testing — HumanizeAI

---

## Setup Commands

### Prerequisites
- .NET 10 SDK installed (`dotnet --version` should show 10.x)
- MySQL Server running with a `root` user
- Database `humanizeai_db` created (run `schema.sql`)

### Run the Application

```powershell
# Option 1 — one-click (Windows)
.\START.bat

# Option 2 — manual
cd "Backeend\HumanizeAI_Project"
dotnet run --urls "http://localhost:5000"
```

### Verify the API is alive

```
GET http://localhost:5000/api/humanize/test
```

Expected response includes `"apiStatus": "HumanizeAI running on .NET 10"` and `"dbStatus": "MySQL connected"`.

---

## Build Command

```powershell
cd "Backeend\HumanizeAI_Project"
dotnet build
```

A clean build produces zero errors and zero warnings. The output binary lands in `bin\Debug\net10.0\`.

---

## Automated Tests

**None exist in this repository.**

No test project, no xUnit/NUnit/MSTest setup, no frontend test runner.

Recommended next step: add a test project alongside the main project:

```powershell
dotnet new xunit -n HumanizeAI_Tests
dotnet sln add HumanizeAI_Tests
```

Priority units to test:
- `ScoreCalculator.CalculateAIScore()` — deterministic, pure function, easy to unit test
- `ScoreCalculator.CalculateHumanScore()` — trivially 100 minus AI score
- `BasicHumanizer.Process()` — deterministic given a fixed synonym dictionary
- `HumanizeController.Polish()` — pure string transformation, no dependencies

---

## Manual Testing Checklist

### Environment Setup
- [ ] `dotnet run` starts with no build errors
- [ ] Browser opens `http://localhost:5000` and shows splash screen
- [ ] Splash screen animates and redirects to landing page
- [ ] `GET /api/humanize/test` returns `dbStatus: "MySQL connected"`

### Authentication
- [ ] Signup with valid name, email, password creates account and redirects to login
- [ ] Signup with duplicate email shows "An account with this email already exists"
- [ ] Signup with mismatched passwords shows per-field error
- [ ] Signup with password shorter than 6 chars shows error
- [ ] Login with correct credentials redirects to dashboard
- [ ] Login with wrong password shows "Incorrect username or password"
- [ ] Navigating directly to `dashboard.html` without logging in redirects to `login.html`
- [ ] Logout clears session and redirects to `login.html`

### Dashboard — Input
- [ ] Textarea accepts and displays typed/pasted text
- [ ] Character counter updates live as text is typed
- [ ] "Try an example" fills the textarea with sample AI text
- [ ] Clearing the field with the "Clear" button resets counter and output panel
- [ ] Draft is saved to localStorage and restored after page refresh
- [ ] `Ctrl+Enter` triggers humanize action

### Basic Mode
- [ ] Submitting valid text in Basic mode returns humanized output
- [ ] Output panel shows humanized text + score line (`AI score: X% · Human score: Y%`)
- [ ] Submitting empty input shows "Please paste some text first" — no API call
- [ ] AI score and Human score sum to 100

### Advanced Mode
- [ ] Submitting valid text in Advanced mode returns humanized output
- [ ] Loading skeleton is visible during the API call
- [ ] Humanize button is disabled during the call
- [ ] **API failure simulation**: disconnect from internet or use an invalid key — output should still appear (fallback mode), not an error

### Detect Mode
- [ ] Clicking "AI Detector" mode changes button label to "Check AI score"
- [ ] Submitting text shows AI score percentage, verdict, and progress meter
- [ ] AI-tell phrases in the input text are highlighted in amber `<mark>` elements
- [ ] Pattern count label is shown ("N AI patterns highlighted" or "No strong AI patterns found")
- [ ] Toast shows `"AI score: X% · Verdict"` after detection

### Output Actions
- [ ] "Copy" button copies humanized text to clipboard and shows "Copied!" + toast
- [ ] "Save" button downloads a `humanized.txt` file containing the humanized text
- [ ] Both buttons show "Nothing to download yet" / no-op when output panel is empty

### Tone and Length Controls
- [ ] Tone dropdown shows: Casual, Formal, Academic, Professional
- [ ] Length dropdown shows: Same, Shorter, Longer
- [ ] Selecting "Shorter" in Advanced mode produces noticeably shorter output (dependent on AI)
- [ ] Tone name is saved in history entries

### History Page
- [ ] History page loads the user's last 50 runs from the API
- [ ] Each entry shows: original snippet, humanized snippet, scores, tone, timestamp
- [ ] Typing in the search box filters entries in real time (client-side)
- [ ] "Copy" on a history entry copies the full output text
- [ ] "Delete" prompts confirmation, then removes the entry from DB and UI

### Analytics Page
- [ ] Summary cards show correct total runs, words, and avg reduction
- [ ] Canvas chart renders 7 bars (one per day, last 7 days)
- [ ] Mode breakdown bars show correct percentages
- [ ] Detail table shows up to 10 recent runs

### Settings Page
- [ ] Profile name can be updated and persists across page refreshes (localStorage)
- [ ] Default mode preference can be changed and is applied when returning to dashboard
- [ ] Logout button on settings page works

### Responsiveness
- [ ] At viewport width < 860 px: navigation collapses to hamburger button
- [ ] Hamburger menu opens/closes on click
- [ ] Navigation links close the menu when clicked
- [ ] Dashboard panels stack vertically on narrow screens
- [ ] Analytics table scrolls horizontally below 640 px

### Very Long Input
- [ ] Textarea enforces `maxlength="5000"` — cannot type beyond 5,000 characters
- [ ] Pasting text longer than 5,000 chars is truncated at 5,000 by the browser
- [ ] API handles a 5,000-character input without error

### Edge Cases
- [ ] Text with no AI-tell words scores low on the AI detector
- [ ] Text that is already casual scores < 30 ("Likely human")
- [ ] Text with many AI-tell phrases scores ≥ 60 ("Likely AI-generated")
- [ ] History page with no runs shows the empty state message
- [ ] Analytics page with no runs shows zero stats and an empty chart

---

## Verified Limitations and Known Issues

| # | Limitation | Detail |
|---|---|---|
| L-1 | Passwords stored in plaintext | No hashing in `RegisterUser()` / `GetUserByCredentials()` |
| L-2 | API key hardcoded | OpenRouter key embedded in `HumanizeController.cs` |
| L-3 | DB credentials hardcoded | Connection string embedded in `DatabaseService.cs` |
| L-4 | No server-side auth | Any `userId` value accepted — no token validation |
| L-5 | History mode filter not wired | `#mode-filter` select on history page does nothing |
| L-6 | Empty synonym dictionary | `humanizationdictionary` table ships with no rows; Basic mode word-swap phase is a no-op |
| L-7 | Profile email not updatable | Settings email field has no API backing |
| L-8 | No automated tests | Zero test coverage in repository |
| L-9 | Windows-only startup scripts | `START.bat` and `setup_and_run.ps1` are Windows-specific |
| L-10 | CORS allows all origins | Acceptable for local dev, must be locked down for any internet deployment |
