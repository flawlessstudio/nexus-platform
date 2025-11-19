#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"

echo "Validating brand.json files..."
find "$repo_root/brands" -name brand.json -print0 | while IFS= read -r -d '' file; do
  echo "- $file"
  # Placeholder: integrate jsonschema validation (e.g., using ajv)
  test -s "$file"
done

echo "Validating campaign.json files..."
find "$repo_root/campaigns" -name campaign.json -print0 | while IFS= read -r -d '' file; do
  echo "- $file"
  test -s "$file"
done

echo "Validate tokens + editorial guide via schemas once tooling is wired."
