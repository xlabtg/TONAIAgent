# TON AI Agent - Telegram Mini App

A production-ready Telegram Mini App for deploying autonomous AI trading agents on TON blockchain. This package includes both static HTML and PHP backend options for maximum deployment flexibility.

## Features

- **Telegram Native**: Full Telegram WebApp API integration
- **Mobile-First Design**: Optimized for Telegram's mobile interface
- **Multi-Language**: English, Russian, Chinese support
- **Secure Backend**: CSRF protection, input sanitization, prepared statements
- **AI Integration**: Server-side AI calls (Groq, OpenAI, Anthropic)
- **Non-Custodial**: Users control their own wallets

## Telegram Mini App Deployment

### Bot setup (one command)

```bash
# Copy and fill in your credentials
cp .env.example .env && nano .env

# Validate bot token, register webhook, set menu button & commands
./scripts/setup-bot.sh
```

The script will:
- Validate your bot token with the Telegram API
- Remove any stale webhook
- Register a new webhook at `<TELEGRAM_MINI_APP_URL>/webhook`
- Set the menu button so users can open the Mini App directly
- Register bot commands (`/start`, `/app`, `/portfolio`, `/agents`, `/strategies`)
- Set bot description

Required variables in `.env` (or exported environment variables):

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_MINI_APP_URL` | Public HTTPS URL where the Mini App is hosted |
| `TELEGRAM_WEBHOOK_SECRET` | Optional secret for webhook request validation |

### One-command deployment

```bash
./scripts/deploy-miniapp.sh [mode]
```

| Mode | Description |
|---|---|
| `static` (default) | Print upload instructions + local preview server |
| `vercel` | Deploy to Vercel with `vercel` CLI |
| `cloudflare` | Deploy to Cloudflare Pages with `wrangler` CLI |
| `docker` | Run Mini App locally via Docker + Nginx |
| `php` | Sync PHP backend to a remote server via rsync/SSH |

After a successful deploy, each mode (except `static`) automatically calls `setup-bot.sh` to wire up the Telegram bot.

### Mini App launch flow

```
User opens Telegram
  ↓
Clicks menu button  OR  follows t.me/<bot>?startapp
  ↓
Telegram opens Mini App URL
  ↓
telegram-webapp.js calls tg.ready() then tg.expand()
  ↓
Telegram theme colours applied → CSS variables updated
  ↓
tg:ready event fired → app.js loads user session
  ↓
POST /api/auth — initData validated server-side
  ↓
Dashboard loads with portfolio & agent data
```

### Deep links

```
# Launch Mini App from any chat
https://t.me/<bot_username>?startapp

# Direct Mini App button (requires /newapp in @BotFather)
https://t.me/<bot_username>/app

