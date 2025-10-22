# Configure Branch Protection via `gh` CLI

This repository includes a helper script to configure branch protection for `main` using the GitHub CLI.

Requirements
- GitHub CLI (`gh`) installed and authenticated (`gh auth login`).
- Your GitHub user must have admin permissions for the repository.

Usage

```bash
chmod +x scripts/config-branch-protection.sh
./scripts/config-branch-protection.sh flawlessstudio nexus-platform main
```

What it enables
- Requires the `CI — Build check` status check to pass before merging.
- Enforces admin restrictions and requires PR reviews for merges.

If you need a different policy (e.g., multiple required checks, different reviewers), edit the script to adjust the `gh api` payload.
