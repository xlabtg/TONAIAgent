# Deployment

TONAIAgent supports multiple deployment options from simple shared PHP hosting to enterprise cloud infrastructure.

## Quick Comparison

| Platform | Deploy Time | Best For |
|---|---|---|
| **PHP Hosting (Installer)** | < 5 min | MVP, personal use, shared hosting |
| **Vercel** | < 2 min | Frontend, Mini App, serverless functions |
| **Docker** | < 5 min | Self-hosted, local development |
| **AWS** | 5–10 min | Full backend, production |
| **Kubernetes** | 10–15 min | Enterprise, multi-region |

## Prerequisites

```bash
node >= 18.0.0
npm >= 8.0.0
PHP >= 8.0        # for PHP hosting / Telegram Mini App backend
MySQL >= 8.0      # or MariaDB >= 10.3
```

Telegram Mini Apps require HTTPS. Obtain an SSL certificate before deploying.

## Local Development

```bash
git clone https://github.com/xlabtg/TONAIAgent.git
cd TONAIAgent
npm install
npm test
```

## PHP Hosting (Recommended for MVP)

The platform includes a web-based installer for standard shared PHP hosting:

1. Upload the `installer/` folder to your server
2. Open `https://yourdomain.com/installer/` in a browser
3. Follow the setup wizard:
   - Configure database credentials
   - Enter your Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
   - Set the Telegram webhook URL
   - Complete environment configuration
4. The installer configures the platform automatically

### Required Server Configuration

- Apache with `mod_rewrite` enabled, or Nginx with `try_files`
- HTTPS (required for Telegram Mini Apps)
- MySQL database with create/alter privileges

## Vercel

See [deploy/vercel/README.md](../deploy/vercel/README.md) for full Vercel deployment instructions.

One-click deploy:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/xlabtg/TONAIAgent)

## Docker

```bash
cd deploy/docker
docker-compose up -d
```

See [deploy/docker/README.md](../deploy/docker/README.md) for full Docker instructions.

## AWS

See [deploy/aws/README.md](../deploy/aws/README.md) for Terraform and CloudFormation instructions.

## Kubernetes

See [deploy/kubernetes/README.md](../deploy/kubernetes/README.md) for Kubernetes manifests and Helm chart instructions.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram bot token from @BotFather |
| `GROQ_API_KEY` | Yes | Groq API key for AI model access |
| `TON_NETWORK` | Yes | `mainnet` or `testnet` |
| `DATABASE_URL` | Yes | MySQL/MariaDB connection string |

## Full Cloud Deployment Documentation

See [deploy/README.md](../deploy/README.md) for the complete cloud deployment guide including monitoring, scaling, and CI/CD pipeline setup.
