variable "allowed_account_ids" {
  type        = list(string)
  description = "Exactly one approved non-production AWS account ID."
  sensitive   = true

  validation {
    condition     = length(var.allowed_account_ids) == 1 && can(regex("^[0-9]{12}$", var.allowed_account_ids[0]))
    error_message = "Supply exactly one 12-digit approved staging AWS account ID."
  }
}

variable "artifact_bucket_name" {
  type        = string
  description = "Globally unique Canadian staging artifact bucket name."
}

variable "object_lock_enabled" {
  type        = bool
  description = "Requires separate Records and Privacy approval before first bucket creation."
  default     = false
}
