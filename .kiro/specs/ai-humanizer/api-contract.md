# API Contract — HumanizeAI

Base URL (local): `http://localhost:5000`  
All request bodies are JSON (`Content-Type: application/json`).  
All responses are JSON.  
No authentication header is required by the server (session token is stored client-side only).

---

## Auth Endpoints

### POST /api/auth/register

**Purpose:** Create a new user account.

**Request body:**
```json
{
  "username": "alice@example.com",
  "email": "alice@example.com",
  "password": "mysecretpassword"
}
```

**Validation:**
- `username`, `email`, `password` — all required, non-whitespace
- Email must be unique across `users` table

**Success — 200 OK:**
```json
{
  "message": "Account created successfully!"
}
```

**Errors:**
| Status | Body |
|---|---|
| 400 | `{ "message": "Please fill in all fields." }` |
| 409 | `{ "message": "An account with this email already exists." }` |
| 500 | `{ "message": "Registration failed - try again." }` |

---

### POST /api/auth/login

**Purpose:** Authenticate a user and create a session.

**Request body:**
```json
{
  "username": "alice@example.com",
  "password": "mysecretpassword"
}
```

**Validation:** Both fields required and non-whitespace.

**Success — 200 OK:**
```json
{
  "userId": 42,
  "username": "alice@example.com",
  "sessionId": 7,
  "token": "session-7"
}
```

**Errors:**
| Status | Body |
|---|---|
| 400 | `{ "message": "Please fill in all fields." }` |
| 401 | `{ "message": "Incorrect username or password." }` |

---

### GET /api/auth/sessions/{userId}

**Purpose:** List all login sessions for a user.

**Path param:** `userId` — integer

**Success — 200 OK:**
```json
[
  {
    "sessionId": 7,
    "userId": 42,
    "loginTime": "2026-09-10 14:32:00",
    "logoutTime": null,
    "ipAddress": "127.0.0.1",
    "isActive": true
  }
]
```

---

### DELETE /api/auth/sessions/{userId}/revoke-others

**Purpose:** Mark all sessions except the newest active one as logged out.

**Path param:** `userId` — integer

**Success — 200 OK:**
```json
{ "message": "All other sessions revoked." }
```

---

## Humanize Endpoints

### POST /api/humanize/basic

**Purpose:** Rewrite text offline using synonym swaps, phrase replacement, and contractions.

**Request body:**
```json
{
  "originalText": "Furthermore, it is important to note that artificial intelligence is transforming numerous industries. It is evident that this will subsequently reshape the future of work.",
  "userId": 42,
  "toneId": 1,
  "length": "same"
}
```

**Fields:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `originalText` | string | Yes | Non-empty |
| `userId` | int | No | Defaults to 1 if omitted |
| `toneId` | int | No | 1=Casual 2=Formal 3=Academic 4=Professional. Defaults to 1 |
| `length` | string | No | `"same"` / `"shorter"` / `"longer"`. Ignored in Basic mode |

**Validation:** `originalText` must be non-null and non-whitespace.

**Success — 200 OK:**
```json
{
  "humanizedText": "Also, keep in mind that AI is changing lots of industries. This will then reshape how work gets done.",
  "aiScore": 12,
  "humanScore": 88,
  "mode": "basic",
  "message": "Humanized in Basic mode."
}
```

**Errors:**
| Status | Body |
|---|---|
| 400 | `{ "message": "Text cannot be empty." }` |

---

### POST /api/humanize/advanced

**Purpose:** Rewrite text using the OpenRouter AI (gpt-4o-mini). Falls back to offline engine on failure.

**Request body:** Same shape as `/basic`, but `toneId` and `length` are actively used in the AI prompt.

```json
{
  "originalText": "Furthermore, it is important to note that artificial intelligence is transforming numerous industries. It is evident that this will subsequently reshape the future of work.",
  "userId": 42,
  "toneId": 1,
  "length": "same"
}
```

**AI call behavior:**
- Sends a `system` message with rewriting instructions (tone, length, burstiness, no AI-tell words)
- Sends `originalText` as the `user` message
- Model: `openai/gpt-4o-mini`
- `max_tokens`: 1200 — `temperature`: 0.85
- Timeout: 30 seconds
- On any error: falls back to `AdvancedHumanizer` (offline)

