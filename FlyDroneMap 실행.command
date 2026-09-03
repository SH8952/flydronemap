#!/bin/bash
# 더블클릭으로 FlyDroneMap 개발 서버를 실행하는 원클릭 스크립트입니다.
# 1) 이 파일이 있는 프로젝트 폴더로 이동
# 2) 처음 실행이거나 의존성이 바뀐 경우 npm install 자동 실행
# 3) npm run dev 실행 (개발 서버가 준비되면 Chrome이 자동으로 열립니다)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_PATH="$SCRIPT_DIR/$(basename "$0")"
ICON_PATH="$SCRIPT_DIR/src/app/icon.png"

# --- 다른 스크립트와 헷갈리지 않도록 FlyDroneMap 로고 아이콘 적용 (실제 사이트 파비콘 재사용) ---
# (매번 실행할 때마다 재적용해도 무해함 - 이미 적용돼 있으면 그대로 유지됨. 2026-09-03 추가)
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

cd "$SCRIPT_DIR"
echo "▶ FlyDroneMap 프로젝트 폴더: $(pwd)"
echo ""

if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
  echo "▶ 의존성 설치가 필요합니다 (npm install)... 몇 분 정도 걸릴 수 있습니다."
  rm -rf node_modules 2>/dev/null
  npm install
  echo ""
fi

echo "▶ 개발 서버를 시작합니다..."
npm run dev
