# TON AI Agent - Global Infrastructure Terraform Configuration
#
# Multi-region, multi-provider edge deployment for global AI agent execution.
# Deploys ECS Fargate clusters across 5 geographic regions with:
# - Regional load balancers and auto-scaling
# - Cross-region Route 53 latency-based routing
# - Global CloudFront distribution for API edge caching
# - SNS + SQS global event bus for cross-region coordination
# - Global Accelerator for consistent low-latency entry points
#
# Issue #100: Global Infrastructure & Edge Deployment
#
# Usage:
#   terraform init
#   terraform workspace new us-east-1
#   terraform apply -var="region=us-east-1"

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ============================================================================
# Variables
# ============================================================================

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "tonaiagent"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "regions" {
  description = "List of AWS regions to deploy edge nodes"
  type        = list(string)
  default = [
    "us-east-1",      # North America East
    "eu-west-1",      # Europe West (Ireland)
    "ap-southeast-1", # Asia Pacific (Singapore)
    "me-south-1",     # Middle East (Bahrain)
    "sa-east-1",      # Latin America (São Paulo)
  ]
}

variable "primary_region" {
  description = "Primary AWS region for global resources"
  type        = string
  default     = "us-east-1"
}

variable "container_image" {
  description = "Container image URI for the edge agent runtime"
  type        = string
  default     = "tonaiagent/edge-runtime:latest"
}

variable "edge_task_cpu" {
  description = "CPU units per edge task"
  type        = number
  default     = 512
}

variable "edge_task_memory" {
  description = "Memory (MB) per edge task"
  type        = number
  default     = 1024
}

variable "edge_min_capacity" {
  description = "Minimum number of edge task replicas per region"
  type        = number
  default     = 2
}

variable "edge_max_capacity" {
  description = "Maximum number of edge task replicas per region"
  type        = number
  default     = 20
}

variable "enable_global_accelerator" {
  description = "Enable AWS Global Accelerator for anycast routing"
  type        = bool
  default     = true
}

variable "enable_cloudfront" {
  description = "Enable CloudFront CDN for API edge caching"
  type        = bool
  default     = true
}

variable "domain_name" {
  description = "Root domain name for the platform"
  type        = string
  default     = "tonaiagent.io"
}

# ============================================================================
# Providers (one per region)
# ============================================================================

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu_west_1"
  region = "eu-west-1"
}

provider "aws" {
  alias  = "ap_southeast_1"
  region = "ap-southeast-1"
}

provider "aws" {
  alias  = "me_south_1"
  region = "me-south-1"
}

provider "aws" {
  alias  = "sa_east_1"
  region = "sa-east-1"
}

# Global resources provider (primary region)
provider "aws" {
  alias  = "global"
  region = var.primary_region
}

# ============================================================================
# Global Route 53 Hosted Zone
# ============================================================================

