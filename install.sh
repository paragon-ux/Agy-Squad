#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if ! command -v node >/dev/null 2>&1; then
  echo "Agy-Squad requires Node.js >= 22.0.0, but 'node' was not found on PATH." >&2
  exit 1
fi
NODE_VER="$(node -p 'process.versions.node' 2>/dev/null || true)"
NODE_VER="${NODE_VER//$'\r'/}"
NODE_VER="${NODE_VER//$'\n'/}"
NODE_MAJOR="${NODE_VER%%.*}"
if ! [[ "${NODE_MAJOR}" =~ ^[0-9]+$ ]] || [ "${NODE_MAJOR}" -lt 22 ]; then
  NODE_FOUND="${NODE_VER:+v${NODE_VER}}"
  echo "Agy-Squad requires Node.js >= 22.0.0 (found ${NODE_FOUND:-unknown}). Please upgrade Node.js." >&2
  exit 1
fi
exec node "${SCRIPT_DIR}/scripts/install-register.mjs" "$@"
