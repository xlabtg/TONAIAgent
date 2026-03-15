# TON AI Agent - Docker Deployment

Deploy TON AI Agent using Docker and Docker Compose.

## Quick Start

```bash
# Clone repository
git clone https://github.com/xlabtg/TONAIAgent.git
cd TONAIAgent/deploy/docker

# Configure environment
cp .env.example .env
# Edit .env with your values

# Start all services
docker compose up -d

# View logs
docker compose logs -f app

# Stop services
docker compose down
```

## Files Overview

| File | Purpose |
|------|---------|
| `Dockerfile` | Main application image |
| `Dockerfile.worker` | Background worker image |
| `docker-compose.yml` | Production deployment |
| `docker-compose.dev.yml` | Development deployment |
| `.env.example` | Environment variables template |
| `init-db.sql` | Database initialization |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Traefik                              │
│                    (Reverse Proxy)                          │
│                   :80 → :443 (TLS)                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│      App      │   │    Worker     │   │    Worker     │
│   (Node.js)   │   │  (Node.js)    │   │  (Node.js)    │
│    :3000      │   │  Background   │   │  Background   │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   PostgreSQL  │   │     Redis     │   │  (Optional)   │
│   (Database)  │   │    (Cache)    │   │   Monitoring  │
│    :5432      │   │    :6379      │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
```

## Services

### Core Services

| Service | Port | Description |
|---------|------|-------------|
| `app` | 3000 | Main application |
| `worker` | - | Background tasks |
| `postgres` | 5432 | PostgreSQL database |
| `redis` | 6379 | Redis cache |

### Optional Services

| Service | Port | Description |
|---------|------|-------------|
| `traefik` | 80, 443 | Reverse proxy with TLS |
| `adminer` | 8080 | Database GUI (dev only) |
| `redis-commander` | 8081 | Redis GUI (dev only) |

## Configuration

### Required Environment Variables

```bash
# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token

# AI Provider
GROQ_API_KEY=your-groq-api-key

# TON Network
TON_NETWORK=mainnet
```

### Optional Environment Variables

```bash
# Fallback AI providers
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Database (defaults provided)
DB_USER=tonaiagent
DB_PASSWORD=secret
DB_NAME=tonaiagent

# Scaling
WORKER_REPLICAS=2

# Production domain
DOMAIN=tonaiagent.example.com
ACME_EMAIL=admin@example.com
```

## Development Mode

Use the development compose file for hot reload and debugging tools:

```bash
docker compose -f docker-compose.dev.yml up
```

Development features:
- Hot reload for code changes
- Adminer for database management (localhost:8080)
- Redis Commander for cache inspection (localhost:8081)
- Debug logging enabled

## Production Deployment

### Prerequisites

- Docker Engine 24+
- Docker Compose v2+
- Domain with DNS configured
- SSL certificate (or use Let's Encrypt via Traefik)

### Steps

1. **Prepare server**

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone repository
git clone https://github.com/xlabtg/TONAIAgent.git
cd TONAIAgent/deploy/docker
```

2. **Configure environment**

```bash
cp .env.example .env
nano .env  # Edit with your production values
```

3. **Generate secure credentials**

```bash
# Generate database password
openssl rand -base64 24

# Generate encryption key
openssl rand -hex 32

# Generate JWT secret
openssl rand -base64 32
```

4. **Start services**

```bash
# With Traefik (recommended for production)
docker compose --profile production up -d

# Without Traefik (if using external reverse proxy)
docker compose up -d
```

5. **Verify deployment**

```bash
# Check service health
docker compose ps

# View logs
docker compose logs -f

# Test health endpoint
curl http://localhost:3000/health
```

### Scaling Workers

```bash
# Scale workers
docker compose up -d --scale worker=4

# Or set in .env
WORKER_REPLICAS=4
```

## Custom Domain with SSL

### Option 1: Traefik (Included)

1. Set domain in `.env`:
```bash
DOMAIN=tonaiagent.example.com
ACME_EMAIL=admin@example.com
```

2. Point DNS to your server IP

3. Start with production profile:
```bash
docker compose --profile production up -d
```

Traefik automatically:
- Obtains Let's Encrypt certificate
- Renews certificate before expiry
- Redirects HTTP to HTTPS

### Option 2: External Proxy (nginx)

If using nginx or other reverse proxy:

```nginx
server {
    listen 80;
    server_name tonaiagent.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tonaiagent.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Database Management

### Backup

```bash
# Create backup
docker exec tonaiagent-postgres pg_dump -U tonaiagent tonaiagent > backup.sql

# Compressed backup
docker exec tonaiagent-postgres pg_dump -U tonaiagent tonaiagent | gzip > backup.sql.gz
```

### Restore

```bash
# Restore from backup
cat backup.sql | docker exec -i tonaiagent-postgres psql -U tonaiagent tonaiagent

# Restore compressed backup
gunzip -c backup.sql.gz | docker exec -i tonaiagent-postgres psql -U tonaiagent tonaiagent
```

### Migrations

```bash
# Run migrations (if applicable)
docker exec tonaiagent-app npm run migrate
```

## Monitoring

### Health Check

```bash
# Check all services
docker compose ps

# Check specific service
docker inspect --format='{{.State.Health.Status}}' tonaiagent-app

# API health endpoint
curl http://localhost:3000/health | jq
```

### Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app

# Last 100 lines
docker compose logs --tail=100 app
```

### Resource Usage

```bash
# View resource usage
docker stats

# View disk usage
docker system df
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs app

# Check configuration
docker compose config

# Rebuild image
docker compose build --no-cache app
```

### Database connection failed

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Test connection
docker exec tonaiagent-postgres pg_isready -U tonaiagent

# Check logs
docker compose logs postgres
```

### Out of memory

```bash
# Check memory usage
docker stats --no-stream

# Increase memory limit (in docker-compose.yml)
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

### Permission denied

```bash
# Fix volume permissions
sudo chown -R 1001:1001 /path/to/volumes
```

## Cleanup

```bash
# Stop and remove containers
docker compose down

# Remove volumes too
docker compose down -v

# Remove images
docker rmi tonaiagent:latest tonaiagent-worker:latest

# Full cleanup
docker system prune -a
```

## Security Recommendations

1. **Use strong passwords** - Generate random passwords for DB, JWT, etc.
2. **Enable firewall** - Only expose ports 80/443
3. **Regular updates** - Keep Docker and images updated
4. **Backup data** - Regular automated backups
5. **Monitor logs** - Set up log aggregation
6. **Use secrets** - Consider Docker Swarm secrets or external vault

## Support

- GitHub Issues: https://github.com/xlabtg/TONAIAgent/issues
- Telegram: https://t.me/xlab_tg
