@AGENTS.md


## 백업 위치 규칙 (절대 준수)

이 프로젝트(`flydronemap`) 작업 전 백업을 생성할 때는 반드시 **이 폴더 내부**에 만든다: `.backups/backup_YYYYMMDD_HHMMSS`
상위 폴더(`Desktop/애드센스 제휴 마케팅/`)에 직접 백업 폴더를 만들지 않는다 (예: `../flydronemap_backup_...`, `../_backups/flydronemap_backup_...` 전부 금지).

## push용 .command 스크립트 — 자동 종료(osascript close) 관련 참고 (2026-09-02 발견)

`push_실행.command`류 스크립트 끝에서 `osascript -e 'tell application "Terminal" to close (every window ...)'`로
터미널 창을 자동 닫으면, 그 osascript 명령 자신이 아직 그 창에서 실행 중인 프로세스로 잡혀
"이 창에서 실행 중인 프로세스를 종료하시겠습니까? (bash, osascript)" 확인 팝업이 뜰 수 있음(타이밍에 따라
발생 여부가 다름 — 항상 재현되는 것은 아님). **push 성공 여부와는 무관한 현상**이며, 사용자가 팝업에서
"취소"를 누르면 스크립트가 정상적으로 이어서 자체 삭제까지 마무리됨. 다음에 이런 자동 종료 스크립트를
새로 만들 때는 `close` 호출을 `nohup ... & disown` 등으로 완전히 분리된 프로세스에서 실행하거나,
아예 "3초 후 자동 종료" 안내 대신 "완료되었습니다. 이 창은 직접 닫아주세요"로 문구를 바꾸는 것도
검토할 것(팝업 자체가 사용자 경험상 더 나쁠 수 있음).
