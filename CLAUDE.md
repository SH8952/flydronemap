@AGENTS.md


## 백업 위치 규칙 (절대 준수)

이 프로젝트(`flydronemap`) 작업 전 백업을 생성할 때는 반드시 **이 폴더 내부**에 만든다: `.backups/backup_YYYYMMDD_HHMMSS`
상위 폴더(`Desktop/애드센스 제휴 마케팅/`)에 직접 백업 폴더를 만들지 않는다 (예: `../flydronemap_backup_...`, `../_backups/flydronemap_backup_...` 전부 금지).

## push용 .command 스크립트 — 자동 종료(osascript close) 시 확인 팝업 뜨는 문제, 근본 해결됨 (2026-09-02)

`push_실행.command`류 스크립트 끝에서 `osascript -e 'tell application "Terminal" to close (every window ...)'`로
터미널 창을 자동 닫을 때, "이 창에서 실행 중인 프로세스를 종료하시겠습니까? (bash, osascript)" 확인 팝업이
뜬 적이 있었음. **원인**: 터미널 앱(Terminal.app) 자체의 Settings → Profiles → Shell 탭에 있는
"닫기 전에 확인"(Ask before closing) 설정이 기본값(로그인 셸 외의 프로세스가 있으면 확인)으로 되어 있어서,
스크립트가 자기 자신이 실행 중인 창을 강제로 닫으려 할 때마다 터미널이 확인을 요구했던 것 — 스크립트
코드 자체의 문제가 아니라 터미널 앱 설정 문제였음.

**해결 완료(사용자가 직접 적용, 2026-09-02)**: 터미널 Settings → Profiles → 기본 프로파일 → Shell 탭 →
"닫기 전에 확인"을 "안 함"(Never)으로 변경. 이후 순수 테스트 스크립트(`자동종료_테스트.command`,
git 이력에는 없음)로 재검증한 결과 팝업 없이 3초 후 정상적으로 창이 자동으로 닫히는 것을 확인함.
**따라서 push 스크립트는 원래 방식(작업 완료 메시지 출력 → 3초 대기 → osascript로 창 닫기 → 자체 삭제)을
그대로 사용하면 됨** — 별도의 nohup/disown 우회나 문구 변경은 불필요.

## push용 .command 스크립트 — 더블클릭이 중복 인식되어 두 인스턴스가 겹쳐 실행되는 경우 (2026-09-03 발견)

더블클릭이 간혹 두 번 인식되어 `push_실행.command`가 거의 동시에 두 프로세스로 실행된 사례 발견 — 실제 push
자체는 문제없이 성공했으나(두 번째 인스턴스는 `git push`가 "Everything up-to-date"로 나옴), 두 인스턴스가
동시에 같은 파일을 `rm -- "$0"`으로 지우려다 경합이 생겨 파일이 지워지지 않고 남는 현상이 있었음. 이후
새로 만드는 push 스크립트는 다음 두 가지를 반영할 것:
1. `rm -f -- "$0" 2>/dev/null || true` 처럼 이미 삭제된 경우에도 에러 없이 넘어가도록 처리.
2. `osascript`로 창을 닫을 때는 창 이름(`every window whose name contains "..."`) 대신 현재 세션의
   tty(`tty` 명령 결과)로 정확히 매칭해, 중복 실행 시 서로 다른 인스턴스의 창을 잘못 닫는 일이 없도록 함.
