#!/bin/bash
# TON AI Agent - Health Check Script
#
# Usage:
#   ./health-check.sh [url]
#
# Returns exit code 0 if healthy, 1 if unhealthy

URL="${1:-http://localhost:3000}"
ENDPOINT="$URL/health"

response=$(curl -s -o /tmp/health_response.json -w "%{http_code}" "$ENDPOINT" 2>/dev/null)

if [ "$response" == "200" ]; then
    status=$(jq -r '.status' /tmp/health_response.json 2>/dev/null)

    if [ "$status" == "healthy" ] || [ "$status" == "degraded" ]; then
        echo "OK: $status"
        exit 0
    else
        echo "UNHEALTHY: $status"
        exit 1
    fi
else
    echo "UNHEALTHY: HTTP $response"
    exit 1
fi
