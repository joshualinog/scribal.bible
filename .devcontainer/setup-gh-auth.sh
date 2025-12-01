#!/usr/bin/env bash
set -euo pipefail

# Configure gh using a PAT provided via the Codespaces secret `CODESPACE_GH_TOKEN`.
# This script is safe to run multiple times and exits quietly if the secret is absent.

if [ -z "${CODESPACE_GH_TOKEN:-}" ]; then
  echo "CODESPACE_GH_TOKEN not set; skipping gh auth login"
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found; skipping gh auth login"
  exit 0
fi

# Perform non-interactive login for the session (don't abort if GITHUB_TOKEN blocks)
echo "$CODESPACE_GH_TOKEN" | gh auth login --with-token || true

echo "Attempted gh auth login (may be overridden by GITHUB_TOKEN)."

# Ensure interactive shells see the PAT for `gh` commands even when `GITHUB_TOKEN` is present.
# We reference `CODESPACE_GH_TOKEN` (the secret) rather than writing the token literal to disk.
if ! grep -q "export GH_TOKEN=" "$HOME/.bashrc" 2>/dev/null; then
  cat >> "$HOME/.bashrc" <<'BASHRC'
# Use Codespaces-provided PAT for GH CLI commands when present.
if [ -n "${CODESPACE_GH_TOKEN:-}" ]; then
  export GH_TOKEN="${CODESPACE_GH_TOKEN}"
fi
BASHRC
  echo "Added GH_TOKEN export to ~/.bashrc"
fi
