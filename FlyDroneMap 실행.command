#!/bin/bash
# 더블클릭으로 FlyDroneMap 개발 서버를 실행하는 원클릭 스크립트입니다.
# 1) 이 파일이 있는 프로젝트 폴더로 이동
# 2) 처음 실행이거나 의존성이 바뀐 경우 npm install 자동 실행
# 3) npm run dev 실행 (개발 서버가 준비되면 Chrome이 자동으로 열립니다)

cd "$(dirname "$0")"
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
