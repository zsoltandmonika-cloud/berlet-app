#!/usr/bin/env bash
set -euo pipefail
# Source-code Golden Backup only. Never modifies main or personal health data.
: "${GITHUB_SHA:?}"
: "${GITHUB_REPOSITORY:?}"
: "${GITHUB_RUN_ID:?}"
: "${GITHUB_SERVER_URL:?}"
SHA="$GITHUB_SHA"
REPO="$GITHUB_REPOSITORY"
RUN_URL="$GITHUB_SERVER_URL/$REPO/actions/runs/$GITHUB_RUN_ID"
HISTORY_REF="refs/heads/healthhub-backup-history"
git config user.name "HealthHub Golden Backup"
git config user.email "healthhub-backup@users.noreply.github.com"
git fetch origin main --quiet
if [[ "$(git rev-parse FETCH_HEAD)" != "$SHA" ]]; then
  echo "::warning::Main moved; skipping outdated backup."
  echo "Golden Backup SKIPPED: main changed during validation" >> "$GITHUB_STEP_SUMMARY"
  exit 0
fi
VERSION="$(node -p '((require("fs").readFileSync("healthhub/index.html","utf8").match(/healthhub-live-build" content="([^"]+)"/)||[])[1]||"unknown")')"
TAG="hh-golden-$(echo "$SHA" | cut -c1-12)"
CREATED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
TAG_URL="$GITHUB_SERVER_URL/$REPO/tree/$TAG"
ARCHIVE_URL="$GITHUB_SERVER_URL/$REPO/archive/refs/tags/$TAG.zip"
STATUS="existing"
if ! git ls-remote --exit-code --tags origin "refs/tags/$TAG" >/dev/null 2>&1; then
  git tag -a "$TAG" "$SHA" -m "HealthHub Golden Backup
verified_at_utc: $CREATED
version: $VERSION
commit: $SHA
healthcheck: Level 3 Guard PASS
workflow_run: $RUN_URL
rollback_policy: MANUAL_APPROVAL_ONLY"
  git push origin "refs/tags/$TAG"
  STATUS="created"
fi
PARENT=""
HISTORY=""
if git ls-remote --exit-code --heads origin "$HISTORY_REF" >/dev/null 2>&1; then
  git fetch origin "+$HISTORY_REF:refs/remotes/origin/healthhub-backup-history" --quiet
  PARENT="$(git rev-parse refs/remotes/origin/healthhub-backup-history)"
  HISTORY="$(git show "$PARENT:version-history.ndjson")"
fi
ROW="$(BACKUP_CREATED="$CREATED" BACKUP_SHA="$SHA" BACKUP_TAG="$TAG" BACKUP_VERSION="$VERSION" BACKUP_STATUS="$STATUS" BACKUP_RUN_URL="$RUN_URL" BACKUP_TAG_URL="$TAG_URL" BACKUP_ARCHIVE_URL="$ARCHIVE_URL" python3 -c 'import json,os; names=["created","sha","tag","version","status","run_url","tag_url","archive_url"]; print(json.dumps({k:os.environ["BACKUP_"+k.upper()] for k in names},ensure_ascii=False,separators=(",",":")))')"
if [[ -n "$HISTORY" ]]; then HISTORY="$HISTORY"$'\n'; fi
BLOB="$(printf '%s\n' "$HISTORY$ROW" | git hash-object -w --stdin)"
TREE="$(printf '100644 blob %s\tversion-history.ndjson\n' "$BLOB" | git mktree)"
if [[ -n "$PARENT" ]]; then
  COMMIT="$(printf 'HealthHub Golden Backup audit %s\n' "$TAG" | git commit-tree "$TREE" -p "$PARENT")"
else
  COMMIT="$(printf 'Initialize HealthHub Golden Backup audit %s\n' "$TAG" | git commit-tree "$TREE")"
fi
git push origin "$COMMIT:$HISTORY_REF"
# Rotate only the exact hh-golden-<12 hexadecimal chars> tag family.
# hh-golden-pinned-* tags are never deleted automatically.
git fetch --quiet origin 'refs/tags/hh-golden-*:refs/tags/hh-golden-*'
mapfile -t SORTED < <(git for-each-ref --sort=-creatordate --format='%(refname:short)' refs/tags/hh-golden- | grep -E '^hh-golden-[0-9a-f]{12}$' || true)
REMOVED=0
if (( "${#SORTED[@]}" > 5 )); then
  for OLD in "${SORTED[@]:5}"; do
    [[ "$OLD" == "$TAG" ]] && continue
    git push origin ":refs/tags/$OLD"
    REMOVED=$((REMOVED+1))
  done
fi
{
  echo "### HealthHub Golden Backup: HealthCheck PASS"
  echo "- Status: $STATUS"
  echo "- Version: $VERSION"
  echo "- Commit: $SHA"
  echo "- Time (UTC): $CREATED"
  echo "- [Mentett verzió / GitHub tag]($TAG_URL)"
  echo "- [Forráskód ZIP mentés]($ARCHIVE_URL)"
  echo "- [Verziónapló](https://github.com/$REPO/blob/healthhub-backup-history/version-history.ndjson)"
  echo "- Removed old rotating tags: $REMOVED"
  echo "- Rollback: MANUAL ONLY"
} >> "$GITHUB_STEP_SUMMARY"
