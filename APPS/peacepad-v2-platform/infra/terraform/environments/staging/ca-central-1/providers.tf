provider "aws" {
  region              = "ca-central-1"
  allowed_account_ids = var.allowed_account_ids

  default_tags {
    tags = {
      application         = "peacepad"
      platform            = "peacepad-v2"
      environment         = "staging"
      data-region         = "ca"
      managed-by          = "terraform"
      repository          = "fefejiro/FTC-HOLDING"
      cost-center         = "peacepad-v2"
      data-classification = "family-sensitive"
    }
  }
}
