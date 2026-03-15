# TON AI Agent - Edge Region Module
#
# Deploys a complete regional edge node including:
# - VPC with public/private subnets
# - ECS Fargate cluster with auto-scaling
# - Application Load Balancer
# - CloudWatch monitoring
# - SSM Parameter Store for regional config
#
# Issue #100: Global Infrastructure & Edge Deployment

terraform {
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

variable "project_name"            { type = string }
variable "environment"             { type = string }
variable "region"                  { type = string }
variable "geographic_zone"         { type = string }
variable "container_image"         { type = string }
variable "task_cpu"                { type = number }
variable "task_memory"             { type = number }
variable "min_capacity"            { type = number }
variable "max_capacity"            { type = number }
variable "global_events_arn"       { type = string }
variable "compliance_zones"        { type = list(string) }
variable "data_residency_required" { type = bool }

locals {
  name_prefix = "${var.project_name}-${var.environment}-${var.region}"
  tags = {
    Project         = var.project_name
    Environment     = var.environment
    Region          = var.region
    GeographicZone  = var.geographic_zone
    ComplianceZones = join(",", var.compliance_zones)
    ManagedBy       = "Terraform"
  }
}

# ============================================================================
# Data Sources
# ============================================================================

data "aws_availability_zones" "available" { state = "available" }

# ============================================================================
# VPC
# ============================================================================

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = merge(local.tags, { Name = "${local.name_prefix}-vpc" })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = merge(local.tags, { Name = "${local.name_prefix}-igw" })
}

resource "aws_subnet" "public" {
  count                   = min(length(data.aws_availability_zones.available.names), 3)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags                    = merge(local.tags, { Name = "${local.name_prefix}-public-${count.index}" })
}

resource "aws_subnet" "private" {
  count             = min(length(data.aws_availability_zones.available.names), 3)
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = merge(local.tags, { Name = "${local.name_prefix}-private-${count.index}" })
}

resource "aws_eip" "nat" {
  count  = 1
  domain = "vpc"
  tags   = merge(local.tags, { Name = "${local.name_prefix}-nat-eip" })
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id
  tags          = merge(local.tags, { Name = "${local.name_prefix}-nat" })
  depends_on    = [aws_internet_gateway.main]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = merge(local.tags, { Name = "${local.name_prefix}-public-rt" })
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
  tags = merge(local.tags, { Name = "${local.name_prefix}-private-rt" })
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ============================================================================
# Security Groups
# ============================================================================

resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb"
  description = "Edge ALB security group"
  vpc_id      = aws_vpc.main.id

  ingress { from_port = 443; to_port = 443; protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"]; description = "HTTPS" }
  ingress { from_port = 80;  to_port = 80;  protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"]; description = "HTTP" }
  egress  { from_port = 0;   to_port = 0;   protocol = "-1";  cidr_blocks = ["0.0.0.0/0"] }

  tags = merge(local.tags, { Name = "${local.name_prefix}-alb-sg" })
}

resource "aws_security_group" "ecs" {
  name        = "${local.name_prefix}-ecs"
  description = "Edge ECS tasks security group"
  vpc_id      = aws_vpc.main.id

  ingress { from_port = 3000; to_port = 3000; protocol = "tcp"; security_groups = [aws_security_group.alb.id]; description = "App port from ALB" }
  egress  { from_port = 0;    to_port = 0;    protocol = "-1";  cidr_blocks     = ["0.0.0.0/0"] }

  tags = merge(local.tags, { Name = "${local.name_prefix}-ecs-sg" })
}

# ============================================================================
# Application Load Balancer
# ============================================================================

resource "aws_lb" "main" {
  name               = "${var.project_name}-${var.environment}-${replace(var.region, "-", "")}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production"
  tags = merge(local.tags, { Name = "${local.name_prefix}-alb" })
}

resource "aws_lb_target_group" "main" {
  name        = "${var.project_name}-${var.environment}-${replace(var.region, "-", "")}"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }

  tags = merge(local.tags, { Name = "${local.name_prefix}-tg" })
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = "arn:aws:acm:${var.region}:ACCOUNT_ID:certificate/CERT_ID"   # Replace in production

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ============================================================================
# ECS Cluster
# ============================================================================

resource "aws_ecs_cluster" "main" {
  name = local.name_prefix

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(local.tags, { Name = "${local.name_prefix}-cluster" })
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = var.min_capacity
  }
}

# ============================================================================
# IAM Roles
# ============================================================================

resource "aws_iam_role" "ecs_execution" {
  name = "${local.name_prefix}-ecs-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name = "${local.name_prefix}-ecs-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
  tags = local.tags
}

resource "aws_iam_role_policy" "ecs_task_sns" {
  name = "sns-publish"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sns:Publish"]
      Resource = [var.global_events_arn]
    }]
  })
}

