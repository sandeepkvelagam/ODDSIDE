#!/bin/bash
# Expo Tunnel Watchdog
# Monitors the ngrok tunnel and restarts Expo if it goes offline
# Runs as a supervisor process — checks every 90 seconds

EXPO_LOG="/tmp/expo.log"
WATCHDOG_LOG="/tmp/expo-watchdog.log"
CHECK_INTERVAL=90
RESTART_COOLDOWN=120
LAST_RESTART=0

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$WATCHDOG_LOG"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

get_tunnel_url() {
    RANDOMNESS=$(python3 -c "import json; print(json.load(open('/app/mobile/.expo/settings.json')).get('urlRandomness',''))" 2>/dev/null)
    if [ -n "$RANDOMNESS" ]; then
        echo "https://${RANDOMNESS}-anonymous-8081.exp.direct"
    fi
}

check_tunnel() {
    URL=$(get_tunnel_url)
    if [ -z "$URL" ]; then
        return 1
    fi
    # Check if tunnel responds (ngrok returns 404/502/200 when alive, connection error when dead)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 15 "$URL" 2>/dev/null)
    if [ "$HTTP_CODE" = "000" ]; then
        return 1  # Connection failed — tunnel is dead
    fi
    return 0  # Any HTTP response means tunnel is alive
}

check_metro() {
    STATUS=$(curl -s --connect-timeout 5 http://localhost:8081/status 2>/dev/null)
    if [ "$STATUS" = "packager-status:running" ]; then
        return 0
    fi
    return 1
}

restart_expo() {
    NOW=$(date +%s)
    ELAPSED=$((NOW - LAST_RESTART))
    if [ "$ELAPSED" -lt "$RESTART_COOLDOWN" ]; then
        log "SKIP: Last restart was ${ELAPSED}s ago (cooldown: ${RESTART_COOLDOWN}s)"
        return
    fi

    log "RESTARTING Expo server..."
    supervisorctl restart expo 2>/dev/null
    LAST_RESTART=$(date +%s)

    # Wait for startup
    log "Waiting 50s for server to start..."
    sleep 50

    if check_metro; then
        log "Metro is running after restart"
    else
        log "WARNING: Metro may not be ready yet"
    fi

    if check_tunnel; then
        log "Tunnel is ONLINE after restart"
    else
        log "WARNING: Tunnel may still be connecting..."
        sleep 15
    fi
}

# Keep tunnel alive by sending periodic requests (prevents idle timeout)
keepalive_ping() {
    URL=$(get_tunnel_url)
    if [ -n "$URL" ]; then
        curl -s -o /dev/null --connect-timeout 5 --max-time 10 "$URL" 2>/dev/null
    fi
}

log "========================================="
log "Expo Watchdog started (check every ${CHECK_INTERVAL}s)"
log "========================================="

while true; do
    # Check Metro bundler first
    if ! check_metro; then
        log "ALERT: Metro bundler is DOWN"
        restart_expo
        sleep "$CHECK_INTERVAL"
        continue
    fi

    # Check tunnel
    if ! check_tunnel; then
        log "ALERT: Tunnel is OFFLINE"
        restart_expo
    else
        # Tunnel is alive — send keepalive ping to prevent idle timeout
        keepalive_ping
        log "OK: Metro running, tunnel alive"
    fi

    sleep "$CHECK_INTERVAL"
done
