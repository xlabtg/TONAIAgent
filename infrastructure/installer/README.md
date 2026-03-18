# TON AI Agent - Professional One-Click Installer

A professional, secure, one-click installer for deploying the TON AI Agent platform on shared hosting environments.

## Features

- **One-Click Installation**: Complete setup in under 10 minutes
- **Multi-Language Support**: English, Russian, Chinese, Arabic
- **Auto-Configuration**: Automatic Telegram bot setup, webhook configuration, and database initialization
- **Security First**: CSRF protection, rate limiting, encrypted credentials, secure session handling
- **AI Provider Support**: Groq, OpenAI, Anthropic with automatic fallback
- **TON Integration**: Full blockchain connectivity setup

## Requirements

- PHP 8.1 or higher
- MySQL 8.0+ or MariaDB 10.5+
- HTTPS enabled (required for Telegram Mini Apps)
- Required PHP extensions:
  - curl
  - mbstring
  - openssl
  - PDO
  - pdo_mysql
  - json

## Installation

### Quick Start

1. **Download** the installer package
2. **Upload** all files to your web server
3. **Navigate** to `https://your-domain.com/installer/`
4. **Follow** the 9-step wizard
5. **Delete** the `/installer` directory when complete

### Manual Installation

```bash
# Upload files to your server
unzip tonaiagent-installer.zip

# Set permissions
chmod 755 installer/
chmod 755 telegram-miniapp/
chmod 755 telegram-miniapp/app/

# Open in browser
https://your-domain.com/installer/
```

## Installation Steps

| Step | Name | Description |
|------|------|-------------|
| 1 | Requirements | Validates server environment |
| 2 | Database | Configures MySQL connection and creates tables |
| 3 | Telegram Bot | Validates bot token and sets commands |
| 4 | Mini App | Configures Telegram Mini App settings |
| 5 | AI Providers | Sets up Groq, OpenAI, or Anthropic |
| 6 | TON Blockchain | Configures TON network and RPC |
| 7 | Security | Generates secrets and configures protection |
| 8 | Admin | Creates administrator account |
| 9 | Complete | Shows success and next steps |

## Directory Structure

```
installer/
├── index.php           # Main installer entry point
├── README.md           # This file
├── steps/              # Step handlers (PHP logic)
│   ├── step1.php       # Requirements check
│   ├── step2.php       # Database setup
│   ├── step3.php       # Telegram bot
│   ├── step4.php       # Mini App setup
│   ├── step5.php       # AI providers
│   ├── step6.php       # TON blockchain
│   ├── step7.php       # Security
│   ├── step8.php       # Admin account
│   └── step9.php       # Completion
├── templates/          # Step templates (HTML/UI)
│   ├── step1.php
│   ├── step2.php
│   ├── step3.php
│   ├── step4.php
│   ├── step5.php
│   ├── step6.php
│   ├── step7.php
│   ├── step8.php
│   └── step9.php
├── lang/               # Localization files
│   ├── en.php          # English
│   ├── ru.php          # Russian
│   ├── zh.php          # Chinese
│   └── ar.php          # Arabic
└── assets/             # CSS/JS assets (optional)
```

## Security Notes

- **Delete the installer** directory immediately after installation
- Configuration files are stored outside the public directory
- All sensitive data is encrypted
- CSRF protection is enabled by default
- Rate limiting prevents abuse
- Webhook signatures are validated

## Localization

The installer supports 4 languages:
- English (default)
- Russian
- Chinese (Simplified)
- Arabic (RTL supported)

Switch languages using the dropdown in the top-right corner.

## Troubleshooting

### Database Connection Failed
- Verify MySQL/MariaDB is running
- Check hostname (usually `localhost`)
- Verify username and password
- Ensure database user has CREATE privileges

### Telegram Bot Token Invalid
- Get a new token from [@BotFather](https://t.me/BotFather)
- Ensure no extra spaces in the token
- Check the bot hasn't been deleted

### HTTPS Warning
- Install an SSL certificate (Let's Encrypt is free)
- Telegram Mini Apps require HTTPS
- Contact your hosting provider for assistance

### Permission Errors
```bash
chmod 755 telegram-miniapp/
chmod 755 telegram-miniapp/app/
chmod 600 telegram-miniapp/app/config.php
```

## Post-Installation

1. **Configure Mini App in BotFather**
   - Open @BotFather
   - Select your bot
   - Go to Bot Settings > Menu Button
   - Set your Mini App URL

2. **Delete Installer**
   ```bash
   rm -rf installer/
   ```

3. **Test Your Mini App**
   - Open your bot in Telegram
   - Send /start
   - Open the Mini App

## Support

- GitHub: [xlabtg/TONAIAgent](https://github.com/xlabtg/TONAIAgent)
- Telegram: [@tonaiagent](https://t.me/tonaiagent)

## License

MIT License - See LICENSE file for details.
