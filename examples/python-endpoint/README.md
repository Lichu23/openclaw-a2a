# Python FastAPI A2A Endpoint

A Python equivalent of `examples/basic-endpoint/server.js` using FastAPI.

## Prerequisites

- Python 3.11+

## Setup

**1. Create and activate a virtual environment**

```bash
# Linux / macOS / Git Bash
python -m venv .venv
source .venv/bin/activate
```

```powershell
# Windows PowerShell
python -m venv .venv
.venv\Scripts\activate
```

**2. Install dependencies**

```bash
pip install -r requirements.txt
```

## Run

**Generate a key and start the server:**

```bash
# Linux / macOS / Git Bash
export A2A_KEY=$(openssl rand -hex 32)
uvicorn server:app --port 3000
```

```powershell
# Windows PowerShell (no openssl required)
$env:A2A_KEY = "$(New-Guid)$(New-Guid)" -replace "-",""
uvicorn server:app --port 3000
```

Or inline:

```bash
A2A_KEY=your-key uvicorn server:app --port 3000
```

On startup you will see:

```
[A2A] my-agent listening on port 3000
[A2A] Endpoint: http://localhost:3000/a2a/message
[A2A] Agent card: http://localhost:3000/.well-known/agent.json
```

## Test

**Agent card (no auth):**

```bash
curl http://localhost:3000/.well-known/agent.json
```

**Ping:**

```bash
curl -X POST http://localhost:3000/a2a/message \
  -H "Content-Type: application/json" \
  -H "X-Agent-Key: $A2A_KEY" \
  -d '{"from":"test-agent","intent":"ping","message":"hello"}'
```

**Chat message:**

```bash
curl -X POST http://localhost:3000/a2a/message \
  -H "Content-Type: application/json" \
  -H "X-Agent-Key: $A2A_KEY" \
  -d '{"from":"test-agent","intent":"chat","message":"Hello from another agent"}'
```

**Check inbox:**

```bash
curl -H "X-Agent-Key: $A2A_KEY" http://localhost:3000/a2a/inbox
```

**Using the shared test script from the repo root:**

```bash
./scripts/test-connection.sh http://localhost:3000/a2a/message $A2A_KEY
./scripts/test-connection.sh http://localhost:3000/a2a/message $A2A_KEY chat
```

## Auto-generated docs

FastAPI serves interactive API docs at:

- Swagger UI: `http://localhost:3000/docs`
- ReDoc: `http://localhost:3000/redoc`

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `A2A_KEY` | yes | — | Shared secret for `X-Agent-Key` header |
| `A2A_PORT` | no | `3000` | Port used in startup logs and agent card (use `--port` to change uvicorn's actual port) |
| `A2A_AGENT_NAME` | no | `my-agent` | Name returned in the agent card |
| `A2A_PUBLIC_URL` | no | `http://localhost:<port>` | Base URL used in the agent card (set this in production) |

## Implementation notes

- **Auth** uses `hmac.compare_digest` with no short-circuit on empty keys, preventing timing side-channel attacks.
- **Intent validation** is handled by Pydantic (`Literal["chat", "briefing", "ping"]`); invalid intents return a 422 automatically.
- **Inbox** is in-memory. It is not shared across workers — run with the default single worker (`--workers 1`) or replace with persistent storage for production.
- **Startup log** fires via FastAPI's `lifespan` event, so it prints whether you launch via `uvicorn` CLI or `python server.py`.
