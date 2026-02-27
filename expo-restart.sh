#!/bin/bash
# Expo Server Restart & QR Code Generator
# Usage: bash /app/expo-restart.sh

set +e  # Don't exit on errors

echo "========================================="
echo "  Expo Server Restart & QR Generator"
echo "========================================="

# 1. Restart expo via supervisor (preserves urlRandomness → stable URL)
echo ""
echo "1. Restarting Expo via supervisor..."
supervisorctl restart expo 2>/dev/null || true
echo "   Waiting for server to start (45 seconds)..."
sleep 45

# 2. Check if server is running
echo ""
echo "2. Checking server status..."
STATUS=$(curl -s http://localhost:8081/status 2>/dev/null)
if [ "$STATUS" = "packager-status:running" ]; then
    echo "   Server is running!"
else
    echo "   Warning: Server may not be ready yet"
fi

# 3. Get stable tunnel URL from settings.json (no --clear means URL never changes)
echo ""
echo "3. Getting tunnel URL..."
RANDOMNESS=$(python3 -c "import json; print(json.load(open('/app/mobile/.expo/settings.json')).get('urlRandomness',''))" 2>/dev/null)
TUNNEL=""
if [ -n "$RANDOMNESS" ]; then
    TUNNEL="exp://${RANDOMNESS}-anonymous-8081.exp.direct"
fi

# Fallback: try ngrok API
if [ -z "$TUNNEL" ]; then
    TUNNEL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('exp://' + d['tunnels'][0]['public_url'].split('://')[1]) if d.get('tunnels') else print('')" 2>/dev/null)
fi

echo "   Tunnel: $TUNNEL"

# 4. Generate QR code
echo ""
echo "4. Generating QR code..."
pip install qrcode pillow -q 2>/dev/null
python3 -c "
import qrcode
url = '$TUNNEL'
qr = qrcode.QRCode(version=1, box_size=10, border=5)
qr.add_data(url)
qr.make(fit=True)
img = qr.make_image(fill_color='black', back_color='white')
img.save('/app/frontend/public/expo_qr.png')
"
echo "   QR saved to: /app/frontend/public/expo_qr.png"

# 5. Show final status
echo ""
echo "========================================="
echo "  DONE!"
echo "========================================="
echo ""
echo "  QR Code: /app/frontend/public/expo_qr.png"
echo "  Manual:  $TUNNEL"
echo ""
echo "  Supervisor status:"
supervisorctl status expo 2>/dev/null
echo ""
echo "  Latest logs:"
tail -5 /tmp/expo.log
echo ""
echo "========================================="

exit 0
