#!/usr/bin/env bash
# TON AI Agent - Telegram Bot Auto-Setup Script
#
# Automates:
#   - Telegram bot validation
#   - Webhook registration
#   - Menu button / Mini App link setup
#   - Bot commands setup
#
# Usage:
#   ./scripts/setup-bot.sh
#   BOT_TOKEN=xxx MINIAPP_URL=https://example.com ./scripts/setup-bot.sh
#
# Environment variables (or values from .env):
#   TELEGRAM_BOT_TOKEN   - Bot token from @BotFather (required)
#   TELEGRAM_MINI_APP_URL - Public HTTPS URL of the Mini App (required)
#   TELEGRAM_WEBHOOK_SECRET - Optional webhook secret for request validation

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MINIAPP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Colours ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}    $*"; }
log_ok()      { echo -e "${GREEN}[OK]${NC}      $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}    $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC}   $*"; }
log_section() { echo -e "\n${CYAN}══════════════════════════════════════════${NC}"; echo -e "${CYAN}  $*${NC}"; echo -e "${CYAN}══════════════════════════════════════════${NC}"; }

# ── Load .env ──────────────────────────────────────────────────────────────────
load_env() {
  local env_file="$MINIAPP_ROOT/.env"
  if [[ -f "$env_file" ]]; then
    log_info "Loading environment from $env_file"
    # Export only lines that look like VAR=value (skip comments and blanks)
    set -a
    # shellcheck disable=SC1090
    source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$env_file")
    set +a
  fi
}

# ── Requirement checks ─────────────────────────────────────────────────────────
check_deps() {
  local missing=()
  for cmd in curl jq; do
    if ! command -v "$cmd" &>/dev/null; then
      missing+=("$cmd")
    fi
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    log_error "Required tools not found: ${missing[*]}"
    log_info  "Install them and re-run:  apt-get install curl jq  (or brew install curl jq)"
    exit 1
  fi
}

# ── Telegram API helper ────────────────────────────────────────────────────────
TG_API="https://api.telegram.org/bot"

tg_call() {
  local method="$1"; shift
  local body="${1:-{}}"
  curl -s -X POST "${TG_API}${BOT_TOKEN}/${method}" \
       -H "Content-Type: application/json" \
       -d "$body"
}

tg_ok() {
  echo "$1" | jq -e '.ok == true' &>/dev/null
}

# ── Steps ──────────────────────────────────────────────────────────────────────
validate_bot_token() {
  log_section "Step 1 — Validate Bot Token"

  local resp
  resp=$(tg_call "getMe")

  if ! tg_ok "$resp"; then
    local desc; desc=$(echo "$resp" | jq -r '.description // "Unknown error"')
    log_error "Bot token validation failed: $desc"
    exit 1
  fi

  BOT_USERNAME=$(echo "$resp" | jq -r '.result.username')
  BOT_FIRST_NAME=$(echo "$resp" | jq -r '.result.first_name')
  log_ok "Bot verified: @${BOT_USERNAME} (${BOT_FIRST_NAME})"
}

delete_old_webhook() {
  log_section "Step 2 — Remove Existing Webhook"

  local resp
  resp=$(tg_call "deleteWebhook" '{"drop_pending_updates": false}')

  if tg_ok "$resp"; then
    log_ok "Old webhook removed"
  else
    log_warn "Could not remove old webhook (may not have been set)"
  fi
}

register_webhook() {
  log_section "Step 3 — Register Webhook"

  local webhook_url="${MINIAPP_URL}/webhook"

  # Build request body
  local body
  body=$(jq -n \
    --arg url "$webhook_url" \
    --argjson max_conn 100 \
    --argjson allowed '["message","callback_query","inline_query","web_app_data","chat_member"]' \
    '{
      url: $url,
      max_connections: $max_conn,
      allowed_updates: $allowed
    }')

  # Attach secret token if provided
  if [[ -n "${TELEGRAM_WEBHOOK_SECRET:-}" ]]; then
    body=$(echo "$body" | jq --arg s "$TELEGRAM_WEBHOOK_SECRET" '. + {secret_token: $s}')
  fi

  local resp
  resp=$(tg_call "setWebhook" "$body")

  if tg_ok "$resp"; then
    log_ok "Webhook registered: $webhook_url"
  else
    local desc; desc=$(echo "$resp" | jq -r '.description // "Unknown error"')
    log_error "Failed to register webhook: $desc"
    log_warn  "Make sure $webhook_url is publicly reachable over HTTPS"
    exit 1
  fi
}

verify_webhook() {
  log_section "Step 4 — Verify Webhook"

  local resp
  resp=$(tg_call "getWebhookInfo")

  if tg_ok "$resp"; then
    local url pending_count last_error
    url=$(echo "$resp" | jq -r '.result.url')
    pending_count=$(echo "$resp" | jq -r '.result.pending_update_count')
    last_error=$(echo "$resp" | jq -r '.result.last_error_message // "none"')

    log_ok  "Webhook URL:          $url"
    log_info "Pending updates:      $pending_count"
    if [[ "$last_error" != "none" ]]; then
      log_warn "Last Telegram error:  $last_error"
    fi
  else
    log_warn "Could not retrieve webhook info"
  fi
}

