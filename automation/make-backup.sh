#!/bin/bash
# 작업 전 백업 단일 진입점 (2026-10-21 확정)
# 사용법: bash automation/make-backup.sh [라벨]
# - 백업은 항상 이 프로젝트의 `.backups/` 한 곳에만 생성한다 (다른 폴더 금지)
# - 백업 폴더 자신, 빌드 캐시(.next*), node_modules, .git 은 제외한다 (중첩·용량 폭증 방지)
set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"
DEST_ROOT="$REPO/.backups"
LABEL="${1:+_$1}"
DEST="$DEST_ROOT/backup_$(date +%Y%m%d_%H%M%S)$LABEL"
mkdir -p "$DEST_ROOT"
rsync -a \
  --exclude 'node_modules' --exclude '.next*' --exclude '.git' \
  --exclude '_backups' --exclude '.backups' --exclude '.claude-backups' --exclude '_to_delete' \
  "$REPO/" "$DEST/"
echo "백업 완료: $DEST"
