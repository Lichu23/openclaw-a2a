import hmac
import os
import sys
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Literal, Optional

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
A2A_KEY = os.environ.get("A2A_KEY")
PORT = int(os.environ.get("A2A_PORT", os.environ.get("PORT", 3000)))
AGENT_NAME = os.environ.get("A2A_AGENT_NAME", "my-agent")
PUBLIC_URL = os.environ.get("A2A_PUBLIC_URL", f"http://localhost:{PORT}")

if not A2A_KEY:
    print("ERROR: A2A_KEY environment variable is required", file=sys.stderr)
    print("Generate one with: openssl rand -hex 32", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# App & in-memory store
# ---------------------------------------------------------------------------
# WARNING: inbox is in-memory and not shared across workers.
# Use --workers 1 (the default) or replace with persistent storage for production.
inbox: list[dict] = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[A2A] {AGENT_NAME} listening on port {PORT}")
    print(f"[A2A] Endpoint: {PUBLIC_URL}/a2a/message")
    print(f"[A2A] Agent card: {PUBLIC_URL}/.well-known/agent.json")
    yield

app = FastAPI(title=AGENT_NAME, version="1.0", lifespan=lifespan)

# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------
async def authenticate(request: Request) -> None:
    key = request.headers.get("x-agent-key", "")
    # Always run compare_digest (no short-circuit) to avoid timing side-channels
    if not hmac.compare_digest(key.encode(), A2A_KEY.encode()):
        raise HTTPException(status_code=401, detail="Unauthorized")

# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------
# "from" is a Python keyword so we alias it
class MessageRequest(BaseModel):
    from_: str = Field(..., alias="from")
    intent: Literal["chat", "briefing", "ping"]
    message: str
    replyTo: Optional[str] = None

    model_config = {"populate_by_name": True}

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/.well-known/agent.json")
async def agent_card():
    return {
        "name": AGENT_NAME,
        "version": "1.0",
        "protocol": "openclaw-a2a-lite-v1",
        "endpoint": PUBLIC_URL,
        "capabilities": ["chat", "briefing", "ping"],
        "messageEndpoint": f"{PUBLIC_URL}/a2a/message",
    }


@app.post("/a2a/message", dependencies=[Depends(authenticate)])
async def receive_message(body: MessageRequest):
    if body.intent == "ping":
        return {
            "status": "pong",
            "from": AGENT_NAME,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    msg = {
        "id": str(uuid.uuid4()),
        "from": body.from_,
        "intent": body.intent,
        "message": body.message,
        "replyTo": body.replyTo,
        "receivedAt": datetime.now(timezone.utc).isoformat(),
    }
    inbox.append(msg)
    print(f"[A2A] {body.intent} from {body.from_}: {body.message[:100]}")

    return {
        "status": "received",
        "id": msg["id"],
        "from": AGENT_NAME,
        "timestamp": msg["receivedAt"],
    }


@app.get("/a2a/inbox", dependencies=[Depends(authenticate)])
async def get_inbox():
    return {"messages": inbox, "count": len(inbox)}


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=PORT, reload=False)