setup_menu_button() {
  log_section "Step 5 — Set Menu Button (Mini App Link)"

  local body
  body=$(jq -n \
    --arg type "web_app" \
    --arg text "Open TON AI Agent" \
    --arg url "$MINIAPP_URL" \
    '{
      menu_button: {
        type: $type,
        text: $text,
        web_app: { url: $url }
      }
    }')

  local resp
  resp=$(tg_call "setChatMenuButton" "$body")

  if tg_ok "$resp"; then
    log_ok "Menu button set — users can now open the Mini App directly"
  else
    local desc; desc=$(echo "$resp" | jq -r '.description // "Unknown error"')
    log_warn "Failed to set menu button: $desc"
    log_warn "You can set it manually in @BotFather with /newapp"
  fi
}

setup_bot_commands() {
  log_section "Step 6 — Register Bot Commands"

  local body
  body=$(jq -n '{
    commands: [
      { command: "start",     description: "Launch TON AI Agent Mini App" },
      { command: "app",       description: "Open the Mini App" },
      { command: "help",      description: "Show help information" },
      { command: "portfolio", description: "View your portfolio" },
      { command: "agents",    description: "Manage your AI agents" },
      { command: "strategies",description: "Browse strategy marketplace" }
    ],
    scope: { type: "default" }
  }')

  local resp
  resp=$(tg_call "setMyCommands" "$body")

  if tg_ok "$resp"; then
    log_ok "Bot commands registered"
  else
    log_warn "Could not register bot commands (non-fatal)"
  fi
}

setup_bot_description() {
  log_section "Step 7 — Set Bot Description"

  local description="Deploy autonomous AI trading agents on TON blockchain. Manage strategies, monitor portfolio, and earn yield — all inside Telegram."
  local short_description="AI trading agents for TON blockchain"

  local resp
  resp=$(tg_call "setMyDescription" "$(jq -n --arg d "$description" '{description: $d}')")
  tg_ok "$resp" && log_ok "Bot description set" || log_warn "Could not set bot description (non-fatal)"

  resp=$(tg_call "setMyShortDescription" "$(jq -n --arg d "$short_description" '{short_description: $d}')")
  tg_ok "$resp" && log_ok "Bot short description set" || log_warn "Could not set short description (non-fatal)"
}

print_summary() {
  log_section "Setup Complete"

  echo ""
  echo -e "  Bot username:   ${GREEN}@${BOT_USERNAME}${NC}"
  echo -e "  Mini App URL:   ${GREEN}${MINIAPP_URL}${NC}"
  echo -e "  Webhook URL:    ${GREEN}${MINIAPP_URL}/webhook${NC}"
  echo ""
  echo -e "  ${CYAN}Deep links:${NC}"
  echo -e "    Startapp: https://t.me/${BOT_USERNAME}?startapp"
  echo -e "    App:      https://t.me/${BOT_USERNAME}/app   (requires /newapp in @BotFather)"
  echo ""
  echo -e "  ${YELLOW}Next steps:${NC}"
  echo -e "    1. Open @BotFather → /mybots → @${BOT_USERNAME} → Bot Settings → Menu Button"
  echo -e "       to verify the Mini App URL is set correctly."
  echo -e "    2. Configure AI API keys in app/config.php (or via .env)."
  echo -e "    3. Delete install.php from your server for security."
  echo ""
}

# ── Main ───────────────────────────────────────────────────────────────────────
main() {
  echo ""
  echo -e "${CYAN}  TON AI Agent — Telegram Bot Auto-Setup${NC}"
  echo ""

  check_deps
  load_env

  # Resolve credentials (env vars override .env)
  BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-${BOT_TOKEN:-}}"
  MINIAPP_URL="${TELEGRAM_MINI_APP_URL:-${MINIAPP_URL:-}}"

  # Strip trailing slash
  MINIAPP_URL="${MINIAPP_URL%/}"

  # Prompt if still missing
  if [[ -z "$BOT_TOKEN" ]]; then
    echo -n "Enter your Telegram Bot Token (from @BotFather): "
    read -r BOT_TOKEN
  fi

  if [[ -z "$MINIAPP_URL" ]]; then
    echo -n "Enter your Mini App public HTTPS URL (e.g. https://example.com): "
    read -r MINIAPP_URL
    MINIAPP_URL="${MINIAPP_URL%/}"
  fi

  # Validate HTTPS
  if [[ "$MINIAPP_URL" != https://* ]]; then
    log_error "Mini App URL must use HTTPS. Telegram requires HTTPS for webhooks and Mini Apps."
    exit 1
  fi

  validate_bot_token
  delete_old_webhook
  register_webhook
  verify_webhook
  setup_menu_button
  setup_bot_commands
  setup_bot_description
  print_summary
}

main "$@"
