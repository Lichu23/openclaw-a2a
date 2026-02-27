const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

const A2A_KEY = process.env.A2A_KEY;
const PORT = process.env.A2A_PORT || process.env.PORT || 3000;
const AGENT_NAME = process.env.A2A_AGENT_NAME || 'my-agent';
const PUBLIC_URL = process.env.A2A_PUBLIC_URL || `http://localhost:${PORT}`;

// Webhook URL for forwarding to OpenClaw session
const WEBHOOK_URL = process.env.A2A_WEBHOOK_URL; // e.g., your OpenClaw gateway webhook endpoint
const WEBHOOK_SECRET = process.env.A2A_WEBHOOK_SECRET;

if (!A2A_KEY) {
  console.error('ERROR: A2A_KEY environment variable is required');
  process.exit(1);
}

function authenticate(req, res, next) {
  const key = req.headers['x-agent-key'];
  if (!key || !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(A2A_KEY))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Forward message to OpenClaw session via webhook
async function forwardToSession(msg) {
  if (!WEBHOOK_URL) {
    console.log('[A2A] No webhook URL configured, message stored locally only');
    return;
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(WEBHOOK_SECRET && { Authorization: `Bearer ${WEBHOOK_SECRET}` }),
      },
      body: JSON.stringify({
        source: 'a2a',
        from: msg.from,
        intent: msg.intent,
        message: msg.message,
        messageId: msg.id,
        timestamp: msg.receivedAt,
      }),
    });

    if (!response.ok) {
      console.error(`[A2A] Webhook forward failed: ${response.status}`);
    } else {
      console.log(`[A2A] Message forwarded to session`);
    }
  } catch (err) {
    console.error(`[A2A] Webhook error: ${err.message}`);
  }
}

// Agent card
app.get('/.well-known/agent.json', (req, res) => {
  res.json({
    name: AGENT_NAME,
    version: '1.0',
    protocol: 'openclaw-a2a-lite-v1',
    endpoint: PUBLIC_URL,
    capabilities: ['chat', 'briefing', 'ping'],
    messageEndpoint: `${PUBLIC_URL}/a2a/message`,
  });
});

// A2A message endpoint
app.post('/a2a/message', authenticate, async (req, res) => {
  const { from, intent, message, replyTo } = req.body;

  if (!from || !intent || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (intent === 'ping') {
    return res.json({
      status: 'pong',
      from: AGENT_NAME,
      timestamp: new Date().toISOString(),
    });
  }

  const msg = {
    id: crypto.randomUUID(),
    from,
    intent,
    message,
    replyTo: replyTo || null,
    receivedAt: new Date().toISOString(),
  };

  console.log(`[A2A] ${intent} from ${from}: ${message.substring(0, 100)}`);

  // Forward to active OpenClaw session
  await forwardToSession(msg);

  res.json({
    status: 'received',
    id: msg.id,
    from: AGENT_NAME,
    timestamp: msg.receivedAt,
  });
});

app.listen(PORT, () => {
  console.log(`[A2A] ${AGENT_NAME} (advanced) listening on port ${PORT}`);
  console.log(`[A2A] Webhook forwarding: ${WEBHOOK_URL ? 'enabled' : 'disabled'}`);
});
