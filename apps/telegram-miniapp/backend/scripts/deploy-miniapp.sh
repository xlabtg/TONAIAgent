#!/usr/bin/env bash
# TON AI Agent - One-Command Mini App Deployment Script
#
# Supports:
#   static   - Deploy public/ folder to any static host (build only)
#   vercel   - Deploy to Vercel
#   cloudflare - Deploy to Cloudflare Pages
#   docker   - Deploy via Docker / docker compose
#   php      - Deploy PHP backend to a remote SSH server
#
# Usage:
#   ./scripts/deploy-miniapp.sh [mode]
#
#   mode defaults to "static"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MINIAPP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$MINIAPP_ROOT/.." && pwd)"

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
    log_info "Loading environment from .env"
    set -a
    # shellcheck disable=SC1090
    source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$env_file")
    set +a
  elif [[ -f "$MINIAPP_ROOT/.env.example" ]]; then
    log_warn ".env not found. Copying .env.example → .env"
    cp "$MINIAPP_ROOT/.env.example" "$MINIAPP_ROOT/.env"
    log_warn "Please edit $MINIAPP_ROOT/.env with your real credentials before deploying."
  fi
}

# ── Preflight ──────────────────────────────────────────────────────────────────
preflight_static() {
  if [[ ! -d "$MINIAPP_ROOT/public" ]]; then
    log_error "public/ directory not found in $MINIAPP_ROOT"
    exit 1
  fi
  log_ok "public/ directory found"
}

preflight_vercel() {
  if ! command -v vercel &>/dev/null; then
    log_error "Vercel CLI not found. Install with:  npm install -g vercel"
    exit 1
  fi
  log_ok "Vercel CLI found"
}

preflight_cloudflare() {
  if ! command -v wrangler &>/dev/null; then
    log_error "Wrangler CLI not found. Install with:  npm install -g wrangler"
    exit 1
  fi
  log_ok "Wrangler (Cloudflare) CLI found"
}

preflight_docker() {
  if ! command -v docker &>/dev/null; then
    log_error "Docker not found. Install from https://docs.docker.com/get-docker/"
    exit 1
  fi
  log_ok "Docker found: $(docker --version)"
}

# ── Deploy modes ───────────────────────────────────────────────────────────────
deploy_static() {
  log_section "Static Build"

  log_info "Mini App static files are ready in:  $MINIAPP_ROOT/public/"
  log_info ""
  log_info "Upload the contents of public/ to any HTTPS-capable host:"
  log_info "  • Nginx / Apache  — point the document root to public/"
  log_info "  • GitHub Pages    — push public/ as gh-pages branch"
  log_info "  • Netlify         — drag-and-drop public/ folder"
  log_info "  • Cloudflare Pages— connect repo, set output dir to telegram-miniapp/public"
  log_info "  • Vercel          — run:  vercel telegram-miniapp/public"
  log_info ""

  if command -v python3 &>/dev/null; then
    log_info "Starting local preview server on http://localhost:8080 (Ctrl+C to stop)..."
    cd "$MINIAPP_ROOT/public" && python3 -m http.server 8080
  else
    log_ok "Static files are ready. Deploy public/ to your host."
  fi
}

deploy_vercel() {
  log_section "Vercel Deployment"

  preflight_vercel

  # Create vercel.json in telegram-miniapp if it does not already exist
  local vconf="$MINIAPP_ROOT/vercel.json"
  if [[ ! -f "$vconf" ]]; then
    log_info "Creating $vconf"
    cat > "$vconf" <<'JSON'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2,
  "name": "ton-ai-agent-miniapp",
  "outputDirectory": "public",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
JSON
  fi

  local prod_flag=""
  if [[ "${DEPLOY_ENV:-staging}" == "production" ]]; then
    prod_flag="--prod"
  fi

  log_info "Deploying to Vercel ($DEPLOY_ENV)..."
  # shellcheck disable=SC2086
  vercel "$MINIAPP_ROOT" $prod_flag

  log_ok "Vercel deployment complete"
}

deploy_cloudflare() {
  log_section "Cloudflare Pages Deployment"

  preflight_cloudflare

  local project="${CF_PROJECT_NAME:-ton-ai-agent-miniapp}"

  log_info "Deploying to Cloudflare Pages project: $project"
  wrangler pages deploy "$MINIAPP_ROOT/public" \
    --project-name "$project" \
    ${DEPLOY_ENV:+--branch "$DEPLOY_ENV"}

  log_ok "Cloudflare Pages deployment complete"
}

