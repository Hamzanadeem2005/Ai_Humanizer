# AI Humanizer

A full-stack web application that rewrites AI-generated text to sound more natural, conversational,
and varied. Paste text produced by any AI tool, pick a mode and tone, and get a rewritten version
alongside an AI/Human readability score.

> **Accurate description:** HumanizeAI is a text rewriting and style-adaptation tool. It applies
> rule-based phrase substitution and optional AI-powered rewriting to reduce formal, uniform
> AI-tell patterns. It does not guarantee undetectability by any external service.

---

## Key Features

- **Basic Mode** — fully offline rewrite using phrase dictionaries, synonym swaps, and contraction conversion
- **Advanced Mode** — AI-powered deep rewrite via OpenRouter (`gpt-4o-mini`) with graceful offline fallback
- **AI Detector** — score any text 0–100 for AI vs human readability with pattern highlighting
- **4 Tone Profiles** — Casual, Formal, Academic, Professional
- **Length Control** — Same, Shorter, or Longer output (Advanced mode)
- **History** — every run saved per user; searchable, copyable, deletable
- **Analytics** — 7-day usage chart, mode breakdown, per-run stats table
- **User Accounts** — register, login, session tracking, multi-session revocation
- **Feedback** — 1–5 star ratings with comments on any history entry
- **One-click launcher** — Windows `START.bat` auto-installs dependencies and starts the server

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | ASP.NET Core Web API (.NET 10) |
| Language | C# |
| Frontend | Vanilla HTML5 / CSS3 / JavaScript (no framework, no build step) |
| Database | MySQL (`humanizeai_db`) |
| MySQL driver | MySqlConnector 2.3.7 |
| AI provider | OpenRouter API — `openai/gpt-4o-mini` |
| Static hosting | ASP.NET Core `UseStaticFiles` (frontend served from `wwwroot/`) |

---

## Project Structure

```
Final Ai Humanizer/
├── Fronteend/                        # Source frontend files
│   ├── app.js                        # All frontend JS (auth, dashboard, history, analytics)
│   ├── styles.css                    # Global styles
│   ├── index.html                    # Entry point → redirects to splash.html
│   ├── splash.html                   # Animated intro screen
│   ├── landing.html                  # Public marketing page
│   ├── login.html / signup.html      # Authentication pages
│   ├── dashboard.html                # Main humanizer interface
│   ├── history.html                  # Past runs list
│   ├── analytics.html                # Usage stats and chart
│   └── settings.html                 # Profile and preferences
│
├── Backeend/
│   └── HumanizeAI_Project/           # .NET 10 Web API project
│       ├── Program.cs                # App bootstrap (CORS, static files, port 5000)
│       ├── appsettings.json          # Logging config
│       ├── schema.sql                # Full MySQL schema + seed data
│       ├── Controllers/
│       │   ├── HumanizeController.cs # /api/humanize/* (basic, advanced, detect, history)
│       │   ├── AuthController.cs     # /api/auth/* (login, register, sessions)
│       │   └── FeedbackController.cs # /api/feedback
│       ├── Services/
│       │   ├── DatabaseService.cs    # All MySQL queries
│       │   └── HumanizerEngine.cs    # BasicHumanizer, AdvancedHumanizer, ScoreCalculator
│       ├── Models/
│       │   └── Models.cs             # Request/response DTOs
│       └── wwwroot/                  # Runtime copy of Fronteend/ (auto-synced on startup)
│
├── START.bat                         # One-click Windows launcher
├── setup_and_run.ps1                 # Automated setup and run script
├── Create-Desktop-Shortcut.bat       # Creates a Windows desktop shortcut
├── .env.example                      # Environment variable template
└── README.md                         # This file
```

