#!/usr/bin/env bash
# macOS Finder entry point. All the work is in start.sh — this exists only because Finder will
# double-click a .command and not a .sh, and start.sh has to be a .sh to be obviously runnable on
# Linux. Two names, one script; do not let logic accumulate here.
#
# STU_PAUSE_ON_ERROR holds the Terminal window open on failure. A double-clicked script's window
# closes the instant it exits, so without this an error message flashes past unread.
set -euo pipefail
STU_PAUSE_ON_ERROR=1 exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/start.sh" "$@"
