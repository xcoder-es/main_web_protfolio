# Render deployment

This repository is configured for Render free-tier deployment with a Blueprint at [`/render.yaml`](../../../render.yaml).

## Hookup sequence

Use this order in Render:

1. Import the repository as a Blueprint from `render.yaml`.
1. Create the `api-prod` and `web-prod` services from `main`.
1. Copy the public API URL that Render assigns to `api-prod`.
1. Set `PUBLIC_API_URL` on `web-prod` and `web-staging` to the corresponding API URL for that environment.
1. Set `CORS_ORIGINS` in the API service to include the matching web URL for each environment.
1. Create the `staging` branch in GitHub by merging the first gated feature PR, or push it once manually to establish the branch.
1. Enable the repository secret or GitHub app access needed for the `staging-sync` workflow to push to `staging`.

## Services

- `api-prod` deploys from `main`
- `api-staging` deploys from `staging`
- `web-prod` deploys from `main`
- `web-staging` deploys from `staging`

The web app is static, so its API base URL is injected at build time through `PUBLIC_API_URL`.

## Staging policy

The staging branch is synchronized from feature PRs only when all of the following are true:

- the PR targets `main`
- the PR is not a draft
- the source branch name starts with `feature/`
- the PR has the `staging` label

The sync workflow is in [`.github/workflows/staging-sync.yml`](../../../.github/workflows/staging-sync.yml).

## Free-tier notes

- Free web services are supported on Render, but they spin down after inactivity and have monthly usage limits.
- The blueprint disables automatic preview environments to avoid extra free-tier churn.
- This setup avoids paid-only features such as persistent disks and private-network-only assumptions.

## SemVer tagging

Production deploys should be tied to release tags on `main`.

Recommended convention:

- `vMAJOR.MINOR.PATCH`
- create tags only from reviewed mainline commits
- use tags to mark what was deployed, even if the service keeps auto-deploying from `main`

## Practical note

Render Blueprint sync creates the services and their default URLs, but the first deploy of the web app still needs the matching API URL injected into the environment. Once that is set, Render will auto-deploy from `main` and `staging` as configured.
