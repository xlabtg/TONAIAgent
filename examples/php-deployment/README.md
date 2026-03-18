# TON AI Agent - PHP Deployment Package

A production-ready PHP deployment package for TON AI Agent with Telegram Mini App integration.

## Features

- **PHP 8.0+ Backend** - Modern PHP with secure routing and API handling
- **Telegram Mini App Integration** - Native deep linking and authentication
- **Secure Configuration** - All secrets stored outside public directory
- **Database Ready** - MySQL/MariaDB schema with migrations
- **One-Click Installer** - Easy setup wizard
- **Security First** - CSRF, rate limiting, prepared statements, input sanitization

## Requirements

### Minimum Server Requirements

- PHP 8.0 or higher
- MySQL 8.0+ or MariaDB 10.3+
- HTTPS (required for Telegram Mini Apps)
- Apache with mod_rewrite or Nginx

### Required PHP Extensions

- pdo, pdo_mysql
- json
- mbstring
- openssl
- curl

### Optional PHP Extensions

- redis (for caching)
- memcached (for caching)
- imagick (for image processing)

## Quick Start

### Option 1: One-Click Installer (Recommended)

1. Upload all files to your server
2. Navigate to `https://your-domain.com/installer.php`
3. Follow the installation wizard
4. Delete `installer.php` after installation

### Option 2: Manual Installation

1. **Upload Files**
   ```bash
   # Upload the php-app directory to your server
   scp -r php-app/* user@server:/var/www/tonaiagent/
   ```

2. **Create Database**
   ```sql
   CREATE DATABASE tonaiagent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'tonai_user'@'localhost' IDENTIFIED BY 'secure_password';
   GRANT ALL PRIVILEGES ON tonaiagent.* TO 'tonai_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your settings
   ```

4. **Import Database Schema**
   ```bash
   mysql -u tonai_user -p tonaiagent < database/schema.sql
   ```

5. **Set Permissions**
   ```bash
   chmod 755 storage
   chmod 755 storage/logs
   chmod 644 .env
   ```

6. **Configure Web Server**
   - Point document root to `/public` directory
   - Ensure `.htaccess` is enabled (Apache)
   - Or configure Nginx (see below)

## Directory Structure

```
php-app/
├── app/                    # Application files (OUTSIDE public)
│   ├── config.php         # Main configuration
│   ├── db.php             # Database connection
│   ├── security.php       # Security utilities
│   ├── router.php         # URL routing
│   ├── telegram.php       # Telegram Bot & Mini App
│   └── ai.php             # AI provider integration
├── public/                 # Public web root
│   ├── index.php          # Entry point
│   ├── .htaccess          # Apache configuration
│   ├── installer.php      # Setup wizard (DELETE after install)
│   ├── views/             # PHP views
│   │   ├── home.php       # Homepage
│   │   └── app.php        # Mini App
│   └── assets/            # Static assets
│       ├── css/
│       ├── js/
│       └── images/
├── database/
│   └── schema.sql         # Database schema
├── storage/
│   └── logs/              # Application logs
├── .env.example           # Environment template
└── README.md              # This file
```

## Configuration

### Environment Variables

All configuration is done via the `.env` file. Key settings:

```env
# Application
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

# Database
DB_HOST=localhost
DB_DATABASE=tonaiagent
DB_USERNAME=tonai_user
DB_PASSWORD=secure_password

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=YourBotName
TELEGRAM_MINI_APP_URL=https://your-domain.com/app

# AI (Groq primary, OpenAI/Anthropic fallback)
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### Telegram Bot Setup

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Set the Mini App URL in Bot Settings
3. Configure webhook:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-domain.com/api/webhook/telegram&secret_token=<SECRET>"
   ```

## Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    root /var/www/tonaiagent/public;
    index index.php;

    # SSL Configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Handle all requests through index.php
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP processing
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Deny access to sensitive files
    location ~ /\.(env|ht) {
        deny all;
    }

    # Cache static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## API Endpoints

### Authentication

- `POST /api/auth/telegram` - Authenticate via Telegram Mini App
- `POST /api/auth/verify` - Verify session token

### Strategies

- `GET /api/strategies` - List all strategies
- `GET /api/strategies/{id}` - Get strategy details

### AI Assistant

- `POST /api/ai/chat` - Chat with AI assistant
- `POST /api/ai/recommend` - Get strategy recommendations

### Deep Links

- `GET /api/links/referral/{userId}` - Generate referral link
- `GET /api/links/strategy/{strategyId}` - Generate strategy share link

### Webhook

- `POST /api/webhook/telegram` - Telegram bot webhook

## Security Checklist

- [ ] HTTPS enabled (required for Telegram)
- [ ] `.env` file not accessible via browser
- [ ] `installer.php` deleted after setup
- [ ] Database credentials are secure
- [ ] API keys are not exposed in frontend
- [ ] Rate limiting is enabled
- [ ] CSRF protection is enabled
- [ ] Log directory is not publicly accessible

## Telegram Mini App Deep Linking

The app supports various deep link parameters:

| Link Format | Description |
|-------------|-------------|
| `t.me/BotName?startapp=ref_123` | Referral link |
| `t.me/BotName?startapp=strategy_dca` | Strategy share |
| `t.me/BotName?startapp=agent_456` | Agent share |

## Deployment Checklist

1. [ ] Upload files to server
2. [ ] Create and configure `.env`
3. [ ] Create database and user
4. [ ] Import `database/schema.sql`
5. [ ] Set directory permissions
6. [ ] Configure web server
7. [ ] Enable HTTPS
8. [ ] Set up Telegram bot webhook
9. [ ] Test Mini App in Telegram
10. [ ] Delete `installer.php`
11. [ ] Enable monitoring

## Troubleshooting

### Common Issues

**500 Internal Server Error**
- Check PHP error logs
- Verify file permissions
- Ensure `.htaccess` is being read

**Database Connection Failed**
- Verify database credentials in `.env`
- Check MySQL is running
- Ensure PDO extension is loaded

**Telegram Auth Failed**
- Verify bot token is correct
- Check webhook is configured
- Ensure HTTPS is working

**Mini App Not Loading**
- Verify Mini App URL in Bot settings
- Check HTTPS certificate is valid
- Inspect browser console for errors

## Support

- Documentation: https://github.com/xlabtg/TONAIAgent
- Telegram: https://t.me/tonaiagent
- Issues: https://github.com/xlabtg/TONAIAgent/issues

## License

MIT License - TON AI Agent Team
