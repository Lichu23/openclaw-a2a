#!/bin/bash
set -e

if [ $# -lt 2 ]; then
  echo "Usage: $0 <endpoint-url> <agent-key> [intent]"
  echo ""
  echo "Examples:"
  echo "  $0 https://agent.example.com/a2a/message my-key"
  echo "  $0 https://agent.example.com/a2a/message my-key briefing"
  exit 1
fi

ENDPOINT="$1"
KEY="$2"
INTENT="${3:-ping}"

echo "🔗 Testing A2A connection"
echo "  Endpoint: ${ENDPOINT}"
echo "  Intent:   ${INTENT}"
echo ""

if [ "$INTENT" = "ping" ]; then
  MESSAGE="ping"
else
  MESSAGE="Test message from A2A connection test"
fi

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "X-Agent-Key: ${KEY}" \
  -d "{
    \"from\": \"test-script\",
    \"intent\": \"${INTENT}\",
    \"message\": \"${MESSAGE}\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Connection successful (HTTP ${HTTP_CODE})"
  echo ""
  echo "Response:"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
elif [ "$HTTP_CODE" = "401" ]; then
  echo "❌ Authentication failed (HTTP 401) — check your key"
else
  echo "❌ Request failed (HTTP ${HTTP_CODE})"
  echo "$BODY"
fi
