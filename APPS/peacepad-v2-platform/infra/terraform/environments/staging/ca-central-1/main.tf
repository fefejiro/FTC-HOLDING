module "regional_data_plane" {
  source = "../../../modules/regional-data-plane"

  environment           = "staging"
  data_region           = "ca"
  aws_region            = "ca-central-1"
  vpc_cidr              = "10.40.0.0/16"
  availability_zones    = ["ca-central-1a", "ca-central-1b"]
  private_subnet_cidrs  = ["10.40.10.0/24", "10.40.20.0/24"]
  artifact_bucket_name  = var.artifact_bucket_name
  object_lock_enabled   = var.object_lock_enabled
  deletion_protection   = true
  backup_retention_days = 14
  log_retention_days    = 90
}
