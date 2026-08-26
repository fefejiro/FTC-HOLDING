locals {
  name_prefix = "${var.application}-${var.environment}-${var.data_region}"
  required_tags = {
    application         = "peacepad"
    platform            = var.application
    environment         = var.environment
    data-region         = var.data_region
    managed-by          = "terraform"
    repository          = "fefejiro/FTC-HOLDING"
    cost-center         = "peacepad-v2"
    data-classification = "family-sensitive"
  }
  tags = merge(local.required_tags, var.extra_tags)
}

resource "aws_kms_key" "regional" {
  description             = "PeacePad V2 ${var.environment} ${var.data_region} regional data key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  multi_region            = false
  tags                    = merge(local.tags, { component = "encryption" })
}

resource "aws_kms_alias" "regional" {
  name          = "alias/${local.name_prefix}-data"
  target_key_id = aws_kms_key.regional.key_id
}

resource "aws_vpc" "regional" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = merge(local.tags, { Name = "${local.name_prefix}-vpc", component = "network" })
}

resource "aws_subnet" "private" {
  count                   = 2
  vpc_id                  = aws_vpc.regional.id
  availability_zone       = var.availability_zones[count.index]
  cidr_block              = var.private_subnet_cidrs[count.index]
  map_public_ip_on_launch = false
  tags = merge(local.tags, {
    Name      = "${local.name_prefix}-private-${count.index + 1}"
    component = "network"
    access    = "private"
  })
}

resource "aws_db_subnet_group" "regional" {
  name       = "${local.name_prefix}-db"
  subnet_ids = aws_subnet.private[*].id
  tags       = merge(local.tags, { component = "data" })
}

resource "aws_security_group" "database" {
  name        = "${local.name_prefix}-database"
  description = "PeacePad V2 PostgreSQL access from explicitly authorized API security groups"
  vpc_id      = aws_vpc.regional.id

  tags = merge(local.tags, { component = "data" })
}

resource "aws_db_instance" "postgres" {
  identifier                    = "${local.name_prefix}-postgres"
  engine                        = "postgres"
  engine_version                = var.postgres_engine_version
  instance_class                = var.database_instance_class
  allocated_storage             = 20
  max_allocated_storage         = 100
  storage_type                  = "gp3"
  storage_encrypted             = true
  kms_key_id                    = aws_kms_key.regional.arn
  db_name                       = "peacepad_v2"
  username                      = "peacepad_admin"
  manage_master_user_password   = true
  master_user_secret_kms_key_id = aws_kms_key.regional.arn
  port                          = 5432
  multi_az                      = var.database_multi_az
  publicly_accessible           = false
  db_subnet_group_name          = aws_db_subnet_group.regional.name
  vpc_security_group_ids        = [aws_security_group.database.id]
  backup_retention_period       = var.backup_retention_days
  backup_window                 = "05:00-06:00"
  maintenance_window            = "sun:06:30-sun:07:30"
  auto_minor_version_upgrade    = true
  copy_tags_to_snapshot         = true
  deletion_protection           = var.deletion_protection
  skip_final_snapshot           = false
  final_snapshot_identifier     = "${local.name_prefix}-final"

  tags = merge(local.tags, { component = "data" })

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket" "artifacts" {
  bucket              = var.artifact_bucket_name
  object_lock_enabled = var.object_lock_enabled
  tags                = merge(local.tags, { component = "evidence" })

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket                  = aws_s3_bucket.artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource = [
        aws_s3_bucket.artifacts.arn,
        "${aws_s3_bucket.artifacts.arn}/*"
      ]
      Condition = {
        Bool = {
          "aws:SecureTransport" = "false"
        }
      }
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.artifacts]
}

resource "aws_s3_bucket_ownership_controls" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    bucket_key_enabled = true
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.regional.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_object_lock_configuration" "artifacts" {
  count  = var.object_lock_enabled ? 1 : 0
  bucket = aws_s3_bucket.artifacts.id

  rule {
    default_retention {
      mode = "GOVERNANCE"
      days = var.object_retention_days
    }
  }

  depends_on = [aws_s3_bucket_versioning.artifacts]
}

resource "aws_sqs_queue" "dead_letter" {
  name                              = "${local.name_prefix}-jobs-dlq"
  kms_master_key_id                 = aws_kms_key.regional.arn
  kms_data_key_reuse_period_seconds = 300
  message_retention_seconds         = 1209600
  tags                              = merge(local.tags, { component = "jobs" })
}

resource "aws_sqs_queue" "jobs" {
  name                              = "${local.name_prefix}-jobs"
  kms_master_key_id                 = aws_kms_key.regional.arn
  kms_data_key_reuse_period_seconds = 300
  visibility_timeout_seconds        = 60
  message_retention_seconds         = 345600
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dead_letter.arn
    maxReceiveCount     = 5
  })
  tags = merge(local.tags, { component = "jobs" })
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/peacepad-v2/${var.environment}/${var.data_region}/api"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.regional.arn
  tags              = merge(local.tags, { component = "observability" })
}
