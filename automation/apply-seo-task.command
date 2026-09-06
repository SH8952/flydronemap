#!/bin/bash
# FlyDroneMap SEO 개선 자동 적용 스크립트 (영구 설치형)
# 이 파일은 최초 1회만 다운로드해서 실행하면 저장소 안에 스스로 설치됩니다.
# 이후에는 이 파일을 다시 받을 필요 없이, 저장소의 automation 폴더에 있는
# 이 스크립트를 계속 재사용하시면 매번 보안 경고 없이 실행됩니다.
#
# publish-guide.command(가이드 자동 발행용)와 별개로 동작하며, SEO_TASKS.md의
# 각 일차 작업(임의 파일 여러 개를 건드리는 변경)을 zip 하나로 받아 적용합니다.

REPO="$HOME/Desktop/애드센스 제휴 마케팅/flydronemap"
SCRIPT_NAME="apply-seo-task.command"
SCRIPT_PATH="$REPO/automation/$SCRIPT_NAME"

if [ ! -d "$REPO/.git" ]; then
  echo "저장소를 찾을 수 없습니다: $REPO"
  echo "이 스크립트는 flydronemap 저장소가 있는 맥에서만 동작합니다."
  read -p "Enter를 누르면 창이 닫힙니다..."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CURRENT_PATH="$SCRIPT_DIR/$(basename "$0")"

# --- 1. 최초 실행이면 저장소 안에 스스로 설치 ---
if [ "$CURRENT_PATH" != "$SCRIPT_PATH" ]; then
  echo "=== SEO 작업 적용 스크립트를 저장소에 설치합니다 ==="
  mkdir -p "$REPO/automation"
  cp "$CURRENT_PATH" "$SCRIPT_PATH"
  chmod +x "$SCRIPT_PATH"
  xattr -d com.apple.quarantine "$SCRIPT_PATH" 2>/dev/null
  xattr -cr "$SCRIPT_PATH" 2>/dev/null

  cd "$REPO"
  [ -f .git/index.lock ] && rm -f .git/index.lock
  [ -f .git/HEAD.lock ] && rm -f .git/HEAD.lock
  git add "automation/$SCRIPT_NAME"
  if ! git diff --cached --quiet; then
    git commit -m "chore: SEO 작업 자동 적용 스크립트를 저장소에 영구 설치"
    git push origin main
  fi

  echo "설치 완료: $SCRIPT_PATH"
  echo "내일부터는 새 스크립트 파일 없이 seo-task-payload.zip 하나만 전달됩니다."
  echo "전달받은 zip 파일을 아래 폴더에 넣고, 그 안의 이 스크립트를 다시 실행하시면 됩니다:"
  echo "  $REPO/automation/"
  echo ""
fi

# --- 1.5. 다른 스크립트와 헷갈리지 않도록 SEO 아이콘 적용 ---
# (매번 실행할 때마다 재적용해도 무해함 - 이미 적용돼 있으면 그대로 유지됨)
ICON_PATH="$REPO/automation/assets/seo-task-icon.png"
if [ -f "$ICON_PATH" ]; then
  ICON_RESULT=$(osascript <<APPLESCRIPT 2>&1
use framework "Foundation"
use framework "AppKit"
set theImage to current application's NSImage's alloc()'s initWithContentsOfFile:"$ICON_PATH"
if theImage is missing value then
    return "ERROR: 아이콘 이미지 파일을 읽지 못함 ($ICON_PATH)"
end if
set didSet to current application's NSWorkspace's sharedWorkspace()'s setIcon:theImage forFile:"$SCRIPT_PATH" options:0
if didSet as boolean is false then
    return "ERROR: setIcon 호출은 됐지만 실패로 반환됨 (didSet=false)"
end if
return "OK"
APPLESCRIPT
)
  if [ "$ICON_RESULT" = "OK" ]; then
    touch "$SCRIPT_PATH"
  else
    echo "(SEO 아이콘 적용 실패: $ICON_RESULT)"
  fi
fi

# --- 2. 적용할 payload zip이 있는지 확인 (스크립트와 같은 폴더에서 탐색) ---
cd "$SCRIPT_DIR"
PAYLOAD_ZIP=$(ls seo-task-payload*.zip 2>/dev/null | head -n1)

if [ -z "$PAYLOAD_ZIP" ]; then
  if [ "$CURRENT_PATH" != "$SCRIPT_PATH" ]; then
    echo "오늘은 적용할 SEO 작업 패키지가 없어 설치만 진행했습니다."
  else
    echo "적용할 패키지(seo-task-payload.zip)를 찾을 수 없습니다."
    echo "오늘 전달받은 zip 파일을 이 폴더에 넣은 뒤 다시 실행해 주세요:"
    echo "  $SCRIPT_DIR"
  fi
  read -p "Enter를 누르면 창이 닫힙니다..."
  exit 0
fi

echo "=== FlyDroneMap SEO 작업 적용: $PAYLOAD_ZIP ==="

# --- 3. 작업 전 백업 ---
BACKUP_DIR="$REPO/_backups/flydronemap_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$REPO/_backups"
echo "백업 생성 중: $BACKUP_DIR"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude 'node_modules' --exclude '.next' --exclude '.git' --exclude '_backups' "$REPO/" "$BACKUP_DIR/"
else
  cp -r "$REPO" "$BACKUP_DIR"
fi

# --- 4. payload 압축 해제 (zip 안 상대경로 그대로 저장소 루트에 반영) 및 커밋 메시지 확인 ---
WORK_DIR=$(mktemp -d)
unzip -o -q "$PAYLOAD_ZIP" -d "$WORK_DIR"

if [ ! -f "$WORK_DIR/commit-message.txt" ]; then
  echo "패키지 안에 commit-message.txt가 없습니다 — 손상된 패키지일 수 있습니다. 중단합니다."
  rm -rf "$WORK_DIR"
  read -p "Enter를 누르면 창이 닫힙니다..."
  exit 1
fi

# commit-message.txt를 제외한 나머지 파일/폴더를 저장소 루트로 복사(상대경로 유지)
(cd "$WORK_DIR" && find . -type f ! -name "commit-message.txt" -print0) | while IFS= read -r -d '' f; do
  rel="${f#./}"
  mkdir -p "$REPO/$(dirname "$rel")"
  cp "$WORK_DIR/$rel" "$REPO/$rel"
done

cd "$REPO"
[ -f .git/index.lock ] && rm -f .git/index.lock
[ -f .git/HEAD.lock ] && rm -f .git/HEAD.lock
git add -A
if git diff --cached --quiet; then
  echo "변경된 내용이 없습니다(이미 적용된 패키지일 수 있음)."
else
  git commit -F "$WORK_DIR/commit-message.txt"
  git push origin main
  echo "커밋 및 push 완료"
fi

rm -rf "$WORK_DIR"
rm -f "$SCRIPT_DIR/$PAYLOAD_ZIP"

echo ""
echo "SEO 작업 적용 완료"
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
