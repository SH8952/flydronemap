#!/bin/bash
# FlyDroneMap 가이드 자동 발행 스크립트 (영구 설치형, v2 - 진단 강화판)

REPO="$HOME/Desktop/애드센스 제휴 마케팅/flydronemap"
SCRIPT_NAME="publish-guide.command"
SCRIPT_PATH="$REPO/automation/$SCRIPT_NAME"
CONTENT_DIR="$REPO/automation"

if [ ! -d "$REPO/.git" ]; then
  echo "저장소를 찾을 수 없습니다: $REPO"
  echo "이 스크립트는 flydronemap 저장소가 있는 맥에서만 동작합니다."
  read -p "Enter를 누르면 창이 닫힙니다..."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CURRENT_PATH="$SCRIPT_DIR/$(basename "$0")"

# --- 1. 최초 실행/업데이트: 저장소 안에 스스로 설치 ---
if [ "$CURRENT_PATH" != "$SCRIPT_PATH" ]; then
  echo "=== 발행 스크립트를 저장소에 설치(갱신)합니다 ==="
  mkdir -p "$REPO/automation"
  cp "$CURRENT_PATH" "$SCRIPT_PATH"
  chmod +x "$SCRIPT_PATH"
  xattr -d com.apple.quarantine "$SCRIPT_PATH" 2>/dev/null
  xattr -cr "$SCRIPT_PATH" 2>/dev/null

  cd "$REPO"
  [ -f .git/index.lock ] && rm -f .git/index.lock
  git add "automation/$SCRIPT_NAME"
  if ! git diff --cached --quiet; then
    git commit -m "chore: 가이드 자동 발행 스크립트 설치/업데이트 (진단 로그 강화)"
    git push origin main
  fi
  echo "설치 완료: $SCRIPT_PATH"
  echo ""
fi

# --- 1.5. 다른 스크립트와 헷갈리지 않도록 알람시계 아이콘 적용 (매일 자동 발행 스크립트) ---
# (매번 실행할 때마다 재적용해도 무해함 - 이미 적용돼 있으면 그대로 유지됨. 2026-09-03 추가)
ICON_PATH="$REPO/automation/assets/publish-icon.png"
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
  fi
fi

# --- 2. 콘텐츠 확인 (항상 저장소의 automation 폴더에서 찾음) ---
cd "$CONTENT_DIR" || { echo "오류: $CONTENT_DIR 폴더를 찾을 수 없습니다."; read -p "Enter..."; exit 1; }
EN_FILE=$(ls guide-*-en.mdx 2>/dev/null | head -n1)

if [ -z "$EN_FILE" ]; then
  echo "발행할 콘텐츠 파일(guide-*-en.mdx 등)이 없습니다: $CONTENT_DIR"
  echo "오늘 전달받은 파일들(mdx 4개 + new-queue.json + changelog-snippet.txt)을"
  echo "이 폴더에 넣은 뒤 이 스크립트를 다시 실행해 주세요."
  read -p "Enter를 누르면 창이 닫힙니다..."
  exit 0
fi

SLUG="${EN_FILE#guide-}"
SLUG="${SLUG%-en.mdx}"
echo "감지된 SLUG: $SLUG"

