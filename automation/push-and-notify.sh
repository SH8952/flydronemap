#!/bin/bash
# push + IndexNow 자동 알림 (2026-10-30 추가)
# 푸시 스크립트(.command)가 `git push origin HEAD` 대신 이 파일을 호출하면,
# push 가 성공한 뒤 이번에 올라간 커밋들에서 바뀐 페이지 주소만 IndexNow 에 알린다.
# 알림은 백그라운드로 분리되어 터미널 종료를 막지 않으며, 실패해도 push 결과에는 영향이 없다.
# 사용법: bash automation/push-and-notify.sh [push 인자...]   (기본: origin HEAD)
cd "$(dirname "$0")/.." || exit 1
[ "$#" -eq 0 ] && set -- origin HEAD
BEFORE="$(git rev-parse --verify -q '@{u}' 2>/dev/null)"
git push "$@"
RC=$?
if [ "$RC" -eq 0 ] && [ -n "$BEFORE" ] && [ -f automation/indexnow-push-hook.py ]; then
  if python3 automation/indexnow-push-hook.py --range "${BEFORE}..HEAD" --detach; then
    echo "IndexNow 알림 예약됨: 배포 완료 후 바뀐 페이지 주소를 자동 전송합니다."
  else
    echo "(IndexNow 알림 예약 실패 - push 에는 영향 없음)"
  fi
fi
exit "$RC"
