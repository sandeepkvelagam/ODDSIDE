#!/bin/bash
# Expo Server Restart & QR Code Generator
# Usage: bash /app/expo-restart.sh

set +e  # Don't exit on errors

echo "========================================="
echo "  Expo Server Restart & QR Generator"
echo "========================================="

# 1. Kill existing processes
echo ""
echo "1. Killing existing processes..."
pkill -f "npx expo" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
pkill -f "ngrok" 2>/dev/null || true
sleep 2
echo "   Done!"

# 2. Clear all caches
echo ""
echo "2. Clearing caches..."
cd /app/frontend && rm -rf node_modules/.cache build .cache 2>/dev/null
cd /app/mobile && rm -rf node_modules/.cache .expo dist 2>/dev/null
cd /app/backend && find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
rm -rf /tmp/metro-* /tmp/haste-map-* 2>/dev/null
echo "   Done!"

# 3. Restart backend and frontend
echo ""
echo "3. Restarting backend & frontend..."
sudo supervisorctl restart backend frontend 2>/dev/null
sleep 5
echo "   Done!"

# 4. Start Expo with tunnel
echo ""
echo "4. Starting Expo server with tunnel..."
cd /app/mobile
nohup npx expo start --tunnel --clear > /tmp/expo.log 2>&1 &
echo "   Waiting for server to start (40 seconds)..."
sleep 40

# 5. Check if server is running
echo ""
echo "5. Checking server status..."
STATUS=$(curl -s http://localhost:8081/status 2>/dev/null)
if [ "$STATUS" = "packager-status:running" ]; then
    echo "   Server is running!"
else
    echo "   Warning: Server may not be ready yet"
fi

# 6. Get tunnel URL (try ngrok API first, fallback to settings.json)
echo ""
echo "6. Getting tunnel URL..."
TUNNEL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('exp://' + d['tunnels'][0]['public_url'].split('://')[1]) if d.get('tunnels') else print('')" 2>/dev/null)

# Fallback to settings.json if ngrok API failed
if [ -z "$TUNNEL" ]; then
    RANDOMNESS=$(python3 -c "import json; print(json.load(open('/app/mobile/.expo/settings.json')).get('urlRandomness',''))" 2>/dev/null)
    if [ -n "$RANDOMNESS" ]; then
        TUNNEL="exp://${RANDOMNESS}-anonymous-8081.exp.direct"
    fi
fi
echo "   Tunnel: $TUNNEL"

# 7. Generate QR code
echo ""
echo "7. Generating QR code..."
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

# 8. Pre-warm bundle
echo ""
echo "8. Pre-warming bundle..."
curl -s "http://localhost:8081/index.bundle?platform=ios&dev=true" > /dev/null 2>&1 &
sleep 20

# 9. Show final status
echo ""
echo "========================================="
echo "  DONE!"
echo "========================================="
echo ""
echo "  QR Code: /app/frontend/public/expo_qr.png"
echo "  Manual:  $TUNNEL"
echo ""
echo "  Latest logs:"
tail -5 /tmp/expo.log
echo ""
echo "========================================="

exit 0