---

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) — or let `START.bat` install it automatically
- [MySQL Server 8.x](https://dev.mysql.com/downloads/mysql/) — running locally with a known root password
- Windows OS (for the one-click launcher) — or any OS for manual setup

---

## Environment Variable Setup

Copy `.env.example` and fill in your values.

The application currently reads its secrets from `appsettings.json`. Before running, update:

**`Backeend/HumanizeAI_Project/appsettings.json`**
```json
{
  "ConnectionStrings": {
    "Default": "Server=localhost;Database=humanizeai_db;Uid=YOUR_DB_USER;Pwd=YOUR_DB_PASSWORD;"
  },
  "OpenRouter": {
    "ApiKey": "YOUR_OPENROUTER_API_KEY"
  }
}
```

> Get a free OpenRouter API key at [openrouter.ai](https://openrouter.ai).

> ⚠️ **Never commit your real API key or database password to version control.**
> Add `appsettings.json` overrides via environment variables or use a secrets manager in production.

---

## Local Setup and Run

### Option 1 — One-Click (Windows)

```bat
START.bat
```

This script will:
1. Check and install .NET 10 SDK if missing
2. Start the MySQL service if it is stopped
3. Run `schema.sql` to create the database and tables
4. Copy frontend files to `wwwroot/`
5. Start the server at `http://localhost:5000`
6. Open your browser automatically

### Option 2 — Manual

```powershell
# 1. Create the database (run once)
mysql -u root -p < "Backeend\HumanizeAI_Project\schema.sql"

# 2. Build and run the backend
cd "Backeend\HumanizeAI_Project"
dotnet run --urls "http://localhost:5000"

# 3. Open in browser
# http://localhost:5000
```

---

## Build Command

```powershell
cd "Backeend\HumanizeAI_Project"
dotnet build
```

---

## Test Command

No automated tests exist in the repository at this time.

To verify the application is running correctly, hit the health-check endpoint:

```
GET http://localhost:5000/api/humanize/test
```

Expected: `{ "apiStatus": "HumanizeAI running on .NET 10", "dbStatus": "MySQL connected", ... }`

---

## Usage Flow

1. **Open** `http://localhost:5000` — animated splash screen loads
2. **Sign up** with your name, email, and password
3. **Log in** — you land on the Dashboard
4. **Paste** any AI-generated text (up to 5,000 characters)
5. **Choose a mode:**
   - **Basic** — fast offline rewrite
   - **Advanced** — AI-powered rewrite (requires OpenRouter key)
   - **AI Detector** — score the text without rewriting
6. **Pick a tone** (Casual / Formal / Academic / Professional) and length
7. Click **Humanize** (or press `Ctrl+Enter`)
8. **Copy** the result or **Save** it as a `.txt` file
9. Visit **History** to review, copy, or delete past runs
10. Visit **Analytics** to see your usage stats and 7-day chart

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, get session |
| POST | `/api/humanize/basic` | Offline text rewrite |
| POST | `/api/humanize/advanced` | AI-powered rewrite |
| POST | `/api/humanize/detect` | Score text (no rewrite) |
| GET | `/api/humanize/history/{userId}` | Get last 50 runs |
| DELETE | `/api/humanize/history/{historyId}` | Delete a run |
| GET | `/api/humanize/test` | Health check |
| POST | `/api/feedback` | Submit star rating |

Full contract in [`.kiro/specs/ai-humanizer/api-contract.md`](.kiro/specs/ai-humanizer/api-contract.md).

---

## Screenshots / Demo

> Screenshots are not included in this repository.
> Run the application locally to see the full UI.

**Key screens:**
- Splash animation → Landing page → Login / Sign up
- Dashboard: two-panel input/output with mode toggle, tone + length selects
- History: searchable list of past runs with copy and delete
- Analytics: Canvas bar chart, mode breakdown progress bars, detail table
- Settings: profile name, default mode, logout

---

## Known Issues

| # | Issue |
|---|---|
| S-1 | OpenRouter API key is hardcoded in `HumanizeController.cs` — must be moved to config before push |
| S-2 | MySQL credentials are hardcoded in `DatabaseService.cs` — must be moved to config before push |
| S-3 | Passwords are stored in plaintext — BCrypt hashing should be added |
| F-1 | History mode filter dropdown is rendered but not wired to JS |
| F-2 | `humanizationdictionary` table ships empty — Basic synonym swap is a no-op until populated |

---

## Privacy and Security Notes

- **User text in Advanced mode** is forwarded to the OpenRouter API (third-party). Do not submit sensitive or confidential content.
- **API key** must be kept out of version control. Use environment variables or `appsettings.json` overrides that are `.gitignore`d.
- **Passwords** are currently stored in plaintext in the MySQL database. This must be fixed before the application is used with real user data.
- This application is designed for **local use only**. It has no HTTPS, no rate limiting, and no server-side token validation. Do not expose it to the public internet without addressing those gaps.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes with clear, focused commits
4. Open a pull request with a description of what changed and why

Please do not commit API keys, passwords, or other secrets.

---

## Author

Muhammad Hamza Nadeem — UET Lahore, 2025