deploy_docker() {
  log_section "Docker Deployment"

  preflight_docker

  local compose_file="$MINIAPP_ROOT/docker-compose.yml"

  if [[ ! -f "$compose_file" ]]; then
    log_info "Creating $compose_file"
    cat > "$compose_file" <<YAML
version: '3.9'

services:
  miniapp:
    image: nginx:alpine
    container_name: ton-ai-agent-miniapp
    restart: unless-stopped
    ports:
      - "\${PORT:-8080}:80"
    volumes:
      - ./public:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost/health"]
      interval: 30s
      timeout: 5s
      retries: 3

networks:
  default:
    name: ton-ai-agent
YAML

    cat > "$MINIAPP_ROOT/nginx.conf" <<'NGINX'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Health check endpoint
    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|svg|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX
    log_ok "docker-compose.yml and nginx.conf created"
  fi

  log_info "Starting container..."
  docker compose -f "$compose_file" up -d --build

  log_ok "Container started"
  docker compose -f "$compose_file" ps
  log_info "Mini App available at http://localhost:${PORT:-8080}"
  log_warn "Add a reverse proxy (nginx/traefik) with a TLS certificate for production."
}

deploy_php() {
  log_section "PHP Server Deployment (SSH)"

  local ssh_host="${SSH_HOST:-}"
  local ssh_path="${SSH_DEPLOY_PATH:-/var/www/html/miniapp}"
  local ssh_user="${SSH_USER:-www-data}"

  if [[ -z "$ssh_host" ]]; then
    echo -n "SSH host (e.g. example.com): "
    read -r ssh_host
  fi

  log_info "Syncing files to ${ssh_user}@${ssh_host}:${ssh_path}"
  rsync -avz --exclude='.env' --exclude='*.log' --exclude='cache/' \
    "$MINIAPP_ROOT/" "${ssh_user}@${ssh_host}:${ssh_path}/"

  log_info "Setting file permissions..."
  # shellcheck disable=SC2029
  ssh "${ssh_user}@${ssh_host}" "
    chmod 600 '${ssh_path}/app/config.php' 2>/dev/null || true
    chmod 755 '${ssh_path}/public'
    chmod -R 755 '${ssh_path}/public/js'
    chmod -R 755 '${ssh_path}/public/css'
    mkdir -p '${ssh_path}/logs' '${ssh_path}/cache'
    chmod 755 '${ssh_path}/logs' '${ssh_path}/cache'
    echo 'File permissions set'
  "

  log_ok "PHP deployment complete"
  log_info "Mini App available at ${TELEGRAM_MINI_APP_URL:-https://$ssh_host}"

  log_info "Running bot setup..."
  MINIAPP_URL="${TELEGRAM_MINI_APP_URL:-https://$ssh_host}" \
    "$SCRIPT_DIR/setup-bot.sh" || log_warn "Bot setup failed — run scripts/setup-bot.sh manually"
}

run_bot_setup() {
  log_section "Telegram Bot Auto-Setup"

  if [[ -n "${TELEGRAM_BOT_TOKEN:-}" ]] && [[ -n "${TELEGRAM_MINI_APP_URL:-}" ]]; then
    log_info "Running bot auto-setup..."
    "$SCRIPT_DIR/setup-bot.sh" || log_warn "Bot setup failed — run scripts/setup-bot.sh manually"
  else
    log_warn "TELEGRAM_BOT_TOKEN or TELEGRAM_MINI_APP_URL not set."
    log_info  "Run ./scripts/setup-bot.sh once your server is live to configure the bot."
  fi
}

# ── Main ───────────────────────────────────────────────────────────────────────
main() {
  local mode="${1:-static}"

  echo ""
  echo -e "${CYAN}  TON AI Agent — Mini App Deployment (${mode})${NC}"
  echo ""

  load_env

  case "$mode" in
    static)     deploy_static ;;
    vercel)     deploy_vercel;   run_bot_setup ;;
    cloudflare) deploy_cloudflare; run_bot_setup ;;
    docker)     deploy_docker;   run_bot_setup ;;
    php)        deploy_php ;;  # includes bot setup internally
    *)
      log_error "Unknown deployment mode: $mode"
      echo ""
      echo "Available modes:"
      echo "  static      - Print instructions for uploading to any static host"
      echo "  vercel      - Deploy to Vercel (requires Vercel CLI)"
      echo "  cloudflare  - Deploy to Cloudflare Pages (requires Wrangler CLI)"
      echo "  docker      - Deploy via Docker + Nginx"
      echo "  php         - Sync PHP backend to a remote server via rsync/SSH"
      exit 1
      ;;
  esac
}

main "$@"
