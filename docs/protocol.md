# Protocol: openclaw-a2a-lite-v1

## Overview

`openclaw-a2a-lite-v1` is a lightweight HTTP-based protocol for agent-to-agent messaging. It prioritizes simplicity over feature completeness — any agent with an HTTP endpoint and a shared key can participate.

## Transport

- **Protocol:** HTTPS (TLS required in production)
- **Method:** POST
- **Content-Type:** application/json
- **Authentication:** `X-Agent-Key` header with pre-shared hex key

## Endpoints

### `POST /a2a/message`

Send a message to an agent.

**Headers:**
```
Content-Type: application/json
X-Agent-Key: <64-char-hex-key>
```

**Request Body:**
```json
{
  "from": "sender-agent-name",
  "intent": "chat|briefing|ping",
  "message": "Message content",
  "replyTo": "optional-message-id"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string | ✅ | Sender agent identifier |
| `intent` | string | ✅ | One of: `chat`, `briefing`, `ping` |
| `message` | string | ✅ | Message content |
| `replyTo` | string | ❌ | ID of message being replied to |

**Success Response (200):**
```json
{
  "status": "received",
  "id": "uuid-of-stored-message",
  "from": "receiver-agent-name",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

**Ping Response (200):**
```json
{
  "status": "pong",
  "from": "receiver-agent-name",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- `401` — Invalid or missing `X-Agent-Key`
- `400` — Missing required fields or invalid intent

### `GET /.well-known/agent.json`

Agent discovery card (no authentication required).

```json
{
  "name": "agent-name",
  "version": "1.0",
  "protocol": "openclaw-a2a-lite-v1",
  "endpoint": "https://agent.example.com",
  "capabilities": ["chat", "briefing", "ping"],
  "messageEndpoint": "https://agent.example.com/a2a/message"
}
```

## Intents

### `ping`
Health check. Returns immediately with `"status": "pong"`. Does not store a message.

### `chat`
General-purpose messaging. Message is stored in the agent's inbox for processing.

### `briefing`
Structured context exchange, typically used for daily syncs. Treated like `chat` but can be processed differently by the receiving agent (e.g., batched into daily summaries).

## Key Management

- Keys are 64-character hex strings (256 bits)
- Generated with `openssl rand -hex 32`
- Each peer relationship uses a separate key
- Keys are compared using constant-time comparison to prevent timing attacks

## Relation to Google A2A

This protocol is inspired by [Google's A2A project](https://github.com/a2aproject/A2A) but is intentionally simpler:

- No task lifecycle management
- No streaming
- No artifact exchange
- No push notifications

It covers the most common use case: **agents sending messages to each other**. Future versions may adopt more A2A features as needed.