# Deep link with start parameter
https://t.me/<bot_username>?startapp=strategy_123
```

Access the `start_param` value in JavaScript:

```javascript
const startParam = window.TelegramMiniApp.getStartParam();
// or: window.Telegram.WebApp.initDataUnsafe.start_param
```

### Production hosting

The Mini App works with any HTTPS-capable static host.

| Host | Method |
|---|---|
| Vercel | `./scripts/deploy-miniapp.sh vercel` |
| Cloudflare Pages | `./scripts/deploy-miniapp.sh cloudflare` |
| Netlify | Drag-and-drop `public/` or connect repo; set publish directory to `telegram-miniapp/public` |
| GitHub Pages | Push `public/` contents to `gh-pages` branch |
| Nginx / Apache | Upload `public/` and point document root there |
| Docker | `./scripts/deploy-miniapp.sh docker` |

> **HTTPS required.** Telegram Mini Apps and webhooks must be served over HTTPS.

---

## Quick Start

### Option 1: Static HTML Only (No Backend)

For demo or testing purposes, you can run the Mini App without a backend:

1. Upload contents of `public/` to any web server
2. Point your domain to the directory
3. Configure as Telegram Mini App URL in @BotFather

Works with: Nginx, Apache, GitHub Pages, Netlify, Cloudflare Pages

### Option 2: Full PHP Installation

For production use with user accounts, agents, and AI features:

1. Upload all files to a PHP 8.0+ server
2. Open `install.php` in your browser
3. Follow the installation wizard
4. Delete `install.php` after completion

## Requirements

### Server Requirements

- PHP 8.0 or higher
- MySQL 8.0+ or MariaDB 10.5+
- HTTPS (required for Telegram Mini Apps)
- Extensions: PDO, cURL, JSON, OpenSSL, mbstring

### Telegram Setup

1. Create a bot with [@BotFather](https://t.me/BotFather)
2. Enable "Inline Mode" and "Web App"
3. Set your Mini App URL
4. Configure webhook (optional)

## Directory Structure

```
telegram-miniapp/
├── app/                    # PHP backend (outside public root)
│   ├── config.php         # Configuration (NEVER commit with secrets!)
│   ├── db.php             # Database connection
│   ├── security.php       # Security utilities
│   ├── telegram.php       # Telegram API integration
│   └── ai.php             # AI provider integration
├── public/                 # Web root
│   ├── index.html         # Static Mini App
│   ├── index.php          # PHP entry point with routing
│   ├── .htaccess          # Apache configuration
│   ├── css/
│   │   └── miniapp.css    # Styles with Telegram theme support
│   ├── js/
│   │   ├── telegram-webapp.js  # Telegram WebApp wrapper
│   │   └── app.js         # Application logic
│   └── assets/
│       └── favicon.svg    # TON logo favicon
├── database.sql           # Database schema
├── .env.example           # Environment variables template
├── install.php            # One-click installer
└── README.md
```

## Configuration

### Using Config File

Copy and edit the configuration:

```bash
cp app/config.php.example app/config.php
chmod 600 app/config.php
```

### Using Environment Variables

Create `.env` file from template:

```bash
cp .env.example .env
```

Key configuration options:

| Variable | Description |
|----------|-------------|
| `APP_URL` | Your Mini App URL |
| `DB_*` | Database credentials |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather |
| `GROQ_API_KEY` | AI provider API key |

## Security Features

### CSRF Protection
All forms include CSRF tokens that are validated server-side.

### Input Sanitization
All user input is sanitized before use:
```php
$name = Security::sanitizeString($_POST['name'], 100);
$amount = Security::sanitizeFloat($_POST['amount']);
```

### Prepared Statements
All database queries use PDO prepared statements:
```php
Database::execute('SELECT * FROM users WHERE id = :id', ['id' => $userId]);
```

### Telegram Signature Verification
WebApp init data is cryptographically verified:
```php
if (!Telegram::verifyWebAppData($initData)) {
    // Invalid signature
}
```

### Rate Limiting
API endpoints are rate-limited per IP/user:
```php
if (!Security::checkRateLimit()) {
    // Too many requests
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth` | Authenticate with Telegram init data |
| POST | `/api/user` | Get current user data |
| POST | `/api/agents` | List/create/update agents |
| POST | `/api/strategies` | List available strategies |
| POST | `/api/ai/chat` | AI assistant (server-side) |
| POST | `/webhook` | Telegram webhook handler |
| GET | `/health` | Health check |

## Telegram Mini App Integration

### Initialize WebApp

```javascript
// telegram-webapp.js handles this automatically
window.TelegramMiniApp.init();
```

### Access User Data

```javascript
const user = TelegramMiniApp.getUser();
console.log(user.first_name);
```

### Show Main Button

```javascript
TelegramMiniApp.showMainButton('Deploy Agent', () => {
    // Handle click
});
```

### Haptic Feedback

```javascript
TelegramMiniApp.haptic.impactOccurred('light');
TelegramMiniApp.haptic.notificationOccurred('success');
```

## Deep Linking

Users can open the Mini App with parameters:

```
https://t.me/your_bot/app?startapp=strategy_123
```

Handle in JavaScript:
```javascript
const startParam = window.Telegram.WebApp.initDataUnsafe.start_param;
```

## Production Checklist

- [ ] HTTPS configured
- [ ] `install.php` deleted
- [ ] Config file permissions set (chmod 600)
- [ ] Database credentials secured
- [ ] AI API keys configured
- [ ] Telegram webhook set
- [ ] Error logging enabled
- [ ] Rate limiting configured
- [ ] Backups configured

## Troubleshooting

### "Invalid signature" error
- Verify bot token is correct
- Check that init data is being sent properly
- Ensure server time is synchronized

### Database connection failed
- Check credentials in config.php
- Verify MySQL is running
- Check firewall rules

### AI not responding
- Verify API key is valid
- Check rate limits
- Review error logs

## Support

- GitHub Issues: https://github.com/xlabtg/TONAIAgent/issues
- Telegram: https://t.me/xlab_tg

## License

MIT License - TON AI Agent Team
