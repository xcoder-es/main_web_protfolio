locals {
  render_manifest = {
    account_id = var.render_account_id
    project    = var.render_project_name
    services = {
      production_api = {
        name = var.production_api_service_name
        env = {
          CORS_ORIGINS = var.production_web_url
        }
      }
      staging_api = {
        name = var.staging_api_service_name
        env = {
          CORS_ORIGINS = var.staging_web_url
        }
      }
      production_web = {
        name = var.production_web_service_name
        env = {
          PUBLIC_API_URL             = var.production_api_url
          PUBLIC_SITE_URL            = var.production_web_url
          PUBLIC_TURNSTILE_SITE_KEY  = var.public_turnstile_site_key
        }
      }
      staging_web = {
        name = var.staging_web_service_name
        env = {
          PUBLIC_API_URL             = var.staging_api_url
          PUBLIC_SITE_URL            = var.staging_web_url
          PUBLIC_TURNSTILE_SITE_KEY  = var.public_turnstile_site_key
        }
      }
    }
    env_groups = {
      production_notifications = {
        NOTIFICATION_RECIPIENT_EMAIL = var.production_notification_recipient_email
        RESEND_FROM_EMAIL            = var.production_resend_from_email
        RESEND_API_KEY               = var.production_resend_api_key
        RESEND_BASE_URL              = "https://api.resend.com"
      }
      staging_notifications = {
        NOTIFICATION_RECIPIENT_EMAIL = var.staging_notification_recipient_email
        RESEND_FROM_EMAIL            = var.staging_resend_from_email
        RESEND_API_KEY               = var.staging_resend_api_key
        RESEND_BASE_URL              = "https://api.resend.com"
      }
    }
  }
}

resource "local_file" "render_manifest" {
  filename = "${path.module}/render-manifest.json"
  content  = jsonencode(local.render_manifest)
}

resource "null_resource" "render_sync" {
  triggers = {
    manifest_hash = sha256(local_file.render_manifest.content)
  }

  provisioner "local-exec" {
    command = "node ${path.root}/scripts/render-bootstrap.mjs ${local_file.render_manifest.filename}"
    environment = {
      RENDER_API_KEY = var.render_api_key
    }
  }
}
