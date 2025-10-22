# Archived Packages

This directory contains packages that are part of the broader NEXUS Platform vision but are currently out of scope for the lean v1 launch.

They are excluded from the `pnpm-workspace.yaml` and are not part of the active development, testing, or deployment pipelines.

## Resurrection

To bring a package back into the active workspace, move its directory to the root of the monorepo and add its path back to `pnpm-workspace.yaml`. You will also need to re-integrate it into the CI/CD pipeline.

- `admin/`: React Admin Dashboard
- `mobile/`: React Native App