TITLE=$(python3 -c "
import json
try:
    q = json.load(open('new-queue.json', encoding='utf-8'))
    for item in q:
        if item.get('slug') == '$SLUG':
            print(item.get('titleKo', ''))
            break
except Exception as e:
    pass
" 2>/dev/null)
TITLE="${TITLE:-$SLUG}"

echo "=== FlyDroneMap 가이드 자동 발행: $TITLE ==="
echo ""
echo "-- 콘텐츠 폴더 파일 목록 --"
ls -la "$CONTENT_DIR" | grep -E "guide-|new-queue|changelog-snippet"
echo ""

# --- 3. 작업 전 백업 ---
mkdir -p "$REPO/.backups"
BACKUP_DIR="$REPO/.backups/backup_$(date +%Y%m%d_%H%M%S)"
echo "백업 생성 중: $BACKUP_DIR"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude 'node_modules' --exclude '.next' --exclude '.git' --exclude '.backups' "$REPO/" "$BACKUP_DIR/"
else
  cp -r "$REPO" "$BACKUP_DIR"
  rm -rf "$BACKUP_DIR/.backups" 2>/dev/null
fi
echo "백업 완료"
echo ""

# --- 4. 콘텐츠 반영 (각 단계 성공 여부 확인) ---
COPY_OK=1

echo "-- 파일 복사 시작 --"
cp -v "guide-${SLUG}-en.mdx" "$REPO/content/guides/en/${SLUG}.mdx" || COPY_OK=0
cp -v "guide-${SLUG}-ja.mdx" "$REPO/content/guides/ja/${SLUG}.mdx" || COPY_OK=0
cp -v "guide-${SLUG}-ko.mdx" "$REPO/content/guides/ko/${SLUG}.mdx" || COPY_OK=0
cp -v "guide-${SLUG}-es.mdx" "$REPO/content/guides/es/${SLUG}.mdx" || COPY_OK=0
cp -v "new-queue.json" "$REPO/automation/guide-topics-queue.json" || COPY_OK=0
echo "-- 파일 복사 종료 --"
echo ""

echo "-- 복사 결과 확인 --"
for f in "content/guides/en/${SLUG}.mdx" "content/guides/ja/${SLUG}.mdx" "content/guides/ko/${SLUG}.mdx" "content/guides/es/${SLUG}.mdx" "automation/guide-topics-queue.json"; do
  if [ -f "$REPO/$f" ]; then
    echo "확인됨: $f"
  else
    echo "누락됨: $f"
    COPY_OK=0
  fi
done
echo ""

if [ "$COPY_OK" != "1" ]; then
  echo "오류: 콘텐츠 파일 복사에 실패한 항목이 있어 발행을 중단합니다."
  echo "이 창의 내용을 캡처해서 알려주시면 원인을 확인하겠습니다."
  echo "콘텐츠 파일은 삭제하지 않았습니다 (다시 시도 가능)."
  read -p "Enter를 누르면 창이 닫힙니다..."
  exit 1
fi

# --- 4.5. 디스커버 노출 대비 대표 이미지 자동 첨부 (Unsplash, ExifLens에서 이식 2026-09-03) ---
# 실패해도(네트워크 오류, API 키 없음 등) 발행 자체는 계속 진행됨 - 스크립트 내부에서 처리
python3 "$REPO/automation/attach-guide-image.py" "$REPO" "$SLUG"

python3 -c "
import pathlib
repo = pathlib.Path('$REPO')
changelog = repo / 'CHANGELOG.md'
snippet_path = pathlib.Path('$CONTENT_DIR/changelog-snippet.txt')
if snippet_path.exists():
    snippet = snippet_path.read_text(encoding='utf-8')
    content = changelog.read_text(encoding='utf-8')
    anchor = '# 개발 이력 (Development History)\n\n'
    if anchor in content and snippet.strip() not in content:
        content = content.replace(anchor, anchor + snippet + '\n', 1)
        changelog.write_text(content, encoding='utf-8')
        print('CHANGELOG.md 갱신 완료')
    else:
        print('CHANGELOG.md 갱신 건너뜀 (앵커 불일치 또는 이미 반영됨)')
else:
    print('changelog-snippet.txt 없음 - CHANGELOG 갱신 건너뜀')
"

# --- 5. git add / commit / push (각 단계 성공 여부 확인, 실패 시 콘텐츠 유지) ---
cd "$REPO"
[ -f .git/index.lock ] && rm -f .git/index.lock

echo ""
echo "-- git add --"
git add -v "content/guides/en/${SLUG}.mdx" "content/guides/ja/${SLUG}.mdx" "content/guides/ko/${SLUG}.mdx" "content/guides/es/${SLUG}.mdx" automation/guide-topics-queue.json CHANGELOG.md
IMAGE_PATH="public/guides/images/${SLUG}.webp"
[ -f "$REPO/$IMAGE_PATH" ] && git add -v "$IMAGE_PATH"

if git diff --cached --quiet; then
  echo ""
  echo "오류: git에 새로 반영할 변경사항이 없습니다 (이미 커밋되어 있거나, 파일 복사가 저장소 경로에 반영되지 않았을 수 있습니다)."
  echo "저장소 경로: $REPO"
  echo "이 창의 내용을 캡처해서 알려주시면 원인을 확인하겠습니다."
  echo "콘텐츠 파일은 삭제하지 않았습니다 (다시 시도 가능)."
  read -p "Enter를 누르면 창이 닫힙니다..."
  exit 1
fi

echo ""
echo "-- git commit --"
if ! git commit -m "feat: 가이드 아티클 추가 - ${TITLE} (자동 발행)"; then
  echo "오류: 커밋 실패. 콘텐츠 파일은 삭제하지 않았습니다."
  read -p "Enter를 누르면 창이 닫힙니다..."
  exit 1
fi

echo ""
echo "-- git push --"
if ! git push origin main; then
  echo "오류: push 실패(네트워크 등). 커밋 자체는 로컬에 남아 있습니다."
  echo "저장소 폴더에서 'git push origin main'을 직접 실행해 재시도해 주세요."
  read -p "Enter를 누르면 창이 닫힙니다..."
  exit 1
fi

# --- 6. 성공 시에만 정리 ---
rm -f "$CONTENT_DIR/guide-${SLUG}-en.mdx" "$CONTENT_DIR/guide-${SLUG}-ja.mdx" "$CONTENT_DIR/guide-${SLUG}-ko.mdx" "$CONTENT_DIR/guide-${SLUG}-es.mdx" "$CONTENT_DIR/new-queue.json" "$CONTENT_DIR/changelog-snippet.txt"

echo ""
echo "발행 완료 (커밋+push 확인됨): $TITLE"
echo "백업 위치: $BACKUP_DIR"
echo "5초 후 이 창이 닫힙니다."
sleep 5
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
