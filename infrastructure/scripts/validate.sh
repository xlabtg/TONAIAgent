#!/bin/bash
# TON AI Agent - Deployment Validation Script
#
# Usage:
#   ./validate.sh [url]
#
# Examples:
#   ./validate.sh https://tonaiagent.example.com
#   ./validate.sh http://localhost:3000

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

URL="${1:-http://localhost:3000}"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Track failures
FAILURES=0

check_endpoint() {
    local name="$1"
    local endpoint="$2"
    local expected_status="${3:-200}"

    log_info "Checking $name..."

    response=$(curl -s -o /dev/null -w "%{http_code}" "$URL$endpoint" 2>/dev/null || echo "000")

    if [ "$response" == "$expected_status" ]; then
        log_success "$name - HTTP $response"
        return 0
    else
        log_error "$name - HTTP $response (expected $expected_status)"
        ((FAILURES++))
        return 1
    fi
}

check_health_response() {
    log_info "Checking health response content..."

    response=$(curl -s "$URL/health" 2>/dev/null || echo '{}')

    # Check if response is valid JSON
    if echo "$response" | jq . > /dev/null 2>&1; then
        status=$(echo "$response" | jq -r '.status')

        if [ "$status" == "healthy" ]; then
            log_success "Health status: healthy"

            # Check components
            telegram=$(echo "$response" | jq -r '.components.telegram.status')
            ai=$(echo "$response" | jq -r '.components.ai.status')
            ton=$(echo "$response" | jq -r '.components.ton.status')

            [ "$telegram" == "ok" ] && log_success "  Telegram: ok" || log_warning "  Telegram: $telegram"
            [ "$ai" == "ok" ] && log_success "  AI Provider: ok" || log_warning "  AI Provider: $ai"
            [ "$ton" == "ok" ] && log_success "  TON Network: ok" || log_warning "  TON Network: $ton"
        elif [ "$status" == "degraded" ]; then
            log_warning "Health status: degraded"
        else
            log_error "Health status: $status"
            ((FAILURES++))
        fi
    else
        log_error "Invalid JSON response from health endpoint"
        ((FAILURES++))
    fi
}

check_telegram_webhook() {
    log_info "Checking Telegram webhook endpoint..."

    # POST to webhook should return 200 (even for invalid data)
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{"update_id": 0}' \
        "$URL/api/telegram/webhook" 2>/dev/null || echo "000")

    if [ "$response" == "200" ]; then
        log_success "Telegram webhook endpoint responds"
    else
        log_warning "Telegram webhook returned HTTP $response"
    fi
}

check_ssl() {
    if [[ "$URL" == https://* ]]; then
        log_info "Checking SSL certificate..."

        domain=$(echo "$URL" | sed 's|https://||' | cut -d'/' -f1)

        # Check certificate expiry
        expiry=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

        if [ -n "$expiry" ]; then
            expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry" +%s 2>/dev/null)
            now_epoch=$(date +%s)
            days_until_expiry=$(( (expiry_epoch - now_epoch) / 86400 ))

            if [ "$days_until_expiry" -gt 30 ]; then
                log_success "SSL certificate valid for $days_until_expiry days"
            elif [ "$days_until_expiry" -gt 0 ]; then
                log_warning "SSL certificate expires in $days_until_expiry days"
            else
                log_error "SSL certificate expired!"
                ((FAILURES++))
            fi
        else
            log_warning "Could not check SSL certificate"
        fi
    else
        log_warning "Skipping SSL check (not HTTPS)"
    fi
}

check_response_time() {
    log_info "Checking response time..."

    time_total=$(curl -s -o /dev/null -w "%{time_total}" "$URL/health" 2>/dev/null || echo "0")

    # Convert to milliseconds
    time_ms=$(echo "$time_total * 1000" | bc 2>/dev/null || echo "0")

    if (( $(echo "$time_total < 1" | bc -l) )); then
        log_success "Response time: ${time_ms}ms"
    elif (( $(echo "$time_total < 3" | bc -l) )); then
        log_warning "Response time: ${time_ms}ms (slow)"
    else
        log_error "Response time: ${time_ms}ms (very slow)"
    fi
}

# Main
echo ""
echo "=========================================="
echo "  TON AI Agent Deployment Validation"
echo "=========================================="
echo ""
log_info "URL: $URL"
echo ""

# Basic connectivity
check_endpoint "Health endpoint" "/health"
check_endpoint "Root path" "/" "200"

# Detailed health check
check_health_response

# Telegram webhook
check_telegram_webhook

# SSL (if applicable)
check_ssl

# Performance
check_response_time

# Summary
echo ""
echo "=========================================="
if [ $FAILURES -eq 0 ]; then
    log_success "All validation checks passed!"
    exit 0
else
    log_error "$FAILURES validation check(s) failed"
    exit 1
fi