**Success — 200 OK:**
```json
{
  "humanizedText": "AI is genuinely changing how industries work. And yeah, that's going to shake up jobs in ways we're still figuring out.",
  "aiScore": 8,
  "humanScore": 92,
  "mode": "advanced",
  "message": "Humanized in Advanced mode."
}
```

**Errors:**
| Status | Body |
|---|---|
| 400 | `{ "message": "Text cannot be empty." }` |

*Note: API/network failures are silently caught and handled via fallback. HTTP 200 is always returned when input is valid.*

---

### POST /api/humanize/detect

**Purpose:** Score the input text as AI or human without rewriting it.

**Request body:**
```json
{
  "originalText": "Furthermore, it is important to note that artificial intelligence is transforming numerous industries.",
  "userId": 42,
  "toneId": 1
}
```

**Success — 200 OK:**
```json
{
  "aiScore": 72,
  "humanScore": 28,
  "verdict": "Likely AI-generated"
}
```

Verdict values:
- `"Likely AI-generated"` — aiScore ≥ 60
- `"Possibly AI-assisted"` — aiScore 30–59
- `"Likely human"` — aiScore < 30

**Errors:**
| Status | Body |
|---|---|
| 400 | `{ "message": "Text cannot be empty." }` |

---

### GET /api/humanize/history/{userId}

**Purpose:** Retrieve the last 50 humanization runs for a user, newest first.

**Path param:** `userId` — integer

**Success — 200 OK:**
```json
[
  {
    "historyId": 101,
    "inputText": "Furthermore, it is important to note that AI is changing industries.",
    "outputText": "AI is genuinely changing how industries work.",
    "humanScore": 92,
    "aiScore": 8,
    "processedAt": "2026-09-10 14:35:22",
    "toneName": "Casual"
  }
]
```

Returns an empty array `[]` if the user has no history.

---

### DELETE /api/humanize/history/{historyId}

**Purpose:** Delete a single history entry and any associated feedback.

**Path param:** `historyId` — integer ≥ 1

**Success — 200 OK:**
```json
{ "message": "History entry deleted." }
```

**Errors:**
| Status | Body |
|---|---|
| 400 | `{ "message": "Invalid history id." }` |
| 404 | `{ "message": "History entry not found." }` |

---

### GET /api/humanize/stats/{userId}

**Purpose:** Return aggregate statistics for a user.

**Path param:** `userId` — integer

**Success — 200 OK:**
```json
{
  "runs": 43,
  "avgHumanScore": 84,
  "avgReduction": 61
}
```

Returns `{ runs:0, avgHumanScore:0, avgReduction:0 }` on DB error.

---

### GET /api/humanize/test

**Purpose:** Health check — verifies the API is running and MySQL is reachable.

**Success — 200 OK:**
```json
{
  "apiStatus": "HumanizeAI running on .NET 10",
  "advancedMode": "ChatGPT (gpt-4o-mini) via OpenRouter",
  "dbStatus": "MySQL connected",
  "synonymsLoaded": 150,
  "time": "10 Sep 2026 14:35:00"
}
```

`dbStatus` is `"MySQL FAILED"` if the connection cannot be opened.

---

## Feedback Endpoints

### POST /api/feedback

**Purpose:** Submit a star rating and optional comment for a history entry.

**Request body:**
```json
{
  "userId": 42,
  "historyId": 101,
  "rating": 4,
  "comment": "Much more natural sounding than the original."
}
```

**Validation:**
- `historyId` must be ≥ 1
- `rating` must be 1–5

**Success — 200 OK:**
```json
{ "message": "Feedback saved successfully!" }
```

**Errors:**
| Status | Body |
|---|---|
| 400 | `{ "message": "Invalid History ID." }` |
| 400 | `{ "message": "Rating must be between 1 and 5." }` |

---

### GET /api/feedback/{userId}

**Purpose:** Retrieve all feedback submitted by a user.

**Path param:** `userId` — integer

**Success — 200 OK:**
```json
[
  {
    "feedbackId": 5,
    "historyId": 101,
    "rating": 4,
    "comment": "Much more natural sounding than the original.",
    "submittedAt": "2026-09-10 14:40:00"
  }
]
```
