output "deployment_identity" {
  description = "Non-secret immutable deployment identity."
  value = {
    application = var.application
    environment = var.environment
    data_region = var.data_region
    aws_region  = var.aws_region
  }
}

output "vpc_id" {
  value = aws_vpc.regional.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "database_endpoint" {
  value     = aws_db_instance.postgres.address
  sensitive = true
}

output "database_secret_arn" {
  value     = try(aws_db_instance.postgres.master_user_secret[0].secret_arn, null)
  sensitive = true
}

output "artifact_bucket_name" {
  value = aws_s3_bucket.artifacts.id
}

output "jobs_queue_arn" {
  value = aws_sqs_queue.jobs.arn
}

output "regional_kms_key_arn" {
  value     = aws_kms_key.regional.arn
  sensitive = true
}
