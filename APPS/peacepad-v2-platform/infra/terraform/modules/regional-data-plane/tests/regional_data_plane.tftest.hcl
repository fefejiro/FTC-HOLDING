mock_provider "aws" {}

run "canadian_staging_plan" {
  command = plan

  variables {
    environment          = "staging"
    data_region          = "ca"
    aws_region           = "ca-central-1"
    vpc_cidr             = "10.40.0.0/16"
    availability_zones   = ["ca-central-1a", "ca-central-1b"]
    private_subnet_cidrs = ["10.40.10.0/24", "10.40.20.0/24"]
    artifact_bucket_name = "peacepad-v2-staging-ca-artifacts-example"
    object_lock_enabled  = true
  }

  assert {
    condition     = aws_db_instance.postgres.publicly_accessible == false
    error_message = "PostgreSQL must remain private."
  }

  assert {
    condition     = aws_db_instance.postgres.storage_encrypted == true
    error_message = "PostgreSQL storage must remain encrypted."
  }

  assert {
    condition     = aws_s3_bucket.artifacts.object_lock_enabled == true
    error_message = "Original artifact storage must retain object-lock support."
  }

  assert {
    condition     = output.deployment_identity.data_region == "ca"
    error_message = "Canadian stack must retain the ca deployment identity."
  }
}

run "united_states_staging_plan" {
  command = plan

  variables {
    environment          = "staging"
    data_region          = "us"
    aws_region           = "us-east-2"
    vpc_cidr             = "10.50.0.0/16"
    availability_zones   = ["us-east-2a", "us-east-2b"]
    private_subnet_cidrs = ["10.50.10.0/24", "10.50.20.0/24"]
    artifact_bucket_name = "peacepad-v2-staging-us-artifacts-example"
  }

  assert {
    condition     = output.deployment_identity.data_region == "us"
    error_message = "U.S. stack must retain the us deployment identity."
  }
}
