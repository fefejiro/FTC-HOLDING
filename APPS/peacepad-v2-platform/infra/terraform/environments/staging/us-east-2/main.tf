module "regional_data_plane" {
  source = "../../../modules/regional-data-plane"

  environment           = "staging"
  data_region           = "us"
  aws_region            = "us-east-2"
  vpc_cidr              = "10.50.0.0/16"
  availability_zones    = ["us-east-2a", "us-east-2b"]
  private_subnet_cidrs  = ["10.50.10.0/24", "10.50.20.0/24"]
  artifact_bucket_name  = var.artifact_bucket_name
  object_lock_enabled   = var.object_lock_enabled
  deletion_protection   = true
  backup_retention_days = 14
  log_retention_days    = 90
}
