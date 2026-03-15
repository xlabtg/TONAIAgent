# TON AI Agent - Cloud Deployment System

Production-grade, one-click cloud deployment for the TON AI Agent platform.

## Quick Start

| Platform | Deploy Time | Scalability | Best For |
|----------|-------------|-------------|----------|
| **Vercel** | < 2 min | Auto | Frontend, Mini App, Serverless |
| **AWS** | 5-10 min | Enterprise | Full Backend, Production |
| **Docker** | < 5 min | Medium | Self-hosted, Development |
| **Kubernetes** | 10-15 min | Maximum | Enterprise, Multi-region |

## One-Click Deploy Buttons

### Vercel (Frontend + Serverless)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/xlabtg/TONAIAgent&project-name=ton-ai-agent&repository-name=ton-ai-agent&env=TELEGRAM_BOT_TOKEN,GROQ_API_KEY,TON_NETWORK)

### AWS (Full Stack)

[![Launch Stack](https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?stackName=tonaiagent&templateURL=https://tonaiagent-deploy.s3.amazonaws.com/cloudformation/main.yaml)

### Railway (Simple Cloud)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/tonaiagent)

## Directory Structure

```
deploy/
├── vercel/                 # Vercel deployment
│   ├── vercel.json         # Vercel configuration
│   ├── api/                # Serverless API functions
│   └── README.md           # Vercel-specific docs
│
├── aws/                    # AWS deployment
│   ├── terraform/          # Terraform IaC
│   ├── cdk/                # AWS CDK (TypeScript)
│   ├── cloudformation/     # CloudFormation templates
│   └── README.md           # AWS-specific docs
│
├── docker/                 # Docker deployment
│   ├── Dockerfile          # Main application
│   ├── Dockerfile.worker   # Background workers
│   ├── docker-compose.yml  # Full stack compose
│   ├── docker-compose.dev.yml  # Development
│   └── README.md           # Docker-specific docs
│
├── kubernetes/             # Kubernetes deployment
│   ├── helm/               # Helm charts
│   ├── manifests/          # Raw Kubernetes manifests
│   └── README.md           # K8s-specific docs
│
├── monitoring/             # Observability stack
│   ├── prometheus/         # Metrics collection
│   ├── grafana/            # Dashboards
│   └── README.md           # Monitoring setup
│
├── secrets/                # Secrets management
│   ├── vault/              # HashiCorp Vault
│   ├── aws-secrets/        # AWS Secrets Manager
│   └── README.md           # Secrets setup
│
├── cli/                    # CLI deployment tool
│   ├── src/                # CLI source code
│   ├── package.json        # CLI dependencies
│   └── README.md           # CLI usage
│
├── github-actions/         # CI/CD pipelines
│   └── *.yml               # Workflow files
│
└── scripts/                # Deployment scripts
    ├── deploy.sh           # Main deploy script
    ├── validate.sh         # Validation script
    └── health-check.sh     # Health checks
```

## Supported Platforms

### Tier 1: Production Ready

| Platform | Status | Documentation |
|----------|--------|---------------|
| Vercel | Production | [vercel/README.md](vercel/README.md) |
| AWS (ECS/Fargate) | Production | [aws/README.md](aws/README.md) |
| Docker Compose | Production | [docker/README.md](docker/README.md) |
| Kubernetes | Production | [kubernetes/README.md](kubernetes/README.md) |

### Tier 2: Community Supported

| Platform | Status | Notes |
|----------|--------|-------|
| Railway | Beta | Simple cloud deploy |
| Fly.io | Beta | Edge deployment |
| Render | Beta | Auto-scaling |
| DigitalOcean App Platform | Planned | Coming soon |

### Tier 3: Future

| Platform | Status | Notes |
|----------|--------|-------|
| TON Cloud | Research | Native TON hosting |
| Decentralized Compute | Vision | On-chain infrastructure |

## Environment Variables

All deployment methods require these core environment variables:

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | `123456:ABC-DEF...` |
| `GROQ_API_KEY` | Primary AI provider | `gsk_...` |
| `TON_NETWORK` | TON network | `mainnet` or `testnet` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Fallback AI | - |
| `OPENAI_API_KEY` | Fallback AI | - |
| `DATABASE_URL` | PostgreSQL connection | - |
| `REDIS_URL` | Redis connection | - |
| `TON_RPC_ENDPOINT` | Custom TON RPC | auto |
| `LOG_LEVEL` | Logging verbosity | `info` |

## Deployment Comparison

| Feature | Vercel | AWS | Docker | K8s |
|---------|--------|-----|--------|-----|
| Setup Time | 2 min | 10 min | 5 min | 15 min |
| Auto-Scaling | Yes | Yes | Manual | Yes |
| SSL/TLS | Auto | ACM | Manual | Cert-Manager |
| CDN | Built-in | CloudFront | External | Ingress |
| Cost | Free tier | ~$50+/mo | Self-hosted | Self-hosted |
| Maintenance | Zero | Medium | High | High |
| Best For | Frontend | Enterprise | Dev/Small | Enterprise |

## Quick Deployment Guide

### Option 1: Vercel (Fastest)

```bash
# Using CLI
npx vercel --prod

# Or deploy button above
```

### Option 2: Docker Compose (Self-hosted)

```bash
cd deploy/docker
cp .env.example .env
# Edit .env with your values
docker compose up -d
```

### Option 3: AWS (Production)

```bash
cd deploy/aws/terraform
terraform init
terraform apply
```

### Option 4: Kubernetes (Enterprise)

```bash
cd deploy/kubernetes/helm
helm install tonaiagent ./tonaiagent \
  --namespace tonaiagent \
  --create-namespace \
  -f values.yaml
```

## Post-Deployment

After deployment, validate your installation:

```bash
# Using the validation script
./deploy/scripts/validate.sh https://your-domain.com

# Or use the CLI
npx tonaiagent-cli validate --url https://your-domain.com
```

### Validation Checks

- [ ] Telegram bot responds to /start
- [ ] AI provider connectivity
- [ ] TON RPC connectivity
- [ ] Database connectivity (if applicable)
- [ ] Health endpoint returns 200

## CI/CD Integration

Copy GitHub Actions workflows to your repository:

```bash
cp deploy/github-actions/*.yml .github/workflows/
```

Available workflows:
- `deploy-vercel.yml` - Vercel deployment
- `deploy-aws.yml` - AWS ECS deployment
- `build-docker.yml` - Docker image build
- `deploy-k8s.yml` - Kubernetes deployment

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Enable HTTPS** - Required for Telegram Mini Apps
3. **Rotate keys regularly** - Use secrets management
4. **Enable rate limiting** - Protect API endpoints
5. **Monitor alerts** - Set up observability

## Support

- GitHub Issues: https://github.com/xlabtg/TONAIAgent/issues
- Telegram: https://t.me/xlab_tg
- Documentation: https://docs.tonaiagent.io

## License

MIT License - See LICENSE file for details.
