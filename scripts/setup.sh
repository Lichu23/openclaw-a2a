#!/bin/bash
set -e

echo "🐾 OpenClaw A2A Setup"
echo "====================="
echo ""

# Check dependencies
echo "Checking dependencies..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org"
  exit 1
fi
echo "✅ Node.js $(node -v)"

if ! command -v openssl &> /dev/null; then
  echo "❌ OpenSSL not found"
  exit 1
fi
echo "✅ OpenSSL available"

# Generate key
echo ""
echo "Generating A2A agent key..."
KEY=$(openssl rand -hex 32)
echo "✅ Key generated"

# Get agent info
echo ""
read -p "Agent name: " AGENT_NAME
read -p "Public URL (e.g., https://my-agent.example.com): " PUBLIC_URL
read -p "Port [3000]: " PORT
PORT=${PORT:-3000}

# Create .env file
ENV_FILE=".env"
cat > "$ENV_FILE" << EOF
A2A_KEY=${KEY}
A2A_AGENT_NAME=${AGENT_NAME}
A2A_PUBLIC_URL=${PUBLIC_URL}
A2A_PORT=${PORT}
EOF

echo ""
echo "✅ Config written to ${ENV_FILE}"
echo ""
echo "Your A2A key (share securely with peers):"
echo "  ${KEY}"
echo ""
echo "Next steps:"
echo "  1. cd examples/basic-endpoint && npm install"
echo "  2. source .env && node server.js"
echo "  3. Share your key with peer agents"
echo "  4. Test: ./scripts/test-connection.sh ${PUBLIC_URL}/a2a/message YOUR_PEER_KEY"
