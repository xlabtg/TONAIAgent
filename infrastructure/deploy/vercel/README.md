# TON AI Agent - Vercel Deployment

Deploy the TON AI Agent platform to Vercel with one click.

## One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/xlabtg/TONAIAgent&project-name=ton-ai-agent&repository-name=ton-ai-agent&env=TELEGRAM_BOT_TOKEN,GROQ_API_KEY,TON_NETWORK&envDescription=Required%20environment%20variables%20for%20TON%20AI%20Agent&envLink=https://github.com/xlabtg/TONAIAgent/blob/main/deploy/vercel/README.md)

## Features

- **Zero Configuration**: Auto-detects Next.js and deploys
- **Global CDN**: Deployed to 100+ edge locations
- **Serverless Functions**: API routes run as Edge Functions
- **Auto SSL**: HTTPS enabled automatically
- **Preview Deployments**: Every PR gets a unique URL
- **Cron Jobs**: Scheduled tasks for health checks and strategies

## Prerequisites

- Vercel account (free tier available)
- GitHub account (for repository integration)
- Telegram bot token from [@BotFather](https://t.me/BotFather)
- Groq API key from [console.groq.com](https://console.groq.com)

## Deployment Methods

### Method 1: One-Click Button

1. Click the "Deploy with Vercel" button above
2. Connect your GitHub account
3. Enter required environment variables
4. Deploy!

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
cd /path/to/TONAIAgent
vercel --prod

# Set environment variables
vercel env add TELEGRAM_BOT_TOKEN
vercel env add GROQ_API_KEY
vercel env add TON_NETWORK
```

### Method 3: GitHub Integration

1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Configure environment variables
4. Enable automatic deployments

## Environment Variables

Configure these in your Vercel project settings:

### Required

| Variable | Description | How to Get |
|----------|-------------|------------|
| `TELEGRAM_BOT_TOKEN` | Bot token | Create bot via [@BotFather](https://t.me/BotFather) |
| `GROQ_API_KEY` | AI provider key | [console.groq.com](https://console.groq.com) |
| `TON_NETWORK` | TON network | `mainnet` or `testnet` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Fallback AI | - |
| `OPENAI_API_KEY` | Fallback AI | - |
| `DATABASE_URL` | PostgreSQL (Vercel Postgres) | - |
| `TON_RPC_ENDPOINT` | Custom RPC | auto-detected |

## Vercel Postgres Setup

For persistent data, add Vercel Postgres:

1. Go to your Vercel project
2. Navigate to Storage tab
3. Create a new Postgres database
4. Environment variables are automatically added

## API Routes Structure

```
api/
├── health.ts              # Health check endpoint
├── telegram/
│   └── webhook.ts         # Telegram webhook handler
├── agents/
│   ├── index.ts           # List/create agents
│   └── [id].ts            # Get/update/delete agent
├── strategies/
│   ├── index.ts           # List strategies
│   └── [id].ts            # Strategy details
├── ai/
│   └── chat.ts            # AI chat endpoint
└── cron/
    ├── health.ts          # Scheduled health check
    └── strategies.ts      # Strategy execution
```

## Telegram Webhook Setup

After deployment, configure your Telegram bot webhook:

```bash
# Replace YOUR_BOT_TOKEN and YOUR_VERCEL_URL
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR_VERCEL_URL/api/telegram/webhook"}'
```

Or use the deployment script:

```bash
npx tonaiagent-cli webhook set --url https://your-vercel-url.vercel.app
```

## Edge Functions

The following endpoints run as Edge Functions for lowest latency:

- `/api/health` - Health check
- `/api/telegram/webhook` - Telegram updates

Configure in `vercel.json`:

```json
{
  "functions": {
    "api/health.ts": {
      "runtime": "edge"
    }
  }
}
```

## Cron Jobs

Vercel Cron runs scheduled tasks:

| Job | Schedule | Purpose |
|-----|----------|---------|
| Health Check | Every 5 min | Monitor system health |
| Strategy Tick | Every 15 min | Execute scheduled strategies |

## Custom Domain

1. Go to your Vercel project settings
2. Navigate to Domains
3. Add your custom domain
4. Configure DNS as instructed
5. SSL is automatically provisioned

## Monitoring

### Built-in Analytics

Vercel provides:
- Request analytics
- Edge request logs
- Function execution logs
- Error tracking

### Custom Monitoring

Add Vercel-compatible monitoring:

```typescript
// api/health.ts
import { track } from '@vercel/analytics';

export default function handler(req, res) {
  track('health_check', { status: 'ok' });
  res.json({ status: 'healthy' });
}
```

## Troubleshooting

### Webhook Not Receiving Updates

1. Verify webhook URL is correct
2. Check Vercel function logs
3. Ensure bot token is valid
4. Verify HTTPS is enabled

### Function Timeout

Increase timeout in `vercel.json`:

```json
{
  "functions": {
    "api/ai/chat.ts": {
      "maxDuration": 60
    }
  }
}
```

### Environment Variables Not Working

1. Verify variables are set in Vercel dashboard
2. Redeploy after adding variables
3. Check variable names match exactly

## Cost Estimation

| Tier | Monthly Requests | Cost |
|------|------------------|------|
| Hobby | 100K | Free |
| Pro | 1M | $20/mo |
| Enterprise | Unlimited | Custom |

## Migration from Other Platforms

### From Railway/Render

1. Export environment variables
2. Connect GitHub to Vercel
3. Import environment variables
4. Deploy

### From AWS

1. Extract environment configuration
2. Deploy frontend to Vercel
3. Keep backend on AWS (optional)
4. Update API endpoints

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Serverless Functions](https://vercel.com/docs/functions)
- [Edge Functions](https://vercel.com/docs/functions/edge-functions)
