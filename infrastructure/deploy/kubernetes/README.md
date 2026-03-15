# TON AI Agent - Kubernetes Deployment

Enterprise-grade Kubernetes deployment using Helm charts.

## Quick Start

```bash
# Add Bitnami repo for dependencies
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install TON AI Agent
helm install tonaiagent ./helm/tonaiagent \
  --namespace tonaiagent \
  --create-namespace \
  --set secrets.telegramBotToken=YOUR_TOKEN \
  --set secrets.groqApiKey=YOUR_KEY \
  --set postgresql.auth.password=YOUR_DB_PASSWORD \
  --set redis.auth.password=YOUR_REDIS_PASSWORD
```

## Prerequisites

- Kubernetes cluster (1.25+)
- Helm 3.x
- kubectl configured
- Ingress controller (nginx recommended)
- cert-manager (for TLS)

## Installation Methods

### Method 1: Helm Values File

Create a `values-production.yaml` file:

```yaml
app:
  replicaCount: 3

ingress:
  enabled: true
  hosts:
    - host: tonaiagent.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: tonaiagent-tls
      hosts:
        - tonaiagent.example.com

secrets:
  telegramBotToken: "YOUR_TOKEN"
  groqApiKey: "YOUR_KEY"

postgresql:
  auth:
    password: "secure-password"

redis:
  auth:
    password: "secure-password"
```

Install with:

```bash
helm install tonaiagent ./helm/tonaiagent \
  --namespace tonaiagent \
  --create-namespace \
  -f values-production.yaml
```

### Method 2: External Secrets

For production, use external secrets management:

```yaml
# values-production.yaml
secrets:
  create: false
  existingSecret: tonaiagent-external-secrets

postgresql:
  enabled: false

redis:
  enabled: false

# Use external database and Redis
env:
  DATABASE_URL: "your-external-db-url"
  REDIS_URL: "your-external-redis-url"
```

## Configuration

### Core Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `app.replicaCount` | Number of app replicas | `2` |
| `app.image.repository` | App image repository | `tonaiagent/app` |
| `app.image.tag` | App image tag | `latest` |
| `app.resources.limits.cpu` | CPU limit | `1000m` |
| `app.resources.limits.memory` | Memory limit | `1024Mi` |

### Ingress Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.className` | Ingress class | `nginx` |
| `ingress.hosts[0].host` | Hostname | `tonaiagent.example.com` |

### Database Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Deploy PostgreSQL | `true` |
| `postgresql.auth.username` | DB username | `tonaiagent` |
| `postgresql.auth.database` | DB name | `tonaiagent` |
| `postgresql.primary.persistence.size` | PVC size | `20Gi` |

### Autoscaling

| Parameter | Description | Default |
|-----------|-------------|---------|
| `autoscaling.enabled` | Enable HPA | `true` |
| `autoscaling.minReplicas` | Min replicas | `2` |
| `autoscaling.maxReplicas` | Max replicas | `10` |
| `autoscaling.targetCPUUtilizationPercentage` | CPU threshold | `70` |

## Upgrading

```bash
# Update chart values
helm upgrade tonaiagent ./helm/tonaiagent \
  --namespace tonaiagent \
  -f values-production.yaml

# Rollback if needed
helm rollback tonaiagent 1 --namespace tonaiagent
```

## Monitoring

### Prometheus ServiceMonitor

The chart includes a ServiceMonitor for Prometheus Operator:

```yaml
monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 30s
```

### Grafana Dashboard

Import the included dashboard from `monitoring/grafana/dashboards/`.

## Scaling

### Horizontal Pod Autoscaler

HPA is enabled by default:

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 70
```

### Manual Scaling

```bash
kubectl scale deployment tonaiagent --replicas=5 -n tonaiagent
```

## Multi-Region Deployment

For global availability, deploy in multiple clusters:

```bash
# US cluster
kubectl config use-context us-cluster
helm install tonaiagent ./helm/tonaiagent -n tonaiagent -f values-us.yaml

# EU cluster
kubectl config use-context eu-cluster
helm install tonaiagent ./helm/tonaiagent -n tonaiagent -f values-eu.yaml

# Asia cluster
kubectl config use-context asia-cluster
helm install tonaiagent ./helm/tonaiagent -n tonaiagent -f values-asia.yaml
```

Use a global load balancer (e.g., Cloudflare, AWS Global Accelerator) for traffic routing.

## Security

### Network Policies

The chart includes network policies to restrict traffic:

```yaml
networkPolicy:
  enabled: true
```

### Pod Security

Pods run as non-root with restricted capabilities:

```yaml
app:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
  containerSecurityContext:
    allowPrivilegeEscalation: false
    readOnlyRootFilesystem: true
```

### Secrets Management

For production, use external secrets:

1. **Kubernetes Secrets Store CSI Driver**
2. **External Secrets Operator**
3. **HashiCorp Vault**

Example with External Secrets Operator:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: tonaiagent
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: tonaiagent-external-secrets
  data:
    - secretKey: telegram-bot-token
      remoteRef:
        key: tonaiagent/production
        property: TELEGRAM_BOT_TOKEN
```

## Troubleshooting

### Pods not starting

```bash
# Check pod status
kubectl get pods -n tonaiagent

# Check pod events
kubectl describe pod <pod-name> -n tonaiagent

# Check logs
kubectl logs <pod-name> -n tonaiagent
```

### Database connection issues

```bash
# Test database connectivity
kubectl run debug --rm -it --image=postgres:16 -n tonaiagent -- \
  psql postgresql://tonaiagent:password@tonaiagent-postgresql:5432/tonaiagent
```

### Ingress not working

```bash
# Check ingress status
kubectl get ingress -n tonaiagent

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

## Uninstallation

```bash
# Uninstall release
helm uninstall tonaiagent -n tonaiagent

# Delete namespace (removes all resources including PVCs)
kubectl delete namespace tonaiagent
```

## Support

- GitHub Issues: https://github.com/xlabtg/TONAIAgent/issues
- Telegram: https://t.me/xlab_tg
