variable "render_api_key" {
  type      = string
  sensitive = true
}

variable "render_account_id" {
  type = string
}

variable "render_project_name" {
  type    = string
  default = "Portfolio"
}

variable "production_api_service_name" {
  type    = string
  default = "api-prod"
}

variable "staging_api_service_name" {
  type    = string
  default = "api-staging"
}

variable "production_web_service_name" {
  type    = string
  default = "web-prod"
}

variable "staging_web_service_name" {
  type    = string
  default = "web-staging"
}

variable "production_web_url" {
  type = string
}

variable "staging_web_url" {
  type = string
}

variable "production_api_url" {
  type = string
}

variable "staging_api_url" {
  type = string
}

variable "production_notification_recipient_email" {
  type      = string
  sensitive = true
}

variable "production_resend_from_email" {
  type      = string
  sensitive = true
}

variable "production_resend_api_key" {
  type      = string
  sensitive = true
}

variable "staging_notification_recipient_email" {
  type      = string
  sensitive = true
}

variable "staging_resend_from_email" {
  type      = string
  sensitive = true
}

variable "staging_resend_api_key" {
  type      = string
  sensitive = true
}

variable "public_turnstile_site_key" {
  type      = string
  sensitive = true
}
