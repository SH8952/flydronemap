#!/bin/bash
# 더블클릭으로 FlyDroneMap 개발 서버를 실행하는 원클릭 스크립트입니다.
# 1) 이 파일이 있는 프로젝트 폴더로 이동
# 2) npm run dev 실행 (개발 서버가 준비되면 Chrome이 자동으로 열립니다)

cd "$(dirname "$0")"
echo "▶ FlyDroneMap 개발 서버를 시작합니다: $(pwd)"
echo ""
npm run dev
