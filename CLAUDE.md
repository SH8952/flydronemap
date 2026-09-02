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
