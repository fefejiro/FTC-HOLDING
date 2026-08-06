variable "application" {
  type        = string
  description = "Application tag and resource prefix."
  default     = "peacepad-v2"
}

variable "environment" {
  type        = string
  description = "Deployment environment."

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

variable "data_region" {
  type        = string
  description = "Immutable PeacePad data residency code."

  validation {
    condition     = contains(["ca", "us"], var.data_region)
    error_message = "data_region must be ca or us."
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region hosting this isolated data plane."

  validation {
    condition = (
      (var.data_region == "ca" && var.aws_region == "ca-central-1") ||
      (var.data_region == "us" && var.aws_region == "us-east-2")
    )
    error_message = "Canadian data must use ca-central-1 and U.S. data must use us-east-2."
  }
}

variable "vpc_cidr" {
  type        = string
  description = "Non-overlapping regional VPC CIDR."
}

variable "availability_zones" {
  type        = list(string)
  description = "Exactly two availability zones in the selected AWS region."

  validation {
    condition     = length(var.availability_zones) == 2 && length(distinct(var.availability_zones)) == 2
    error_message = "Provide exactly two distinct availability zones."
  }
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "Exactly two private subnet CIDRs."

  validation {
    condition     = length(var.private_subnet_cidrs) == 2 && length(distinct(var.private_subnet_cidrs)) == 2
    error_message = "Provide exactly two distinct private subnet CIDRs."
  }
}

variable "artifact_bucket_name" {
  type        = string
  description = "Globally unique private artifact bucket name supplied by the environment root."
}

variable "database_instance_class" {
  type        = string
  description = "RDS instance class selected after cost review."
  default     = "db.t4g.small"
}

variable "postgres_engine_version" {
  type        = string
  description = "Approved PostgreSQL major version; AWS selects an available compatible minor."
  default     = "16"
}

variable "database_multi_az" {
  type        = bool
  description = "Whether RDS uses Multi-AZ deployment."
  default     = true
}

variable "backup_retention_days" {
  type        = number
  description = "RDS point-in-time recovery window."
  default     = 14

  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 35
    error_message = "backup_retention_days must be between 7 and 35."
  }
}

variable "object_retention_days" {
  type        = number
  description = "Default governance retention for original artifacts."
  default     = 30

  validation {
    condition     = var.object_retention_days >= 1
    error_message = "object_retention_days must be positive."
  }
}

variable "object_lock_enabled" {
  type        = bool
  description = "Enable irreversible S3 Object Lock only after Records and Privacy approval."
  default     = false
}

variable "deletion_protection" {
  type        = bool
  description = "Protect stateful resources from accidental deletion."
  default     = true
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention."
  default     = 90
}

variable "extra_tags" {
  type        = map(string)
  description = "Additional non-sensitive tags."
  default     = {}
}
