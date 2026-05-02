#!/bin/bash
# ============================================================
# VoiceMind — Cloudflare Tunnel Setup for WhisperX
# Run this script on Server A (vincent-ubuntu)
# ============================================================

set -e

echo "╔══════════════════════════════════════════════════════╗"
echo "║  VoiceMind Cloudflare Tunnel Installer               ║"
echo "║  Target: whisperx.aivolo.com → localhost:9100        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Step 1: Install cloudflared
if command -v cloudflared &> /dev/null; then
    echo "✅ cloudflared already installed: $(cloudflared --version)"
else
    echo "📦 Installing cloudflared..."
    curl -L --output /tmp/cloudflared.deb \
      https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i /tmp/cloudflared.deb
    rm /tmp/cloudflared.deb
    echo "✅ cloudflared installed: $(cloudflared --version)"
fi

echo ""

# Step 2: Login to Cloudflare (opens browser or provides URL)
echo "🔐 Step 2: Login to Cloudflare"
echo "   This will open a browser. Select the 'aivolo.com' zone."
echo ""
cloudflared tunnel login

echo ""
echo "✅ Logged in to Cloudflare"

# Step 3: Create tunnel
TUNNEL_NAME="voicemind-whisperx"
echo ""
echo "🔧 Step 3: Creating tunnel '${TUNNEL_NAME}'..."

# Check if tunnel already exists
if cloudflared tunnel list | grep -q "${TUNNEL_NAME}"; then
    echo "✅ Tunnel '${TUNNEL_NAME}' already exists"
    TUNNEL_ID=$(cloudflared tunnel list | grep "${TUNNEL_NAME}" | awk '{print $1}')
else
    cloudflared tunnel create "${TUNNEL_NAME}"
    TUNNEL_ID=$(cloudflared tunnel list | grep "${TUNNEL_NAME}" | awk '{print $1}')
    echo "✅ Tunnel created: ${TUNNEL_ID}"
fi

# Step 4: Route DNS
echo ""
echo "🌐 Step 4: Routing DNS whisperx.aivolo.com → tunnel..."
cloudflared tunnel route dns "${TUNNEL_NAME}" whisperx.aivolo.com || echo "   (DNS route may already exist)"

# Step 5: Create config
CONFIG_DIR="$HOME/.cloudflared"
CONFIG_FILE="${CONFIG_DIR}/config.yml"
CRED_FILE="${CONFIG_DIR}/${TUNNEL_ID}.json"

echo ""
echo "📝 Step 5: Creating config at ${CONFIG_FILE}..."

cat > "${CONFIG_FILE}" << EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CRED_FILE}

ingress:
  - hostname: whisperx.aivolo.com
    service: http://localhost:9100
    originRequest:
      connectTimeout: 120s
      noTLSVerify: true
  - service: http_status:404
EOF

echo "✅ Config created"
cat "${CONFIG_FILE}"

# Step 6: Install as systemd service
echo ""
echo "🚀 Step 6: Installing as systemd service..."
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

echo ""
echo "✅ Tunnel is running!"
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Setup Complete!                                     ║"
echo "║                                                      ║"
echo "║  Tunnel: ${TUNNEL_ID}              ║"
echo "║  DNS:    whisperx.aivolo.com → localhost:9100        ║"
echo "║  Status: sudo systemctl status cloudflared           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "📋 Next Steps:"
echo "   1. Go to Cloudflare Zero Trust Dashboard"
echo "   2. Create Service Token (Access → Service Tokens)"
echo "   3. Create Access Application for whisperx.aivolo.com"
echo "   4. Add policy: Allow Service Token only"
