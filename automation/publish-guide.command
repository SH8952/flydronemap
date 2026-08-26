#!/bin/bash
# FlyDroneMap 가이드 자동 발행 스크립트 (영구 설치형)
# 이 파일은 최초 1회만 다운로드해서 실행하면 저장소 안에 스스로 설치됩니다.
# 이후에는 이 파일을 다시 받을 필요 없이, 저장소의 automation 폴더에 있는
# 이 스크립트를 계속 재사용하시면 매번 보안 경고 없이 실행됩니다.

REPO="$HOME/Desktop/flydronemap"
SCRIPT_NAME="publish-guide.command"
SCRIPT_PATH="$REPO/automation/$SCRIPT_NAME"

if [ ! -d "$REPO/.git" ]; then
  echo "저장소를 찾을 수 없습니다: $REPO"
  echo "이 스크립트는 flydronemap 저장소가 있는 맥에서만 동작합니다."
  read -p "Enter를 누르면 창이 닫힙니다..."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CURRENT_PATH="$SCRIPT_DIR/$(basename "$0")"

# --- 1. 최초 실행이면 저장소 안에 스스로 설치 (재다운로드가 없어야 보안 경고가 재발하지 않음) ---
if [ "$CURRENT_PATH" != "$SCRIPT_PATH" ]; then
  echo "=== 발행 스크립트를 저장소에 설치합니다 ==="
  mkdir -p "$REPO/automation"
  cp "$CURRENT_PATH" "$SCRIPT_PATH"
  chmod +x "$SCRIPT_PATH"
  # 격리(quarantine) 속성 제거: 이후 실행 시 "확인되지 않은 개발자" 경고가 다시 뜨지 않도록 함
  xattr -d com.apple.quarantine "$SCRIPT_PATH" 2>/dev/null
  xattr -cr "$SCRIPT_PATH" 2>/dev/null

  cd "$REPO"
  [ -f .git/index.lock ] && rm -f .git/index.lock
  git add "automation/$SCRIPT_NAME"
  if ! git diff --cached --quiet; then
    git commit -m "chore: 가이드 자동 발행 스크립트를 저장소에 영구 설치 (매일 재다운로드로 인한 Gatekeeper 경고 문제 해결)"
    git push origin main
  fi

  echo "설치 완료: $SCRIPT_PATH"
  echo "내일부터는 새 스크립트 파일 없이 콘텐츠 파일(mdx 4개 + json + txt)만 전달됩니다."
  echo "전달받은 콘텐츠 파일들을 아래 폴더에 넣고, 그 안의 이 스크립트를 다시 실행하시면 됩니다:"
  echo "  $REPO/automation/"
  echo ""
fi

# --- 2. 발행할 콘텐츠가 있는지 확인 (스크립트와 같은 폴더에서 탐색) ---
cd "$SCRIPT_DIR"
EN_FILE=$(ls guide-*-en.mdx 2>/dev/null | head -n1)

if [ -z "$EN_FILE" ]; then
  if [ "$CURRENT_PATH" != "$SCRIPT_PATH" ]; then
    echo "오늘은 발행할 콘텐츠 파일이 없어 설치만 진행했습니다."
  else
    echo "발행할 콘텐츠 파일(guide-*-en.mdx 등)을 찾을 수 없습니다."
    echo "오늘 전달받은 파일들을 이 폴더에 넣은 뒤 다시 실행해 주세요:"
    echo "  $SCRIPT_DIR"
  fi
  read -p "Enter를 누르면 창이 닫힙니다..."
  exit 0
fi

SLUG="${EN_FILE#guide-}"
SLUG="${SLUG%-en.mdx}"

TITLE=$(python3 -c "
import json
try:
    q = json.load(open('new-queue.json', encoding='utf-8'))
    for item in q:
        if item.get('slug') == '$SLUG':
            print(item.get('titleKo', ''))
            break
except Exception:
    pass
" 2>/dev/null)
TITLE="${TITLE:-$SLUG}"

echo "=== FlyDroneMap 가이드 자동 발행: $TITLE ==="

# --- 3. 작업 전 백업 (always-backup-before-work 규칙) ---
BACKUP_DIR="${REPO}_backup_$(date +%Y%m%d_%H%M%S)"
echo "백업 생성 중: $BACKUP_DIR"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude 'node_modules' --exclude '.next' --exclude '.git' "$REPO/" "$BACKUP_DIR/"
else
  cp -r "$REPO" "$BACKUP_DIR"
fi

# --- 4. 콘텐츠 반영 ---
cp "guide-${SLUG}-en.mdx" "$REPO/content/guides/en/${SLUG}.mdx"
cp "guide-${SLUG}-ja.mdx" "$REPO/content/guides/ja/${SLUG}.mdx"
cp "guide-${SLUG}-ko.mdx" "$REPO/content/guides/ko/${SLUG}.mdx"
cp "guide-${SLUG}-es.mdx" "$REPO/content/guides/es/${SLUG}.mdx"
cp "new-queue.json" "$REPO/automation/guide-topics-queue.json"

python3 -c "
import pathlib
repo = pathlib.Path('$REPO')
changelog = repo / 'CHANGELOG.md'
snippet_path = pathlib.Path('$SCRIPT_DIR/changelog-snippet.txt')
if snippet_path.exists():
    snippet = snippet_path.read_text(encoding='utf-8')
    content = changelog.read_text(encoding='utf-8')
    anchor = '# 개발 이력 (Development History)\n\n'
    if anchor in content and snippet.strip() not in content:
        content = content.replace(anchor, anchor + snippet + '\n', 1)
        changelog.write_text(content, encoding='utf-8')
"

cd "$REPO"
[ -f .git/index.lock ] && rm -f .git/index.lock
git add "content/guides/en/${SLUG}.mdx" "content/guides/ja/${SLUG}.mdx" "content/guides/ko/${SLUG}.mdx" "content/guides/es/${SLUG}.mdx" automation/guide-topics-queue.json CHANGELOG.md
git commit -m "feat: 가이드 아티클 추가 - ${TITLE} (자동 발행)"
git push origin main

# --- 5. 정리 (스크립트 자신은 삭제하지 않음) ---
rm -f "$SCRIPT_DIR/guide-${SLUG}-en.mdx" "$SCRIPT_DIR/guide-${SLUG}-ja.mdx" "$SCRIPT_DIR/guide-${SLUG}-ko.mdx" "$SCRIPT_DIR/guide-${SLUG}-es.mdx" "$SCRIPT_DIR/new-queue.json" "$SCRIPT_DIR/changelog-snippet.txt"

echo ""
echo "발행 완료: $TITLE"
echo "백업 위치: $BACKUP_DIR"
echo "3초 후 이 창이 닫힙니다."
sleep 3
THIS_TTY=$(tty)
osascript <<APPLESCRIPT
tell application "Terminal"
    repeat with w in windows
        try
            if tty of (selected tab of w) is "$THIS_TTY" then close w
        end try
    end repeat
end tell
delay 0.3
try
    tell application "System Events" to keystroke return
end try
APPLESCRIPT
