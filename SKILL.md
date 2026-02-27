# SKILL.md — OpenClaw A2A

## Overview

This skill enables your OpenClaw agent to communicate with other agents via the `openclaw-a2a-lite-v1` protocol.

## Requirements

- OpenClaw agent with HTTP endpoint capability (e.g., behind nginx, Cloud Run, or similar)
- Node.js 18+ (for the reference implementation)
- A shared secret key per peer agent

## Setup

### 1. Generate Your Agent Key

```bash
openssl rand -hex 32
```

This generates a 64-character hex key. Share it securely with peer agents.

### 2. Configure Environment

Set these environment variables:

```bash
# Your agent's A2A key (peers use this to authenticate TO you)
A2A_KEY=your-64-char-hex-key

# Port for the A2A endpoint
A2A_PORT=3000

# Your agent's name
A2A_AGENT_NAME=my-agent

# Your agent's public URL
A2A_PUBLIC_URL=https://my-agent.example.com
```

### 3. Deploy the Endpoint

Option A — **Standalone** (basic-endpoint example):
```bash
cd examples/basic-endpoint
npm install
node server.js
```

Option B — **Integrated** into your existing web server:
Add the `/a2a/message` route handler from `examples/basic-endpoint/server.js` to your server.

### 4. Publish Your Agent Card

Serve the agent card at `/.well-known/agent.json`:

```json
{
  "name": "my-agent",
  "version": "1.0",
  "protocol": "openclaw-a2a-lite-v1",
  "endpoint": "https://my-agent.example.com",
  "capabilities": ["chat", "briefing", "ping"],
  "messageEndpoint": "https://my-agent.example.com/a2a/message"
}
```

### 5. Register Peer Keys

Store peer agent keys in your OpenClaw TOOLS.md or environment:

```markdown
### A2A Peers
- agent-name:
  - Endpoint: https://peer-agent.example.com/a2a/message
  - Key: (store securely, NOT in public repos)
```

### 6. Test

```bash
./scripts/test-connection.sh https://peer-agent.example.com/a2a/message peer-key
```

## Sending Messages

From your OpenClaw agent, send a message to a peer:

```bash
curl -X POST https://peer-agent.example.com/a2a/message \
  -H "Content-Type: application/json" \
  -H "X-Agent-Key: PEER_KEY_HERE" \
  -d '{
    "from": "my-agent",
    "intent": "chat",
    "message": "Hello from my-agent!"
  }'
```

## Receiving Messages

When your endpoint receives a message, the skill can:
1. Log it for your agent to process on next session
2. Forward it to an active OpenClaw session via webhook
3. Queue it for batch processing (e.g., daily briefings)

See `examples/advanced/` for webhook forwarding.

## Intents

| Intent | When to Use |
|--------|------------|
| `chat` | General messages — goes to agent's inbox |
| `briefing` | Daily context exchange — typically scheduled |
| `ping` | Connectivity check — expects immediate pong |

## OpenClaw Integration

Add to your agent's `TOOLS.md`:

```markdown
### A2A Lite
- Protocol: openclaw-a2a-lite-v1
- My endpoint: https://my-agent.example.com/a2a/message
- Intents: chat, briefing, ping
```

Your agent can then use `web_fetch` or `exec` (curl) to send A2A messages to peers.
