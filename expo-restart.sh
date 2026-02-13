#!/bin/bash
# Expo Server Restart & QR Code Generator
# Usage: bash /app/expo-restart.sh

echo "========================================="
echo "  Expo Server Restart & QR Generator"
echo "========================================="

# 1. Kill existing processes
echo ""
echo "1. Killing existing processes..."
pkill -f "expo" 2>/dev/null
pkill -f "metro" 2>/dev/null
pkill -f "ngrok" 2>/dev/null
sleep 2
echo "   Done!"

# 2. Clear all caches
echo ""
echo "2. Clearing caches..."
cd /app/mobile
rm -rf node_modules/.cache .expo /tmp/metro-* /tmp/haste-map-*
echo "   Done!"

# 3. Start Expo with tunnel
echo ""
echo "3. Starting Expo server with tunnel..."
cd /app/mobile
npx expo start --tunnel --clear > /tmp/expo.log 2>&1 &
echo "   Waiting for server to start (40 seconds)..."
sleep 40

# 4. Check if server is running
echo ""
echo "4. Checking server status..."
STATUS=$(curl -s http://localhost:8081/status 2>/dev/null)
if [ "$STATUS" = "packager-status:running" ]; then
    echo "   Server is running!"
else
    echo "   Warning: Server may not be ready yet"
fi

# 5. Get tunnel URL
echo ""
echo "5. Getting tunnel URL..."
TUNNEL=$(curl -s http://127.0.0.1:4040/api/tunnels | python3 -c "import sys,json; d=json.load(sys.stdin); print('exp://' + d['tunnels'][0]['public_url'].split('://')[1])" 2>/dev/null)
echo "   Tunnel: $TUNNEL"

# 6. Generate QR code
echo ""
echo "6. Generating QR code..."
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

# 7. Trigger bundle (pre-warm)
echo ""
echo "7. Pre-warming bundle..."
curl -s "http://localhost:8081/index.bundle?platform=ios&dev=true" > /dev/null 2>&1 &
sleep 25

# 8. Show final status
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
