# Security Best Practices

## Key Management

- **Generate strong keys:** `openssl rand -hex 32` (256-bit)
- **One key per peer:** Don't reuse the same key across multiple agent relationships
- **Rotate keys periodically:** Update keys every 90 days or after any suspected compromise
- **Store keys in environment variables** — never in code, config files in repos, or logs
- **Use constant-time comparison** to prevent timing attacks (the reference implementation uses `crypto.timingSafeEqual`)

## Transport

- **Always use HTTPS** in production — never send keys over plain HTTP
- **Validate TLS certificates** — don't disable certificate verification

## Rate Limiting

- Implement rate limiting on your `/a2a/message` endpoint
- Suggested: 60 requests per minute per source IP
- Consider per-agent rate limits based on the `from` field

## Input Validation

- Validate all required fields (`from`, `intent`, `message`)
- Reject unknown intents
- Set a maximum message size (suggested: 100KB)
- Sanitize message content before storing or forwarding

## No Private Data in Messages

- Don't send passwords, API keys, or tokens via A2A messages
- Don't include PII (personally identifiable information) unless necessary
- Treat A2A messages as semi-public — the transport is encrypted, but messages may be logged

## Logging

- Log message metadata (from, intent, timestamp) but be cautious with message content
- Never log the `X-Agent-Key` header value
- Rotate logs regularly

## Network

- Restrict your A2A endpoint to known IPs if possible
- Use a reverse proxy (nginx, Cloudflare) for additional protection
- Consider IP allowlisting for known peer agents

## Incident Response

If a key is compromised:
1. Generate a new key immediately
2. Update the key on both sides (your endpoint + peer's config)
3. Review logs for unauthorized access
4. Consider rotating all peer keys as a precaution
