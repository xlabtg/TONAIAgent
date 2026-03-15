# TON AI Agent - Terraform Variables

# ============================================
# General
# ============================================
variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "tonaiagent"
}

variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

# ============================================
# Networking
# ============================================
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# ============================================
# ECS Configuration
# ============================================
variable "container_port" {
  description = "Port exposed by the container"
  type        = number
  default     = 3000
}

variable "task_cpu" {
  description = "CPU units for ECS task (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "task_memory" {
  description = "Memory for ECS task in MB"
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "min_capacity" {
  description = "Minimum number of ECS tasks for auto-scaling"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of ECS tasks for auto-scaling"
  type        = number
  default     = 10
}

# ============================================
# Database Configuration
# ============================================
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage in GB for auto-scaling"
  type        = number
  default     = 100
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "tonaiagent"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "tonaiagent"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

# ============================================
# Cache Configuration
# ============================================
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

# ============================================
# SSL/TLS Configuration
# ============================================
variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for HTTPS"
  type        = string
}

# ============================================
# Application Secrets
# ============================================
variable "telegram_bot_token" {
  description = "Telegram bot token"
  type        = string
  sensitive   = true
}

variable "groq_api_key" {
  description = "Groq API key"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic API key (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

# ============================================
# TON Configuration
# ============================================
variable "ton_network" {
  description = "TON network (mainnet or testnet)"
  type        = string
  default     = "mainnet"
}

variable "ton_rpc_endpoint" {
  description = "Custom TON RPC endpoint"
  type        = string
  default     = ""
}

# ============================================
# Monitoring
# ============================================
variable "sns_alarm_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarms"
  type        = string
  default     = ""
}