# ============================================================================
# CloudWatch Log Group
# ============================================================================

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${local.name_prefix}"
  retention_in_days = var.environment == "production" ? 90 : 30
  tags              = local.tags
}

# ============================================================================
# ECS Task Definition
# ============================================================================

resource "aws_ecs_task_definition" "main" {
  family                   = local.name_prefix
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "edge-runtime"
    image     = var.container_image
    essential = true

    portMappings = [{ containerPort = 3000; protocol = "tcp" }]

    environment = [
      { name = "NODE_ENV",               value = var.environment },
      { name = "PORT",                   value = "3000" },
      { name = "REGION",                 value = var.region },
      { name = "GEOGRAPHIC_ZONE",        value = var.geographic_zone },
      { name = "COMPLIANCE_ZONES",       value = join(",", var.compliance_zones) },
      { name = "DATA_RESIDENCY_REQUIRED", value = tostring(var.data_residency_required) },
      { name = "GLOBAL_EVENTS_ARN",      value = var.global_events_arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs.name
        awslogs-region        = var.region
        awslogs-stream-prefix = "edge"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])

  tags = local.tags
}

# ============================================================================
# ECS Service
# ============================================================================

resource "aws_ecs_service" "main" {
  name            = local.name_prefix
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = var.min_capacity

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 100
    base              = var.min_capacity
  }

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.main.arn
    container_name   = "edge-runtime"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = local.tags
}

# ============================================================================
# Auto Scaling
# ============================================================================

resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.main.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "${local.name_prefix}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 60.0  # Scale earlier for edge nodes
    scale_in_cooldown  = 300
    scale_out_cooldown = 30    # Fast scale-out for edge
  }
}

resource "aws_appautoscaling_policy" "requests" {
  name               = "${local.name_prefix}-request-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.main.arn_suffix}"
    }
    target_value       = 1000   # 1000 req/s per task
    scale_in_cooldown  = 300
    scale_out_cooldown = 30
  }
}

# ============================================================================
# SSM Parameter Store (Regional Config)
# ============================================================================

resource "aws_ssm_parameter" "region_config" {
  name  = "/${var.project_name}/${var.environment}/${var.region}/config"
  type  = "SecureString"
  value = jsonencode({
    region                  = var.region
    geographicZone          = var.geographic_zone
    complianceZones         = var.compliance_zones
    dataResidencyRequired   = var.data_residency_required
    albEndpoint             = aws_lb.main.dns_name
    ecsClusterArn           = aws_ecs_cluster.main.arn
    globalEventsArn         = var.global_events_arn
  })

  tags = local.tags
}

# ============================================================================
# Outputs
# ============================================================================

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "alb_zone_id" {
  value = aws_lb.main.zone_id
}

output "ecs_cluster_arn" {
  value = aws_ecs_cluster.main.arn
}

output "ecs_service_name" {
  value = aws_ecs_service.main.name
}

output "vpc_id" {
  value = aws_vpc.main.id
}
