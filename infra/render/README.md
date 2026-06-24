# Render Terraform bootstrap

This directory is the Terraform control plane for Render environment-specific state.

Blueprints remain the source of truth for service topology. Terraform handles the values Blueprint cannot infer safely:

- environment-specific public URLs
- environment-specific notification secrets
- environment-specific shared values that belong in groups

Terraform writes a normalized manifest and runs [`scripts/render-bootstrap.mjs`](../../scripts/render-bootstrap.mjs) to push the resulting state to Render.

## Why this split exists

Render Blueprints are good for topology.

Terraform is better for:

- controlled promotion
- repeatable environment state
- separating shared values from per-environment values
- future policy checks, drift detection, and release workflows

## Files

- [`main.tf`](./main.tf)
- [`variables.tf`](./variables.tf)
- [`outputs.tf`](./outputs.tf)
- [`versions.tf`](./versions.tf)
- [`terraform.tfvars.example`](./terraform.tfvars.example)

## Usage

```bash
terraform -chdir=infra/render init
terraform -chdir=infra/render plan -var-file=terraform.tfvars
terraform -chdir=infra/render apply -var-file=terraform.tfvars
```

## Inputs

The required values are:

- `render_api_key`
- `render_account_id`
- `production_api_url`
- `staging_api_url`
- `production_web_url`
- `staging_web_url`
- notification secrets for both environments
- `public_turnstile_site_key`

## Output

Terraform emits a manifest at `infra/render/render-manifest.json` and then invokes the bootstrap script.
