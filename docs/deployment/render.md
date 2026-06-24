# Render deployment

This repository is configured for Render free-tier deployment with a Blueprint at [`/render.yaml`](../../../render.yaml).

## Services

- `api-prod` deploys from `main`
- `api-staging` deploys from `staging`
- `web-prod` deploys from `main`
- `web-staging` deploys from `staging`

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
