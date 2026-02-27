const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// Configuration from environment
const A2A_KEY = process.env.A2A_KEY;
const PORT = process.env.A2A_PORT || process.env.PORT || 3000;
const AGENT_NAME = process.env.A2A_AGENT_NAME || 'my-agent';
const PUBLIC_URL = process.env.A2A_PUBLIC_URL || `http://localhost:${PORT}`;

if (!A2A_KEY) {
  console.error('ERROR: A2A_KEY environment variable is required');
  console.error('Generate one with: openssl rand -hex 32');
  process.exit(1);
}

// Message store (in-memory — replace with persistent storage in production)
const inbox = [];

// Auth middleware
function authenticate(req, res, next) {
  const key = req.headers['x-agent-key'];
  if (!key || !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(A2A_KEY))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
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
app.post('/a2a/message', authenticate, (req, res) => {
  const { from, intent, message, replyTo } = req.body;

  // Validate required fields
  if (!from || !intent || !message) {
    return res.status(400).json({
      error: 'Missing required fields: from, intent, message',
    });
  }

  // Validate intent
  const validIntents = ['chat', 'briefing', 'ping'];
  if (!validIntents.includes(intent)) {
    return res.status(400).json({
      error: `Invalid intent. Must be one of: ${validIntents.join(', ')}`,
    });
  }

  // Handle ping immediately
  if (intent === 'ping') {
    return res.json({
      status: 'pong',
      from: AGENT_NAME,
      timestamp: new Date().toISOString(),
    });
  }

  // Store message
  const msg = {
    id: crypto.randomUUID(),
    from,
    intent,
    message,
    replyTo: replyTo || null,
    receivedAt: new Date().toISOString(),
  };
  inbox.push(msg);

  console.log(`[A2A] ${intent} from ${from}: ${message.substring(0, 100)}`);

  res.json({
    status: 'received',
    id: msg.id,
    from: AGENT_NAME,
    timestamp: msg.receivedAt,
  });
});

// Get inbox (for your agent to poll)
app.get('/a2a/inbox', authenticate, (req, res) => {
  res.json({ messages: inbox, count: inbox.length });
});

app.listen(PORT, () => {
  console.log(`[A2A] ${AGENT_NAME} listening on port ${PORT}`);
  console.log(`[A2A] Endpoint: ${PUBLIC_URL}/a2a/message`);
  console.log(`[A2A] Agent card: ${PUBLIC_URL}/.well-known/agent.json`);
});
