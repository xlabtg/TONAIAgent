# TON AI Agent - AWS Deployment

Enterprise-grade AWS deployment for TON AI Agent platform.

## Architecture Overview

```
                                    ┌─────────────────┐
                                    │   CloudFront    │
                                    │     (CDN)       │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │       ALB       │
                                    │ (Load Balancer) │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
           ┌────────▼────────┐      ┌────────▼────────┐      ┌────────▼────────┐
           │   ECS Task 1    │      │   ECS Task 2    │      │   ECS Task N    │
           │   (Fargate)     │      │   (Fargate)     │      │   (Fargate)     │
           └────────┬────────┘      └────────┬────────┘      └────────┬────────┘
                    │                        │                        │
                    └────────────────────────┼────────────────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
           ┌────────▼────────┐      ┌────────▼────────┐      ┌────────▼────────┐
           │   RDS Postgres  │      │ ElastiCache     │      │ Secrets Manager │
           │   (Database)    │      │   (Redis)       │      │   (Secrets)     │
           └─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Deployment Options

| Option | Complexity | Best For |
|--------|------------|----------|
| **Terraform** | Medium | Production, GitOps |
| **CDK** | Medium | TypeScript developers |
| **CloudFormation** | Low | AWS-native teams |

## Quick Start with Terraform

### Prerequisites

- AWS CLI configured with appropriate permissions
- Terraform >= 1.5.0
- Docker for building images
- ACM certificate for your domain

### Steps

1. **Navigate to Terraform directory**

```bash
cd deploy/aws/terraform
```

2. **Initialize Terraform**

```bash
terraform init
```

3. **Configure variables**

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

4. **Plan deployment**

```bash
terraform plan
```

5. **Apply infrastructure**

```bash
terraform apply
```

6. **Build and push Docker image**

```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URL

# Build image
docker build -t tonaiagent:latest -f deploy/docker/Dockerfile .

# Tag and push
docker tag tonaiagent:latest YOUR_ECR_URL:latest
docker push YOUR_ECR_URL:latest
```

7. **Force ECS deployment**

```bash
aws ecs update-service --cluster tonaiagent-production --service tonaiagent-production --force-new-deployment
```

## Infrastructure Components

### Compute

| Component | Service | Purpose |
|-----------|---------|---------|
| Application | ECS Fargate | Containerized application |
| Workers | ECS Fargate | Background task processing |

### Database

| Component | Service | Purpose |
|-----------|---------|---------|
| PostgreSQL | RDS | Primary database |
| Redis | ElastiCache | Caching and sessions |

### Networking

| Component | Service | Purpose |
|-----------|---------|---------|
| Load Balancer | ALB | Traffic distribution |
| CDN | CloudFront | Static content delivery |
| DNS | Route 53 | Domain management |
| VPC | VPC | Network isolation |

### Security

| Component | Service | Purpose |
|-----------|---------|---------|
| Secrets | Secrets Manager | Credential storage |
| Certificates | ACM | SSL/TLS |
| IAM | IAM | Access control |

### Monitoring

| Component | Service | Purpose |
|-----------|---------|---------|
| Logs | CloudWatch Logs | Application logs |
| Metrics | CloudWatch Metrics | Performance monitoring |
| Alarms | CloudWatch Alarms | Alerting |
| Insights | Container Insights | Container monitoring |

## Cost Estimation

### Development/Staging

| Resource | Type | Monthly Cost |
|----------|------|--------------|
| ECS Fargate | 2 tasks (0.5 vCPU, 1GB) | ~$30 |
| RDS | db.t3.micro | ~$15 |
| ElastiCache | cache.t3.micro | ~$12 |
| ALB | Standard | ~$20 |
| NAT Gateway | 1 instance | ~$35 |
| **Total** | | **~$112/mo** |

### Production

| Resource | Type | Monthly Cost |
|----------|------|--------------|
| ECS Fargate | 4 tasks (1 vCPU, 2GB) | ~$120 |
| RDS | db.r6g.large (Multi-AZ) | ~$200 |
| ElastiCache | cache.r6g.large | ~$100 |
| ALB | Standard | ~$25 |
| NAT Gateway | 3 instances | ~$105 |
| CloudFront | 100GB/mo | ~$10 |
| **Total** | | **~$560/mo** |

## Security Best Practices

### Network Security

- VPC with public/private subnet separation
- Security groups with least-privilege access
- NAT Gateway for outbound traffic from private subnets
- No direct internet access to application containers

### Data Security

- RDS encryption at rest (AES-256)
- ElastiCache encryption in transit
- Secrets Manager for all credentials
- KMS customer-managed keys (optional)

### Access Control

- IAM roles with least-privilege
- No hardcoded credentials
- MFA required for AWS console access
- CloudTrail for audit logging

## Scaling

### Auto Scaling Configuration

```hcl
# CPU-based scaling
target_tracking_scaling_policy_configuration {
  predefined_metric_specification {
    predefined_metric_type = "ECSServiceAverageCPUUtilization"
  }
  target_value = 70.0
}

