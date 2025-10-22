# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-07-29

### Added
- Initial release of the Nexus Platform.
- Core v1 stack: Supabase, Vercel, Stripe, Turnstile, Sentry, OpenAI.
- `readiness_doctor.mjs` script for project health auditing.
- `v1_guardian.mjs` script for enforcing v1 architecture.
- Monorepo setup with pnpm workspaces for `web` and `backend`.
- CI/CD workflows for nightly audits.

### Changed
- Refactored codebase to a "lean v1" architecture.
- Archived `admin` and `mobile` packages to focus on the core web platform.
- Replaced Docker-based local development with Supabase CLI.

### Removed
- `docker-compose.yml` and `backend/Dockerfile`.
