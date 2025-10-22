#!/usr/bin/env bash
# Usage: ./scripts/config-branch-protection.sh <owner> <repo> <branch>
# Requires GitHub CLI (gh) and appropriate permissions.

OWNER=$1
REPO=$2
BRANCH=${3:-main}

if [ -z "$OWNER" ] || [ -z "$REPO" ]; then
  echo "Usage: $0 <owner> <repo> [branch]"
  exit 1
fi

echo "Configuring branch protection for $OWNER/$REPO branch $BRANCH"

gh api -X PUT "/repos/$OWNER/$REPO/branches/$BRANCH/protection" -f required_status_checks='{"strict": true, "contexts": ["CI — Build check"]}' -f enforce_admins=true -f required_pull_request_reviews='{"dismiss_stale_reviews": true, "require_code_owner_reviews": false}' -f restrictions='null'

echo "Done."