# Memory-based scaling
target_tracking_scaling_policy_configuration {
  predefined_metric_specification {
    predefined_metric_type = "ECSServiceAverageMemoryUtilization"
  }
  target_value = 70.0
}
```

### Manual Scaling

```bash
# Scale to 5 tasks
aws ecs update-service --cluster tonaiagent-production --service tonaiagent-production --desired-count 5
```

## Multi-Region Deployment

For global availability, deploy in multiple regions:

1. Create separate Terraform workspaces per region
2. Use Route 53 latency-based routing
3. Enable cross-region RDS read replicas
4. Use Global ElastiCache

```bash
# US East
terraform workspace new us-east-1
terraform apply -var="aws_region=us-east-1"

# EU West
terraform workspace new eu-west-1
terraform apply -var="aws_region=eu-west-1"

# Asia Pacific
terraform workspace new ap-southeast-1
terraform apply -var="aws_region=ap-southeast-1"
```

## CI/CD Integration

### GitHub Actions

Copy the workflow file to your repository:

```bash
cp deploy/github-actions/deploy-aws.yml .github/workflows/
```

Configure these secrets in GitHub:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

### AWS CodePipeline

Alternative: Use AWS-native CI/CD with CodePipeline and CodeBuild.

## Disaster Recovery

### Backup Strategy

| Component | Backup Type | Retention |
|-----------|-------------|-----------|
| RDS | Automated snapshots | 30 days |
| RDS | Manual snapshots | Indefinite |
| ElastiCache | Snapshots | 7 days |
| ECS | Task definition versions | 10 versions |

### Recovery Procedures

1. **RDS Recovery**
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier tonaiagent-restored \
  --db-snapshot-identifier tonaiagent-snapshot-20240101
```

2. **Rollback ECS**
```bash
aws ecs update-service \
  --cluster tonaiagent-production \
  --service tonaiagent-production \
  --task-definition tonaiagent-production:PREVIOUS_VERSION
```

## Troubleshooting

### ECS Tasks Not Starting

```bash
# Check service events
aws ecs describe-services --cluster tonaiagent-production --services tonaiagent-production

# Check task logs
aws logs tail /ecs/tonaiagent-production --follow
```

### Database Connection Issues

```bash
# Test connectivity from ECS
aws ecs execute-command \
  --cluster tonaiagent-production \
  --task TASK_ID \
  --container app \
  --interactive \
  --command "/bin/sh"

# Inside container
nc -zv RDS_ENDPOINT 5432
```

### High Latency

1. Check CloudWatch metrics for CPU/memory
2. Review ALB response times
3. Check RDS performance insights
4. Enable Container Insights for detailed metrics

## Cleanup

To destroy all resources:

```bash
# Disable deletion protection first
aws rds modify-db-instance \
  --db-instance-identifier tonaiagent-production \
  --no-deletion-protection

# Destroy infrastructure
terraform destroy
```

## Support

- AWS Documentation: https://docs.aws.amazon.com
- GitHub Issues: https://github.com/xlabtg/TONAIAgent/issues
- Telegram: https://t.me/xlab_tg