resource "aws_route53_zone" "global" {
  provider = aws.global
  name     = var.domain_name

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# ============================================================================
# Global Accelerator (Anycast Entry Point)
# ============================================================================

resource "aws_globalaccelerator_accelerator" "main" {
  count    = var.enable_global_accelerator ? 1 : 0
  provider = aws.global
  name     = "${var.project_name}-${var.environment}"
  enabled  = true

  ip_address_type = "IPV4"

  attributes {
    flow_logs_enabled   = true
    flow_logs_s3_bucket = aws_s3_bucket.global_logs[0].bucket
    flow_logs_s3_prefix = "global-accelerator/"
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_globalaccelerator_listener" "api" {
  count           = var.enable_global_accelerator ? 1 : 0
  provider        = aws.global
  accelerator_arn = aws_globalaccelerator_accelerator.main[0].id

  protocol = "TCP"

  port_range {
    from_port = 443
    to_port   = 443
  }
}

# ============================================================================
# Global Logs S3 Bucket
# ============================================================================

resource "aws_s3_bucket" "global_logs" {
  count    = var.enable_global_accelerator ? 1 : 0
  provider = aws.global
  bucket   = "${var.project_name}-${var.environment}-global-logs"

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "global_logs" {
  count    = var.enable_global_accelerator ? 1 : 0
  provider = aws.global
  bucket   = aws_s3_bucket.global_logs[0].id

  rule {
    id     = "expire_logs"
    status = "Enabled"

    expiration {
      days = 90
    }
  }
}

# ============================================================================
# Global SNS Topic (Cross-Region Events)
# ============================================================================

resource "aws_sns_topic" "global_events" {
  provider = aws.global
  name     = "${var.project_name}-${var.environment}-global-events"

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# ============================================================================
# Regional Edge Node Module (US East)
# ============================================================================

module "edge_us_east_1" {
  source = "./modules/edge-region"
  providers = {
    aws = aws.us_east_1
  }

  project_name      = var.project_name
  environment       = var.environment
  region            = "us-east-1"
  geographic_zone   = "north_america"
  container_image   = var.container_image
  task_cpu          = var.edge_task_cpu
  task_memory       = var.edge_task_memory
  min_capacity      = var.edge_min_capacity
  max_capacity      = var.edge_max_capacity
  global_events_arn = aws_sns_topic.global_events.arn

  compliance_zones        = ["fatf", "ccpa"]
  data_residency_required = false
}

# ============================================================================
# Regional Edge Node Module (EU West)
# ============================================================================

module "edge_eu_west_1" {
  source = "./modules/edge-region"
  providers = {
    aws = aws.eu_west_1
  }

  project_name      = var.project_name
  environment       = var.environment
  region            = "eu-west-1"
  geographic_zone   = "europe"
  container_image   = var.container_image
  task_cpu          = var.edge_task_cpu
  task_memory       = var.edge_task_memory
  min_capacity      = var.edge_min_capacity
  max_capacity      = var.edge_max_capacity
  global_events_arn = aws_sns_topic.global_events.arn

  compliance_zones        = ["gdpr", "mica", "fatf"]
  data_residency_required = true
}

# ============================================================================
# Regional Edge Node Module (AP Southeast)
# ============================================================================

module "edge_ap_southeast_1" {
  source = "./modules/edge-region"
  providers = {
    aws = aws.ap_southeast_1
  }

  project_name      = var.project_name
  environment       = var.environment
  region            = "ap-southeast-1"
  geographic_zone   = "asia_pacific"
  container_image   = var.container_image
  task_cpu          = var.edge_task_cpu
  task_memory       = var.edge_task_memory
  min_capacity      = var.edge_min_capacity
  max_capacity      = var.edge_max_capacity
  global_events_arn = aws_sns_topic.global_events.arn

  compliance_zones        = ["fatf", "pdpa"]
  data_residency_required = true
}

# ============================================================================
# Regional Edge Node Module (Middle East)
# ============================================================================

module "edge_me_south_1" {
  source = "./modules/edge-region"
  providers = {
    aws = aws.me_south_1
  }

  project_name      = var.project_name
  environment       = var.environment
  region            = "me-south-1"
  geographic_zone   = "middle_east"
  container_image   = var.container_image
  task_cpu          = var.edge_task_cpu
  task_memory       = var.edge_task_memory
  min_capacity      = var.edge_min_capacity
  max_capacity      = var.edge_max_capacity
  global_events_arn = aws_sns_topic.global_events.arn

  compliance_zones        = ["fatf"]
  data_residency_required = false
}

# ============================================================================
# Regional Edge Node Module (Latin America)
# ============================================================================

module "edge_sa_east_1" {
  source = "./modules/edge-region"
  providers = {
    aws = aws.sa_east_1
  }

  project_name      = var.project_name
  environment       = var.environment
  region            = "sa-east-1"
  geographic_zone   = "latin_america"
  container_image   = var.container_image
  task_cpu          = var.edge_task_cpu
  task_memory       = var.edge_task_memory
  min_capacity      = var.edge_min_capacity
  max_capacity      = var.edge_max_capacity
  global_events_arn = aws_sns_topic.global_events.arn

  compliance_zones        = ["fatf", "lgpd"]
  data_residency_required = true
}

# ============================================================================
# Route 53 Latency-Based Routing
# ============================================================================

resource "aws_route53_record" "api_us_east_1" {
  provider = aws.global
  zone_id  = aws_route53_zone.global.zone_id
  name     = "api.${var.domain_name}"
  type     = "A"

  set_identifier = "us-east-1"

  latency_routing_policy {
    region = "us-east-1"
  }

  alias {
    name                   = module.edge_us_east_1.alb_dns_name
    zone_id                = module.edge_us_east_1.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_eu_west_1" {
  provider = aws.global
  zone_id  = aws_route53_zone.global.zone_id
  name     = "api.${var.domain_name}"
  type     = "A"

  set_identifier = "eu-west-1"

  latency_routing_policy {
    region = "eu-west-1"
  }

  alias {
    name                   = module.edge_eu_west_1.alb_dns_name
    zone_id                = module.edge_eu_west_1.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_ap_southeast_1" {
  provider = aws.global
  zone_id  = aws_route53_zone.global.zone_id
  name     = "api.${var.domain_name}"
  type     = "A"

  set_identifier = "ap-southeast-1"

  latency_routing_policy {
    region = "ap-southeast-1"
  }

  alias {
    name                   = module.edge_ap_southeast_1.alb_dns_name
    zone_id                = module.edge_ap_southeast_1.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_me_south_1" {
  provider = aws.global
  zone_id  = aws_route53_zone.global.zone_id
  name     = "api.${var.domain_name}"
  type     = "A"

  set_identifier = "me-south-1"

  latency_routing_policy {
    region = "me-south-1"
  }

  alias {
    name                   = module.edge_me_south_1.alb_dns_name
    zone_id                = module.edge_me_south_1.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_sa_east_1" {
  provider = aws.global
  zone_id  = aws_route53_zone.global.zone_id
  name     = "api.${var.domain_name}"
  type     = "A"

  set_identifier = "sa-east-1"

  latency_routing_policy {
    region = "sa-east-1"
  }

  alias {
    name                   = module.edge_sa_east_1.alb_dns_name
    zone_id                = module.edge_sa_east_1.alb_zone_id
    evaluate_target_health = true
  }
}

# ============================================================================
# CloudFront Global API Cache
# ============================================================================

resource "aws_cloudfront_distribution" "api" {
  count   = var.enable_cloudfront ? 1 : 0
  provider = aws.global
  enabled = true
  comment = "TON AI Agent Global API Cache"

  origin {
    domain_name = "api.${var.domain_name}"
    origin_id   = "api-global"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "api-global"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "X-Tenant-ID", "X-Agent-ID", "X-Region"]

      cookies {
        forward = "none"
      }
    }

    # Cache health checks at edge for 10 seconds
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 10
  }

  # Cache public market data at edge for 30 seconds
  ordered_cache_behavior {
    path_pattern           = "/v1/market/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "api-global"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 30
    max_ttl     = 60
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# ============================================================================
# Outputs
# ============================================================================

output "global_accelerator_dns" {
  description = "Global Accelerator DNS name (anycast entry point)"
  value       = var.enable_global_accelerator ? aws_globalaccelerator_accelerator.main[0].dns_name : "disabled"
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = var.enable_cloudfront ? aws_cloudfront_distribution.api[0].domain_name : "disabled"
}

output "global_events_topic_arn" {
  description = "SNS topic ARN for cross-region events"
  value       = aws_sns_topic.global_events.arn
}

output "route53_zone_id" {
  description = "Route 53 hosted zone ID"
  value       = aws_route53_zone.global.zone_id
}

output "regional_endpoints" {
  description = "Regional ALB endpoints"
  value = {
    "us-east-1"      = module.edge_us_east_1.alb_dns_name
    "eu-west-1"      = module.edge_eu_west_1.alb_dns_name
    "ap-southeast-1" = module.edge_ap_southeast_1.alb_dns_name
    "me-south-1"     = module.edge_me_south_1.alb_dns_name
    "sa-east-1"      = module.edge_sa_east_1.alb_dns_name
  }
}
