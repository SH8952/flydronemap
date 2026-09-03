## 2026-09-03 — Contact(문의) 페이지 신규 추가 (애드센스 사전 대비)

- 배경: 같은 시리즈의 ExifLens(exifnd.com)가 애드센스 심사에서 "가치가 별로 없는 콘텐츠"로 반려되었고, 실제 원인 점검 과정에서 Contact 페이지 부재가 실질적 개선 여지로 확인됨. FlyDroneMap도 저장소를 점검해보니 Privacy/Terms/About/Disclosure는 있었지만 Contact 페이지가 없어 동일한 문제를 겪기 전에 선제적으로 추가
- 신규 파일: `src/app/[locale]/contact/page.tsx` — 기존 About/Privacy/Terms와 동일하게 `LegalPage` 공통 컴포넌트 + next-intl 번역 네임스페이스(`Contact`)를 사용하는 4개 언어(en/ko/ja/es) 지원 페이지. 이메일 문의처(skysmoga@gmail.com), 버그 제보/기능 제안, 비즈니스·제휴 문의 3개 섹션으로 구성
- 수정: `messages/{en,ko,ja,es}.json` — `Contact` 네임스페이스 및 `Footer.contact` 라벨 추가
- 수정: `src/components/site-footer.tsx` — 푸터 내비게이션에 Contact 링크 추가
- 수정: `src/app/sitemap.ts` — `STATIC_PATHS`에 `/contact` 추가
- 검증: 대상 파일 `npx eslint`, `npx tsc --noEmit` 통과. `npm run build` 정상 완료(160 → 164개 정적 페이지로 +4, en/ko/ja/es 4개 언어의 `/contact.html`이 모두 생성된 것을 직접 확인)

## 2026-09-03 (7) — 미국 공역(FAA) 조회 기능 신규 구현 + 지도 클릭 좌표 정규화 버그 수정

- 대한민국 공역 레이어 패널이 이미 완비된 것을 확인한 뒤, 미국(FAA)에도 동등한 기능을 붙이기로 하고 사전 자료조사부터 진행 — FAA의 공개 ArcGIS Online 조직(services6.arcgis.com/ssFJjBXIUyZDrSYZ)이 Class_Airspace, Special_Use_Airspace, FAA_Recognized_Identification_Areas 등을 키 없이 제공하는 것을 확인. WMS/MapServer(래스터 타일) 서비스는 없고 벡터 FeatureServer만 제공함을 확인해, 사용자 승인 하에 "지도 상시 오버레이" 대신 "클릭 시점 지점 조회" 방식으로 설계.
- 신규 파일: `src/lib/us-airspace-layers.ts`(레이어 카탈로그), `src/app/api/us-airspace-lookup/route.ts`(서버 프록시 — 클릭 지점을 FAA ArcGIS에 점(point) 좌표로 조회, 기존 `fetchFaaAirspaceCeiling`과 동일한 검증된 조회 방식 재사용), `src/lib/us-airspace-lookup-client.ts`(브라우저 측 호출 래퍼).
- `src/components/drone-dashboard.tsx` 수정: 한국이 아닌 지점 조회 시 위 API를 기존 대시보드 fetch와 병렬 요청, "공역 정보" 카드에 매칭된 구역(색상 점 + 이름 + 상세 라벨)을 표시하고 지도에는 대표 구역의 경계를 그림(기존 `krBoundary`/`restricted` prop을 국가 무관하게 재사용). 기존 FAA 고도 상한 정보(예: "400 ft AGL")는 그대로 유지.
- 4개 언어(ko/en/ja/es) `messages/*.json`에 `usAirspaceLayerNames` 네임스페이스(레이어 10종 이름) 추가.
- **버그 수정(안전 관련)**: FAA 서버 조회가 실패(요청 한도 초과 등)했을 때 이를 "확인 결과 제한 없음"으로 잘못 표시하던 문제를 발견해 수정 — 조회 실패 시 라우트가 명시적 오류 응답(HTTP 502)을 반환하도록 바꿔, 클라이언트가 "제한 없음"이라 확정적으로 표시하지 않고 "상세 데이터 준비 안됨"으로 정직하게 표시하게 함. 실제로 Edwards 공군기지(R-2508/R-2515 비행제한구역)에서 조회 실패가 "제한 없음"으로 표시되는 것을 사용자가 발견해 잡아낸 버그.
- 상한고도가 "무제한"인 구역(예: R-2508)에서 FAA의 센티널 값(`-9998`)이 그대로 노출되던 것을 "UNL" 표기로 개선.
- **버그 수정**: 지도를 옆으로 여러 바퀴 드래그한 뒤 클릭하면 Leaflet이 경도를 -180~180 범위 밖(예: 241.89)으로 반환해, 국가 판별(country-coder)이 실패하고 "공역 정보 (국가명)"에 국가명이 안 붙던 문제 발견 → `src/components/flight-map.tsx`의 `ClickHandler`에서 `e.latlng.wrap()`으로 정규화하도록 수정. 미국뿐 아니라 모든 국가 판별 로직에 영향을 미치던 구조적 버그였음.
- 참고: FAA Class E 공역 중 "E5"(700~1,200ft 상공부터 시작하는 광역 전이구역, 주 단위로 넓게 퍼짐)가 실제 지점 조회에서 주(state) 크기로 광범위하게 매칭되는 것을 확인 — FAA 공식 클래스 E 인가 규정상(Part 107.41) E2(공항 인근 지표면 구역)만 인가 대상이고 E3/E4/E5는 대상이 아님을 확인했으나, 사용자 판단 하에 이번 단계에서는 별도 필터링 없이 현재 동작(CLASS='E'면 모두 표시) 그대로 유지하기로 함 — 오류가 아닌 정상적인 FAA 데이터임.
- 이번 1단계에서 제외한 범위: 일반 임시비행제한구역(TFR, tfr.faa.gov) — JSON 피드 스키마 미검증으로 다음 단계로 보류.
- 검증: `tsc --noEmit`, `eslint`, `npm run build` 모두 통과. 실제 FAA 서버 응답은 이 환경 네트워크 제한으로 직접 확인 불가해 사용자가 로컬(`npm run dev`)에서 여러 실제 좌표(워싱턴DC, LA, Edwards 공군기지, 루이지애나)로 직접 검증.

## 2026-09-03 (6) — 상시 스크립트 2개(`FlyDroneMap 실행.command`, `automation/publish-guide.command`)에도 전용 아이콘 적용

- 사용자가 저장소 내 상시 재사용 `.command` 스크립트 중 아이콘이 없는 것들을 정리 요청 → `FlyDroneMap 실행.command`(개발 서버 실행), `automation/publish-guide.command`(가이드 자동 발행) 두 개가 기본 터미널 아이콘 상태임을 확인해 보고, 각각에 맞는 아이콘 제작·적용을 요청받아 진행.
- `FlyDroneMap 실행.command`: 별도로 새로 그리지 않고, 실제 사이트 로고/파비콘인 `src/app/icon.png`(512×512, 검정 라운드 사각형 배경 + 오렌지 Wind 아이콘)를 그대로 재사용해 적용.
- `automation/publish-guide.command`: 매일 06:00 자동 발행 스크립트라는 성격에 맞춰 알람시계 모양 아이콘을 신규 제작(`automation/assets/publish-icon.png`) — 기존 카메라(ExifLens)/드론(이미지변경사항_Push.command) 아이콘과 동일한 색상 팔레트(배경 `#111111`, 오렌지/브라운/크림)로 톤을 맞춤.
- 두 스크립트 모두 `이미지변경사항_Push.command`와 동일한 패턴(osascript `NSWorkspace setIcon:forFile:`)으로, 실행할 때마다 자기 자신에게 아이콘을 자동 재적용하는 코드를 추가.
- 작업 전 `.backups/backup_20260903_150819_persistent_script_icons/`에 두 스크립트 백업. `bash -n` 문법 검증, 실행권한(+x) 유지 확인.
- **참고(중요)**: `*.command`는 2026-09-02부터 `.gitignore`에 등록되어 신규 스크립트는 저장소에 커밋되지 않지만, `FlyDroneMap 실행.command`와 `automation/publish-guide.command`는 그 규칙이 생기기 전부터 이미 git에 추적되고 있던 파일이라 이번 수정이 로컬에 커밋되지 않은 변경사항(diff)으로 남아있음 — 커밋/push 여부와 새 아이콘 PNG 2개(`automation/assets/`)를 저장소에 포함시킬지는 사용자 확인 후 별도로 처리 예정.

## 2026-09-03 (5) — 이미지 변경사항 전용 상시 push 도구 신설 (`이미지변경사항_Push.command`), ExifLens에서 이식 + 드론 아이콘 신규 제작

- 배경: 개발자 이미지 관리 도구(브라우저 패널)로 대표 이미지를 재검색/교체/업로드한 뒤 매번 별도 커밋 메시지를 고민할 필요 없이, `content/guides`와 `public/guides/images` 변경사항만 자동으로 찾아 커밋+push하는 상시 도구가 필요함. ExifLens 프로젝트에 이미 동일한 목적의 `이미지변경사항_Push.command`가 있어 그대로 이식.
- 기존 1회성 push 스크립트(`push_실행.command` 등)와의 차이: 실행 후 스스로 삭제되지 않는 **상시 재사용 도구**임 — 이미지 관리 도구와 마찬가지로 사이트 운영 기간 내내 계속 씀.
- 신규 파일: 저장소 루트 `이미지변경사항_Push.command` — REPO 경로만 FlyDroneMap 경로로, 커밋 메시지의 Claude-Session URL을 현재 세션으로 조정. 로직(변경 감지 범위, 커밋 메시지 포맷, 3초 후 터미널 자동 종료, git lock 파일 정리)은 ExifLens 원본과 동일.
- 신규 아이콘: `automation/assets/dev-tool-icon.png`(512×512 PNG, 투명배경). ExifLens 원본은 카메라 모양이라 혼동을 피하기 위해, FlyDroneMap 전용으로 **드론 모양(상단뷰 쿼드콥터, 4개 로터+카메라 짐벌)** 아이콘을 새로 제작 — ExifLens 아이콘과 동일한 색상 팔레트(배경 `#111111` 라운드 사각형, 글리프 오렌지 `#E08D3D`/브라운 `#A8672B`/크림 하이라이트)로 톤을 맞춤. 스크립트 실행 시 `osascript`(NSWorkspace setIcon:forFile:)로 스크립트 파일 자체에 자동 적용됨.
- 작업 전 `.backups/backup_20260903_145751_image_push_tool/`에 백업. `bash -n`으로 문법 검증, 실행권한(+x) 부여 완료.
- 백필 스크립트(`이미지_백필_실행.command`)가 이미 실행되어 다수의 가이드 글에 이미지가 반영된 상태(`content/guides`, `public/guides/images`)를 확인 — 이 신규 스크립트로 커밋+push하면 됨(실제 실행은 사용자가 더블클릭으로 직접 진행).

## 2026-09-03 (4) — Unsplash API 키를 FlyDroneMap 전용 키로 교체 (ExifLens와의 요청 한도 공유 문제 해결)

- 배경: 가이드 이미지 자동 첨부/개발자 이미지 관리 도구용 Unsplash 키를 ExifLens와 공유해왔는데, 개발자 이미지 도구에서 검색 시도 시 `Unsplash 검색 실패 (403)` 발생. 사용자가 실제 터미널에서 `curl -i`로 확인한 결과 `x-ratelimit-remaining: 0`, 본문 `Rate Limit Exceeded` — ExifLens와 공유 중인 키가 시간당 요청 한도(Demo 등급 50회/시간)를 소진한 상태였음이 확정됨.
- 조치: 사용자가 예전에 발급받아 두고 쓰지 않던 별도 Unsplash 앱(Application ID 982954)의 이름/설명을 "FlyDroneMap" 전용으로 갱신하고, 이 앱의 신규 Access Key로 교체.
- 변경 파일(모두 gitignore 대상, git 이력에 포함되지 않음): `automation/.env`, `.env.local`의 `UNSPLASH_ACCESS_KEY` 값을 새 키로 교체. 코드 변경 없음.
- 백업: `.backups/backup_20260903_143948_unsplash_key_swap/`에 교체 전 두 파일 백업.
- 효과: 이제 FlyDroneMap과 ExifLens가 서로 다른 키(별도 시간당 50회 한도)를 사용하므로, 한 사이트의 사용량이 다른 사이트의 이미지 기능에 영향을 주지 않음.
- 참고: 로컬 개발 서버(`npm run dev`)가 이미 실행 중이었다면 `.env.local` 변경사항을 반영하기 위해 재시작이 필요함.

## 2026-09-03 — 구글 디스커버 대응(대표 이미지 자동 첨부) + 개발자 전용 가이드 이미지 관리 도구 (ExifLens에서 이식)

- 사용자가 ExifLens(exifnd.com) 프로젝트에서 이미 구현·검증·배포까지 완료한 두 기능(가이드 아티클 구글 디스커버 노출 대비 + 개발자 전용 이미지 관리 도구)의 이식 가이드 문서(`exiflens→flydronemap 이식 가이드.md`)를 전달하며 FlyDroneMap에도 적용 가능한지 검토 요청. `AskUserQuestion`으로 적용 범위(1번+2번 모두), Unsplash API 키 전략(ExifLens 키 재사용), 기존 발행 글 백필 여부(백필함) 3가지를 먼저 확인받은 뒤 진행.
- 적용 전 FlyDroneMap 실제 저장소를 ExifLens와 대조 확인: `GuideFrontmatter` 타입에 `tags` 필드는 이미 존재(호환), `layout.tsx`의 `robots`/`googleBot` 설정과 `guides/[slug]/page.tsx`의 이미지 렌더링/OG 이미지 연결 로직은 아직 없음(신규 추가 필요), 개발자 도구 관련 디렉터리(`src/lib/dev`, `src/app/api/dev`, `src/components/dev`) 전부 부재(신규 이식 필요) 확인.
- **작업 전 백업**: `.backups/backup_20260903_135902_exiflens_image_port/`에 수정 대상 파일(layout.tsx, guides.ts, guides/[slug]/page.tsx, publish-guide.command, .env.local, CHANGELOG.md) 백업.
- **1. 구글 디스커버 대응**: `src/app/[locale]/layout.tsx`의 `generateMetadata`에 `robots.googleBot["max-image-preview"]: "large"` 추가. `automation/attach-guide-image.py`(신규, ExifLens 로직 그대로 이식 — 영문 tags 앞 2개로 Unsplash 검색, 실패해도 예외 없이 조용히 건너뛰어 발행 파이프라인이 막히지 않도록 설계) 이식, `utm_source`만 `ExifLens`→`FlyDroneMap`으로 변경. `automation/publish-guide.command`에 콘텐츠 반영 직후 호출 지점(4.5단계) 및 이미지 파일 존재 시에만 git add하는 조건부 라인 추가. `src/lib/guides.ts`의 `GuideFrontmatter`에 `image`/`imageCredit`/`imageCreditUrl` 필드 추가. `guides/[slug]/page.tsx`에 대표 이미지 렌더링(`next/image`, `aspect-[16/9]`, `priority`)·"Photo by X on Unsplash" 저작자 표기·OG/트위터 이미지 연결 추가.
- **2. 개발자 전용 가이드 이미지 관리 도구**: `src/lib/dev/guide-image-tool.ts`(검색/적용/업로드 서버 로직), `src/app/api/dev/guide-image-{search,apply,upload}/route.ts`(3개, 전부 `NODE_ENV!=="development"`면 403), `src/components/dev/guide-image-dev-panel.tsx`(가이드 상세 페이지 우측 하단 플로팅 패널) ExifLens에서 그대로 이식, utm_source만 변경. `guides/[slug]/page.tsx`에 `NODE_ENV==="development"` 조건부 렌더링으로 연결.
- **3. 기존 발행 글 백필**: `automation/backfill-guide-images.py`(신규, ExifLens와 동일 로직) 이식 — 이미지 없는 기존 글(24개, `content/guides/en/*.mdx` 전체) 전체를 순회하며 일괄 첨부하도록 설계. 다만 **이 클라우드 세션(device_bash 포함) 자체는 조직 네트워크 정책상 `api.unsplash.com`으로 나가는 아웃바운드 연결이 막혀 있어(HTTP 403, VWorld/flydronemap.com 도메인과 동일한 종류의 기존 제약)** 이 세션에서 직접 실행하면 24개 전부 실패함을 실측 확인 — 스크립트 자체의 결함이 아니라 이 세션의 네트워크 제약. 사용자의 실제 맥 터미널(정상 네트워크)에서 더블클릭으로 실행하면 정상 동작할 것으로 예상되며, 실제 실행 결과는 사용자 확인이 필요.
- **환경변수**: `automation/.env`(신규, git 추적 제외)와 `.env.local`(기존 파일에 추가) 양쪽에 `UNSPLASH_ACCESS_KEY` 등록 — ExifLens와 동일한 키 재사용(사용자 확인). Vercel 환경변수에는 등록 불필요(이미지 첨부는 로컬/발행 시점 스크립트에서만 동작, 프로덕션 서버에서는 실행되지 않음). `.env.example`에도 안내 주석 추가.
- **기타**: `.gitignore`에 `__pycache__/`, `*.pyc` 추가(backfill 스크립트 실행 시 생성되는 파이썬 캐시가 실수로 커밋되지 않도록).
- 검증: `tsc --noEmit`/`eslint`(변경·신규 파일 전체 대상) 오류 0건, `npm run build` 정적 페이지 159/159 정상 생성(신규 API 라우트 3개 정상 등록 확인). 프로덕션 빌드 결과물(`.next/server/app`)에 개발자 패널 텍스트("이미지 관리 (DEV)")가 전혀 포함되지 않음을 grep으로 직접 확인 — ExifLens에서 이미 검증된 것과 동일하게 프로덕션에 노출되지 않음.
- **후속 조치 필요(사용자)**: (1) 코드 변경 커밋 push 후 실제 사이트 재배포 확인, (2) 기존 24개 글에 대한 이미지 백필은 별도 스크립트(`이미지_백필_실행.command`)를 맥에서 직접 실행해야 함(네트워크 제약으로 이 세션에서는 실행 불가), (3) 로컬 `npm run dev` 실행 후 가이드 상세 페이지에서 개발자 이미지 관리 패널이 정상 동작하는지 실사용 확인 권장.

## 2026-09-03 — 공역 레이어 패널: 잠긴(필수) 레이어를 항상 목록 맨 위로 고정

- 사용자가 예약 작업(FlyDroneMap 가이드 자동 발행) 대화방에서 실사이트를 확인하다가, "공역 레이어 표시" 패널에서 잠금 아이콘이 붙은 필수 레이어(관제권/비행금지구역/비행제한구역)가 다른 레이어들 사이에 섞여 나열되고 있는 것을 신고하고, 항상 목록 맨 위에 고정해달라고 요청. 그 대화방은 맥에 연결되지 않은 세션이라 코드 초안(diff)만 만들고 실제 저장소 반영은 하지 못한 채, 사용자에게 수동 백업/교체를 안내한 상태였음.
- 사용자가 이 세션(맥 연결됨)에 스크린샷을 첨부해 그 대화방의 요청·확인 내용을 그대로 전달 → 실제 저장소를 직접 확인한 결과 아직 변경사항이 반영되지 않았음을 확인하고, 동일한 내용을 이 세션에서 백업 후 정식으로 구현.
- 적용 범위는 그 대화방에서 이미 확정된 4가지 조건 그대로: (1) 지도 위 레이어가 그려지는 원본 배열(`AIRSPACE_LAYERS`, 지도 타일 겹침 순서에도 쓰임)은 건드리지 않고 패널에 "보여지는" 체크박스 목록 순서만 별도로 정렬, (2) 잠긴 항목끼리는 원래 순서 그대로(관제권→비행금지구역→비행제한구역), (3) 잠기지 않은 나머지 11개 항목도 원래 배열 순서 그대로 유지, (4) 이 규칙은 `AirspaceLayerPanel` 컴포넌트 자체에 들어가 있어 향후 레이어가 추가되어도 자동으로 유지됨.
- `src/components/airspace-layer-panel.tsx`: `AIRSPACE_LAYERS`를 안정 정렬(stable sort)해 `required`가 `true`인 항목만 앞으로 오도록 만든 `orderedLayers` 상수를 추가하고, 체크박스 목록 렌더링(`.map`)이 이 배열을 쓰도록 수정. 지도 컴포넌트(`drone-dashboard.tsx`)와 원본 카탈로그(`airspace-layers.ts`)는 전혀 수정하지 않음.
- 검증: `tsc --noEmit`/`eslint` 통과(오류 0건), `npm run build` 정적 페이지 전체 정상 생성. 실제 정렬 결과를 스크립트로 직접 출력해 관제권→비행금지구역→비행제한구역→나머지 11개(원래 순서 그대로) 순으로 나오는 것을 대조 확인.

## 2026-09-03 — 한국 공역 지점별 클릭조회 기능 실제 구현 및 실서버 검증 완료 (14개 레이어 전체)

- 사용자가 드론원스톱(drone.onestop.go.kr) 실제 레이어 패널 속성값에 "비행승인 필요/불필요" 문구가 있는지 문의 → 확인 과정에서 Claude가 첫 시도에 지도의 바다(비활성 지점)를 클릭하고 "빈 정보 확인됨"으로 잘못 결론 내린 실수를 사용자가 직접 지켜보고 정정("바다를 클릭했는데 주소가 나올 거라고 생각해?") — 실제 육지의 구역 밖 지점으로 다시 검증해 같은 결론(공식 사이트에도 "승인 불필요" 긍정 확인 문구는 없음)을 정확한 증거로 재확인.
- 사용자의 핵심 요청: "레이어를 각각 클릭해 말풍선 정보를 수집하고, 최소한 레이어 위를 클릭했을 때는 '이 위치에는 아직 상세 공역 지도 데이터가 준비되어 있지 않습니다' 문구가 나오지 않게" — 즉 그동안 정적 범례로 대체했던 지점별 조회 기능을 실제로 되살려 달라는 요청. `AskUserQuestion`으로 검증 방법을 먼저 확인받아 순서대로 진행: (1) 캔버스 픽셀 판독 기술 검증 → WMS 타일이 CORS 헤더를 전혀 보내지 않아(직접 `fetch`/`<img crossOrigin>`/`no-cors` 응답으로 재확인) 기술적으로 불가능함을 확정, (2) 클라이언트에서 GetFeatureInfo를 `referrerPolicy:"no-referrer"`로 재시도해도 여전히 503임을 재확인해 "Referer 문제일 뿐"이라는 기존 가설도 기각, (3) 마지막 남은 경로로 **서버(Vercel 함수)에서 GetFeatureInfo를 호출**하는 진단 라우트(`/api/debug-getfeatureinfo-test`, 정식 기능 아님)를 배포해 시험 — 클라이언트와 달리 503 없이 정상 응답됨을 발견(이전 세션의 "완전히 불가능" 결론을 뒤집는 발견).
- 이 세션 초반에 이미 한 번(직전 세션, 커밋 `b1d33ab`→`4ac6650`) "복구했다"고 판단했다가 실서버 재검증에서 다시 막혀 "포기"로 뒤집힌 이력이 있어, 사용자가 "정확히 구현 가능 여부를 깊게 고민 후 결정해"라고 명시적으로 요구 — 실제 기능 작성 전에 진단 라우트로 다음을 전부 실측 검증: 서버 호출이 재현 가능한지(여러 좌표·레이어 반복 성공), 브이월드 `VWORLD_API_KEY`(서버 전용)가 Vercel 실제 환경에서 `INVALID_KEY`로 무효임을 발견해 지도 타일에 이미 쓰이고 있어 유효함이 검증된 `NEXT_PUBLIC_VWORLD_API_KEY`로 전환, 14개 레이어를 한 요청에 모두 담아도 되는지(문서상 "최대 4개" 제한은 실측상 해당 없음, 200 OK 정상 응답), 구역 밖 지점이 에러 없이 빈 배열을 반환하는지, 응답에 `properties`(구역명·고도 등 실제 표시 가능한 속성값)가 포함되는지, 그리고 이번 세션에서 새로 발견한 의문점 — **한 지점에서 인접한 두 구역이 함께 반환된 것이 "정확한 지점 매칭"인지 "조회 반경(bbox) 안의 모든 것을 무차별 반환"하는 것인지** — 를 bbox 크기를 20배 줄여도 결과가 동일함(원전 중심점이 실제로 내부/외부 두 동심원 구역 모두에 포함되는 것이 사실)과, 한 구역의 경계 밖·다른 구역의 경계 안인 지점에서는 정확히 그 구역 하나만 반환됨을 직접 좌표로 대조 검증해 확정. 모든 검증 통과 후에만 `AskUserQuestion`으로 최종 실행 승인을 받고 구현 착수.
- 레이어마다 응답 속성 스키마가 서로 다름을 실측으로 확인(예: 비행금지구역은 `prh_lbl_1~4`, 관제권은 `ctr_lbl_1`, 장애물공역은 또 다른 필드명) — 14개 레이어 전부의 스키마를 사전 조사하는 대신, 필드명에 "lbl"이 포함된 값을 우선하고 없으면 사람이 읽을 만한 문자열 값을 범용으로 추출하는 방식을 채택해 미확인 레이어에서도 항상 안전하게 동작하도록 설계(카테고리명 자체는 항상 검증된 카탈로그 명칭을 쓰므로, 상세 라벨을 하나도 못 찾아도 최소 요구사항인 "정확한 구역 종류 표시"는 항상 보장).
- 신규 `src/app/api/airspace-lookup/route.ts`: 좌표 하나로 14개 레이어 전체를 한 번의 GetFeatureInfo 요청으로 조회, feature id 접두사를 `AIRSPACE_LAYERS` 카탈로그와 매칭해 레이어별 정규화 결과(`matches`)를 반환. `src/lib/airspace.ts`: 한국 공역 타입을 특정 레이어 전용 필드에서 범용 `matches` 배열로 교체(한 지점이 여러 구역에 동시에 걸칠 수 있음이 실측으로 확인됐기 때문). `src/lib/airspace-wms-lookup.ts` → `airspace-lookup-client.ts`로 개명·전면 교체: 항상 503으로 죽어 있던 브라우저 직접 호출 방식을 버리고 신규 서버 라우트를 호출하는 방식으로. `src/components/drone-dashboard.tsx`: "공역 정보" 카드가 매칭된 모든 구역을 레이어 색상 점+명칭+부가 라벨로 나열하도록 재작성.
- `messages/{ko,en,ja,es}.json`: 구역이 전혀 없을 때 뜨는 `krNoRestriction` 문구를 "비행금지구역 없음" 한정 표현에서 14개 레이어 전체 조회 기준의 일반 표현으로 수정(예: "이 위치에는 해당하는 공역 제한이 확인되지 않았습니다"), 더 이상 쓰이지 않는 `krRestrictedZone`/`krAltitudeRange` 키 제거. 기존 "요청 실패" 전용 문구(`airspaceNoData`, "아직 상세 공역 지도 데이터가 준비되어 있지 않습니다")는 API 자체가 실패했을 때만 남는 폴백으로 축소.
- 검증: `tsc --noEmit`/`eslint`(무관한 기존 경고 1건 제외 신규 없음)/`npm run build`(정적 페이지 153/153, 신규 라우트 정상 등록) 모두 통과. 브이월드 도메인 제한으로 로컬 개발 서버 검증이 구조적으로 불가능해(기존부터 있던 예외 상황), 배포 후 실제 프로덕션 사이트에서 최종 검증: 고리원전 지점 검색 시 "공역 정보" 카드에 **비행금지구역(RK P61A · SFC · 10000ft AMSL · 원전 관련 임시 (금지)공역)과 위험지역(D1 · 10 000 AGL · GND) 두 구역이 동시에 정확히 표시**되는 것을 실제 화면으로 확인 — 더 이상 "데이터 없음" 문구가 뜨지 않고 실제 조회 결과가 나타남. 진단 전용 라우트(`/api/debug-getfeatureinfo-test`)는 검증 완료 후 삭제.

## 2026-09-02 — 공역 레이어를 드론원스톱 공식 14종으로 정리 + "공역 정보" 박스에 활성 레이어 텍스트 범례 추가 (지점별 클릭조회는 최종 포기)

- 사용자가 실사이트에서 한빛원자력발전소 인근("RK P63B" 표시 지점)을 클릭해도 "공역 정보" 박스가 "데이터 없음"에서 전혀 바뀌지 않는다고 신고. 조사 결과 VWorld WMS `GetFeatureInfo`는 **요청에 Referer 헤더가 실려 있기만 하면 도메인과 무관하게 항상 HTTP 503**으로 실패하고, Referer 없는 직접 URL 접속에서만 성공함을 확인 — 직전(같은 날 앞선 이력)에 "간접 검증"으로 배포 판단했던 근거(직접 URL 호출 테스트)가 우연히 이 실패 조건을 피해가는 방식이었을 뿐이었다는 방법론적 오류를 인정하고 사용자에게 사과.
- 사용자 요청으로 VWorld 마이포털 계정 설정을 조사하는 과정에서 두 차례 잘못된 판독(체크박스 미체크 오판, 개발키/운영키 구분을 원인으로 오추정)을 사용자가 직접 정정해줌. 사용자가 활용API 전체를 재점검·재저장한 뒤에도 동일한 503이 재현되어, 계정 설정과는 무관함이 최종 확인됨 — 근본 원인 불명, 브이월드 고객센터 문의가 유일한 남은 경로로 판단.
- 사용자와 협의해 지점별 클릭조회 기능은 최종적으로 포기하고 두 가지 대안으로 대체하기로 결정: (1) 공역 레이어 패널을 22종에서 한국 드론원스톱(drone.onestop.go.kr) 공식 사이트와 동일한 **14종**으로 정리, (2) "공역 정보" 박스에 현재 지도에 표시 중인 레이어를 색상+명칭 텍스트 범례로 보여주는 기능 신규 추가.
- 드론원스톱 지도 페이지(`https://drone.onestop.go.kr/common/flightArea`)의 레이어 패널을 직접 열어 `read_page`(접근성 트리)로 각 체크박스의 실제 `name`(=VWorld WMS 레이어ID)과 라벨을 읽어 14개 항목·정확한 코드·표시 순서를 확정(추측 없이 그 사이트 자체의 DOM 값 기준) — UA)초경량비행장치공역/관제권/경계구역/비행금지구역/비행제한구역/비행장교통구역/경량항공기 이착륙장/위험지역/드론시범사업구역/장애물공역/사전협의구역/임시비행금지구역/문화재보호도/국립자연공원.
- `src/lib/airspace-layers.ts`: `AIRSPACE_LAYERS`를 14개로 정리·재배치(기존 9개는 코드 재사용, "위험구역"→"위험지역" 명칭만 공식 명칭에 맞춰 수정, 5개 신규 항목을 확정된 데이터코드로 추가, 제거된 13개는 코드베이스 전체에서 참조 없음을 확인). 필수 3종(비행금지구역/관제권/비행제한구역) 잠금 UX는 변경 없이 유지.
- `src/components/drone-dashboard.tsx`: "공역 정보" 카드 하단에 현재 활성 레이어를 색상 점+한글명으로 나열하는 신규 블록 추가 — 완전히 클라이언트 상태(`activeLayerIds`) 기반이라 VWorld 호출과 무관하게 항상 지도 상태와 일치.
- `messages/{ko,en,ja,es}.json`: `airspaceLayerNames`를 14개 키로 재정렬(13개 제거, 5개 신규 4개 언어 번역 추가), 범례 제목용 `airspaceActiveLayersTitle` 신규 키 4개 언어 추가.
- 검증: `tsc --noEmit`/`eslint` 통과(무관한 기존 경고 1건 제외 신규 없음, 범례 블록에서 발생한 `selected` null 가능성 타입 오류 1건은 `selected &&` 가드로 즉시 수정), `npm run build` 정적 페이지 151/151 생성 성공. `device_bash`로 띄운 `npm run dev`가 호출 종료와 함께 죽는 제약을 재확인해, 한 번의 호출 안에서 서버 기동+`curl`로 4개 언어 전체 200 확인+종료까지 마치는 스모크 테스트로 대체 — 콜드스타트 중 일시적 JSON 파싱 오류 로그가 한 차례 있었으나 메시지 파일 전부 유효함을 별도 확인했고 곧바로 정상 응답됨을 재확인.

## 2026-09-02 — VWorld WMS GetFeatureInfo로 지점별 비행금지구역(공역) 조회 기능 복구

- 사용자가 "공역 레이어가 지도에 표시된다면 비행 가능 여부도 확인할 수 있지 않냐"고 문의 → 이미 정상 작동 중인 WMS 타일(GetMap)과 같은 서버(`api.vworld.kr/req/wms`)가 표준 OGC 부가 오퍼레이션인 `GetFeatureInfo`도 지원함을 확인 — 서버사이드 호출을 막던 Vercel IP 차단을 그대로 우회하는 기존 방식(브라우저 클라이언트 직접 호출)을 동일하게 적용할 수 있음을 발견. 이전에 "미도입 확정"으로 결론 내렸던 지점별 상세조회 기능이, 접근 방식을 바꾸면 실제로 가능함이 드러남.
- 사용자 요청에 따라 실제 배포 사이트가 아닌 로컬 `localhost:3000/ko`에서 먼저 검증 후에만 커밋/push하기로 하고, 이후 "앞으로는 배포 사이트에서 테스트하지 말고 항상 localhost 먼저 확인 후 배포"를 전역 원칙으로 확정.
- 신규 `src/lib/airspace-wms-lookup.ts`: 클라이언트(브라우저)에서 직접 `GetFeatureInfo`를 호출해 대한민국 비행금지/제한구역 정보(구역명·분류·고도범위·경계 폴리곤)를 조회. `src/lib/airspace.ts`: 프로덕션에서 단 한 번도 성공한 적 없던 구 서버사이드 `fetchKoreaAirspaceCeiling`을 제거하고 대한민국은 클라이언트 조회로 위임하도록 단순화. `src/components/drone-dashboard.tsx`: `loadDashboard`에서 서버 대시보드 호출과 신규 클라이언트 공역 조회를 병렬 실행 후 결과 병합.
- 구현 과정에서 실제 응답 데이터(고리원자력발전소 인근 RK P61A/RK P61B 임시 금지공역)로 검증하다가, 구 서버사이드 코드에 있던 실제 버그를 하나 더 발견: 고도 필드 매핑이 반대(하한/상한이 뒤바뀜, `prh_lbl_2`="SFC"가 하한인데 상한으로 매핑되어 있었음)로 되어 있었음 — 한 번도 성공적으로 실행된 적이 없어 지금까지 발견되지 못했던 버그. 새 코드에서 올바르게 수정(`lowerAltitude: prh_lbl_2`, `upperAltitude: prh_lbl_3`).
- 검증: `tsc --noEmit`/`eslint` 통과(무관한 기존 경고 1건만 남음), `npm run build` 성공. Claude in Chrome으로 사용자의 `localhost:3000/ko`에서 실사용 검증을 시도한 결과, 국가별 동적 "공역 정보" 박스는 정상 확인되었으나 **VWorld API가 요청의 실제 Referer(출처 도메인) 기준으로 등록된 프로덕션 도메인(flydronemap.com)만 허용**하고 있어, 신규 기능뿐 아니라 기존에 이미 정상 작동 중이던 공역 레이어 타일 표시까지도 localhost에서는 구조적으로 테스트가 불가능함을 확인(코드 회귀가 아닌 VWorld 측 도메인 제한 정책). 대신 동일한 요청 URL을 페이지 밖에서 직접 호출해 실제 데이터가 코드의 파싱 로직·고도 매핑과 정확히 일치함을 별도로 확인, 사용자에게 이 제약을 투명하게 보고하고 진행 방식을 확인받은 뒤(간접 검증 후 배포) 커밋(`b1d33ab`) 및 push 스크립트 배치 진행.

## 2026-09-02 — 공역 정보 박스, 클릭 위치 국가에 따라 동적으로 표시 (전 세계 대응)

- 사용자 요청: 지도 클릭 시 지점별 공역 상세정보 조회 기능은 추가하지 않는 대신, 화면의 "공역 정보 (미국 / 대한민국)" 박스가 실제 클릭/검색된 위치의 국가에 맞춰 (1) 제목의 국가명, (2) 부연설명 문구, (3) 해당 국가 규정 확인 버튼+링크를 동적으로 보여주도록 요청. 개발자가 전 세계 어디서 이용하더라도 국가 판별 정확도가 높아야 한다는 요구사항에 따라, 단순 좌표 범위(bounding box) 추정이 아니라 정확한 방법을 채택.
- **국가 판별**: `@rapideditor/country-coder`(OpenStreetMap 공식 편집기 iD에서 실사용 중인 라이브러리) 신규 설치 — 실제 국경 폴리곤 데이터 기반으로 좌표를 ISO 3166-1 alpha-2 국가코드로 변환, 완전히 오프라인 동작(네트워크 호출 없음)이라 이전에 문제였던 외부 API 차단/비용 이슈가 전혀 없음. 해외 영토가 있는 국가(미국/프랑스/러시아 등)도 정확히 처리. 신규 `src/lib/country-info.ts`에 래핑.
- **국가명 표시**: 이미 규정 카탈로그(country-regulations.ts)가 있는 4개국(미국/한국/일본/스페인)은 기존 `Regulations.countries.{id}.name` 번역을 그대로 재사용해 사이트 전체와 표기를 통일. 그 외 약 190여개국은 브라우저 내장 `Intl.DisplayNames` API로 4개 언어(ko/en/ja/es) 모두 자동 번역 — 전 세계 국가명을 별도로 하나하나 번역해 넣을 필요가 없음.
- **동작**: 4개 우선 지원국은 기존 국가별 규정 요약 문구(첫 문장)를 재사용해 부연설명으로 보여주고, 하단에 "{국가명} 규정 확인" 버튼으로 해당 국가의 공식 기관 링크(country-regulations.ts에 이미 정리된 FAA/드론원스톱/DIPS2.0/AESA)를 연결. 그 외 국가는 국가명만 표시하고 부연설명은 일반 안내 문구로 대체, 버튼/링크는 넣지 않음(사용자 확정 방침). 국가 판별이 아예 안 되는 좌표(공해상 등)는 국가명 없이 중립적인 문구로 대체.
- `src/components/drone-dashboard.tsx`: 검색/지도 클릭/GPS/IP 자동 위치 4가지 진입 경로가 모두 거치는 단일 지점(`loadDashboard`)에서 국가 코드를 계산해, 진입 방법과 무관하게 항상 일관되게 반영되도록 구현.
- `messages/{ko,en,ja,es}.json`: 기존 고정 문구였던 `airspaceSectionTitle`/`airspaceDisclaimer`를 제거하고 동적 조합용 신규 키(`airspaceSectionTitleWithCountry`/`Generic`, `airspaceDisclaimerPrioritySuffix`/`Generic`/`UnknownLocation`, `airspaceRegulationCheckButton`) 4개 언어 전체 추가. `airspaceNoData` 문구도 "FAA 시설 지도 데이터가 없습니다"라는 미국 한정 표현에서, 어느 나라든 자연스러운 일반 표현으로 수정.
- 진행 전 `AskUserQuestion`으로 적용 범위(4개국 우선 vs 전세계)와 미지원 국가 처리 방식을 먼저 확인받았고, 구현 착수 직전 국가 판별 정확도 요구사항이 드러나 방법(정밀 오프라인 라이브러리 vs 추가 API 호출 vs 손수 작성한 bbox 데이터)을 다시 확인받은 뒤 진행.
- 검증: `tsc --noEmit`/`eslint` 통과(오류 0건, 무관한 기존 경고 1건만 남음), `npm run build` 정적 페이지 전체 재생성 성공. 국가 판별 로직이 완전히 클라이언트 사이드·오프라인 동작이라 이번 세션의 네트워크 제약(googleapis.com 등 외부 API 차단)과 무관 — 다만 실제 브라우저 동작 확인(한국/일본/스페인/미지원국 각각 클릭했을 때 박스가 올바르게 바뀌는지)은 사용자의 로컬 `npm run dev` 확인이 필요.

## 2026-09-02 — 한글 주소 검색을 구글 Places API로 전환 (브이월드 IP 차단 우회) + 저장소 설정 정리

- 사용자가 "한글 주소 검색 시 연관검색어가 더 이상 뜨지 않는다"고 문의 → 원인은 새 버그가 아니라 기존에 알려진 브이월드-Vercel IP 차단 문제였음을 코드로 확인(`searchKoreaAddress`가 브이월드 호출 실패 시 조용히 빈 배열을 반환하고, 한국 도로명 주소를 거의 인식하지 못하는 Open-Meteo 글로벌 지명 검색으로 넘어가던 것이 원인).
- 사용자가 대안으로 구글 지도 API 사용 가능 여부 문의 → 구글 Places/Geocoding API는 Vercel 등 특정 서버 IP를 차단하지 않는 상용 API라는 점을 확인 후, 구글 지도(Places+Geocoding) 방식으로 진행하기로 결정.
- `src/lib/geocode.ts`: `searchKoreaAddress()`의 백엔드를 브이월드 `req/search`에서 구글 Places API(New) `places:searchText`(regionCode=KR, languageCode=ko)로 교체. 필드마스크를 최소로 지정해 구글의 더 저렴한 "Text Search Essentials" 요금제(월 10,000건 무료)를 적용받도록 함. 기존과 동일하게 `GOOGLE_PLACES_API_KEY` 미설정/요청 실패 시 조용히 빈 배열을 반환해 Open-Meteo 폴백으로 안전하게 넘어감 — 호출부(`searchLocations`)는 변경 없음.
- `.env.example` 갱신: 이 파일이 그동안 `.gitignore`의 `.env*` 패턴에 걸려 한 번도 git에 커밋된 적 없었던 것을 발견(`!.env.example` 예외 규칙 추가로 수정) — 겸사겸사 그동안 이 파일에 누락되어 있던 `VWORLD_API_KEY`/`VWORLD_DOMAIN`/`NEXT_PUBLIC_VWORLD_*` 4종과 신규 `GOOGLE_PLACES_API_KEY`를 문서화.
- `.gitignore`에 `_삭제해도되는파일_*/`(정리용 임시 폴더 패턴) 규칙 추가 — 자동 push 스크립트의 `git add -A`가 정리 대상 파일을 실수로 커밋하지 않도록 사전 방지.
- **조치 필요(사용자)**: 구글 클라우드 콘솔에서 프로젝트 생성 → "Places API (New)" 활성화 → 결제 계정 등록(월 10,000건 무료) → 해당 API로 제한된 API 키 발급 후, 맥 저장소의 `.env.local`과 Vercel 환경변수(Production+Preview)에 `GOOGLE_PLACES_API_KEY`로 등록해야 실제로 동작함. 키 등록 전까지는 기존과 동일하게 조용히 폴백되어 사이트 동작에 영향 없음.
- 검증: `tsc --noEmit`/`eslint` 통과(오류 0건), `npm run build` 정적 페이지 151/151 생성 성공(마지막 export-detail.json EPERM만 발생, 기존과 동일한 무해한 현상). 실제 구글 API 키가 없어 런타임 동작(실제 검색 결과 반환)까지는 이 세션에서 검증하지 못함 — 키 등록 후 사용자 확인 필요.
- **후속 업데이트(같은 날)**: 사용자가 구글 클라우드 콘솔의 "Maps Platform 간편 설정" 온보딩으로 API 키를 발급 — 이 방식이 기본값으로 "HTTP 리퍼러" 애플리케이션 제한 + 구글 지도 관련 API 35개 전체 허용 상태로 키를 생성한다는 것을 확인. 서버사이드(Vercel Next.js API 라우트)에서 호출하는 키라 Referer 헤더가 실리지 않아 그대로 두면 요청이 거부되는 문제라, 애플리케이션 제한을 "없음"으로, API 제한을 "Places API (New)" 단독으로 재설정하도록 안내 후 사용자가 콘솔에서 직접 수정·저장. 발급된 키를 맥 저장소 `.env.local`에 `GOOGLE_PLACES_API_KEY`로 반영(반영 전 `.backups/backup_20260902_144655_env_local/`에 기존 `.env.local` 백업). 클라우드/원격 셸 양쪽 모두 조직 네트워크 정책상 googleapis.com 직접 연결이 막혀 있어 Claude가 직접 응답을 검증하지는 못했고, 대신 사용자가 로컬 `npm run dev`로 직접 테스트 — "마장로 543번길" 검색 시 "마장로543번길, 인천광역시 계양구 마장로543번길 · 대한민국" 결과가 정상적으로 뜨는 것을 스크린샷으로 확인, 구글 Places API 전환이 실제로 정상 동작함이 검증됨. ~~**남은 조치(사용자)**: Vercel 프로젝트 환경변수(Production+Preview)에 동일한 `GOOGLE_PLACES_API_KEY` 등록 필요~~ → **해결됨(같은 날 후속)**: firelic 프로젝트에서 먼저 검증된 방식대로, 새로 로그인하는 게 아니라 사용자가 이미 로그인해 둔 브라우저 세션을 Claude in Chrome 브라우저 자동화로 그대로 이용해 vercel.com/moneypick/flydronemap/settings/environment-variables에서 직접 등록(사용자에게 명시적 진행 확인을 받은 뒤 수행). Production+Preview 두 범위 모두 선택해 저장 완료, "Updated Environment Variable successfully" 토스트로 확인됨. **다만 현재 Vercel main 브랜치에는 이 기능의 코드(구글 Places API 전환)가 아직 반영되어 있지 않아**, `regulations_push.command` 실행으로 코드가 push된 뒤에야 이 환경변수가 실제로 쓰이는 새 배포가 만들어짐 — 그 전까지는 지금 Redeploy를 눌러도 의미가 없어 보류함. **최종 업데이트(같은 날)**: push 시도가 3회 연속 "스크립트가 사라졌는데 아무것도 반영되지 않음" 상태로 실패해 원인을 조사한 결과, 저장소에 예전(8/26·8/30·9/2 12:25)에 중단된 git 작업이 남긴 잠금파일(`.git/index.lock`, `.git/HEAD.lock` 등 4건)이 모든 커밋 시도를 막고 있었던 것이 원인으로 밝혀짐 — 기존 스크립트가 커밋 성공 여부를 확인하지 않고 다음 단계로 넘어가는 구조라, 실패해도 "push할 커밋이 없습니다(=이미 최신)"로 표시되며 정상 종료된 것처럼 보이고 스크립트가 자체 삭제되어 매번 재현·진단이 어려웠음. 실행 중인 git 프로세스가 없음을 먼저 확인한 뒤 잠금파일을 전량 삭제, Claude가 device_bash로 직접 커밋(`9535d97`) 완료 — 다만 push는 맥 키체인 인증이 필요해 device_bash에서는 여전히 불가함을 재확인. 커밋/push 실패 시 이제 창이 자동으로 닫히지 않고 오류가 그대로 남도록 개선한 push 전용 스크립트를 사용자가 맥 터미널에서 직접 실행해 push 성공(`4c7be6e..9535d97`), `git fetch origin main`으로 원격 반영 확인. Vercel Production 배포(`dpl_HHYkT7ieQrMt73G9urP3EKymvMYF`)도 READY 상태로 정상 배포되어, 구글 Places API 전환 기능이 이제 실서버에 완전히 반영됨.

## 2026-09-02 — 공역 레이어 패널 스크롤 잘림 버그 수정

- 사용자가 스크린샷과 함께 "레이어 패널에서 방공식별구역 아래로 스크롤이 안 된다"고 신고. 원인 진단: 패널 자체는 `max-h-[60vh] overflow-y-auto`로 스크롤 가능하게 되어 있었으나, 패널의 위치 기준 조상이 지도 wrapper(`h-72`/`sm:h-96`, `overflow-hidden`)이고 `60vh`가 이 wrapper의 실제 높이(288px/384px)보다 훨씬 커서, 패널이 wrapper 하단에서 스크롤바째로 잘려 보이지 않던 것이 원인.
- `src/components/airspace-layer-panel.tsx`: 패널 높이를 뷰포트 기준(`60vh`) 대신 지도 wrapper 높이에 맞춘 반응형 고정값(`max-h-56`/`sm:max-h-80`)으로 변경 — 어떤 화면 크기에서도 지도 영역 안에서 잘리지 않고 자체 스크롤이 정상 동작하도록 수정.
- 검증: `tsc --noEmit`/`eslint` 통과(오류 0건), `npm run build` 정적 페이지 151/151 생성 성공(마지막 export-detail.json 정리 단계의 무해한 EPERM만 발생, 기존과 동일한 이 환경 특유 현상).

## 2026-09-02 — 자동 push 스크립트 방식 복원 + 저장소 정리(.gitignore)

- 사용자 요청: device_bash로 맥 로컬 저장소에 직접 커밋까지는 가능하지만 push는 맥 키체인 인증이 필요해 device_bash로 실행 불가 — 최근 세션에서 "터미널에 git push 직접 입력" 방식으로 안내했던 것을, 이 프로젝트에서 이미 정착되어 있던 방식(GA4/파비콘/폴더이동 배포 때 썼던 더블클릭 `.command` 스크립트, 원클릭 자동 커밋+push+완료 후 3초 내 터미널 종료 및 스크립트 자체 삭제, 작업 폴더에 스크립트 자동 배치)으로 되돌려달라는 피드백을 받고 원복.
- `regulations_push.command`를 저장소 루트에 직접 생성(device_bash로 맥 폴더에 바로 작성) — 더블클릭 시: 추적 중인 파일에 변경사항 있으면 자동 `git add -A && git commit` → `git push origin main` → 완료/실패 메시지 출력 → 3초 후 Terminal 창 자동 종료(`osascript`) + 스크립트 자체 삭제(`rm`).
- 스크립트가 `git add -A`를 자동 수행하는 특성상, 저장소에 남아있던 임시 산출물(`.next.stale.*` 빌드 잔재 3개, `tsc_ga4_check.log`, `flydronemap_project_summary.md`, 스크립트 파일 자신)이 다음 실행 때 의도치 않게 커밋될 위험을 사전 점검으로 발견 — 부작용 방지를 위해 `.gitignore`에 `*.command`, `.next.stale.*/`, `*.log`, `flydronemap_project_summary.md` 규칙 추가 후 재확인, 정상적인 소스 변경분(`.gitignore` 자체)만 남는 것을 확인.
- 향후에도 device_bash가 직접 push할 수 없는 모든 배포 작업은 이 `.command` 자동 스크립트 방식을 기본으로 사용(Claude 메모리에 표준 작업 방식으로 기록).

## 2026-09-02 — "국가별 드론 규정 안내" 신규 섹션 추가 (/regulations)

- 사용자가 DJI 공식 FlySafe(fly-safe.dji.com)를 참고 모델로 제시하며 "국가별 대략적인 규정 안내 + 공식 기관 링크"를 요청, 협의 끝에 확정된 범위대로 구현: 기존 대시보드는 그대로 유지, 별도 섹션(`/regulations`)으로 신설. 초기 지원국은 사이트가 이미 지원하는 4개 언어(en/ko/ja/es)에 대응하는 미국·한국·일본·스페인. 지도 데이터가 이미 있는 미국(FAA)·한국(VWorld)은 홈 지도에서 공역을 색상으로 확인하도록 안내하고, 아직 데이터가 없는 일본·스페인은 1차로 텍스트 요약 + 공식 링크만 제공.
- 신규 파일: `src/lib/country-regulations.ts`(국가별 구조적 데이터 카탈로그), `src/app/[locale]/regulations/page.tsx`(국가 목록), `src/app/[locale]/regulations/[country]/page.tsx`(국가별 상세 — 규정 요약 3문단 + 지도 안내/공식 링크). `src/components/site-header.tsx`에 데스크톱/모바일 내비게이션 링크 추가, `src/app/sitemap.ts`에 `/regulations` 및 국가별 상세 페이지 16개(4언어×4국가) 등록.
- `messages/{ko,en,ja,es}.json`에 `Header.regulationsNav` 및 `Regulations` 네임스페이스(제목/부제/면책 문구/국가별 명칭·소관기관·규정 요약 3문단·링크 라벨) 전체 신규 번역 추가 — 4개 언어 모두 직접 작성(기계 번역이 아닌 각국 공식 사이트 조사 기반).
- 각국 규정 요약은 공식 기관 페이지(FAA faa.gov/uas, 대한민국 드론원스톱 drone.onestop.go.kr, 일본 국토交通省 DIPS2.0, 스페인 AESA seguridadaerea.gob.es)를 직접 조사해 작성. 페이지에는 "법적 자문 아님, 공식 기관에서 최신 규정 확인" 면책 문구를 상단에 고정 노출.
- 이 기능은 사용자가 해외 체류로 맥북 접근이 불가능한 상태에서 클라우드 전용 clone(커밋 `bb9f201`)으로 먼저 구현되었고, 맥이 다시 연결된 뒤 변경 파일 9개(신규 3개 + 수정 6개, CHANGELOG 제외)를 맥 로컬 저장소에 반영·병합함.
- 검증: `tsc --noEmit` 통과(오류 0건), `eslint` 통과(기존부터 있던 무관한 경고 1건 제외), `npm run build` 정적 페이지 151/151 생성 성공(신규 `/regulations`, `/regulations/[country]` 16개 페이지 포함) — 맥 로컬 저장소에서 재검증 완료.
- 참고: 미국/한국 상세 페이지의 "홈에서 지도로 확인하기" 링크는 위치를 자동으로 지정해주지는 않음(홈 화면에서 직접 검색 필요) — 지도에 특정 위치를 자동으로 미리 채워주는 딥링크 기능은 이번 범위에서 제외하고 추후 개선 과제로 남겨둠.

## 2026-09-02 — VWorld 서비스URL 수정으로 WMS 503 오류 해결 확인

- 사용자가 브이월드 마이포털 인증키 관리 화면에서 서비스URL을 `https://flydronemap.com`(www 없음) → `https://www.flydronemap.com`으로 수정 완료
- Claude가 실제 배포 사이트(https://www.flydronemap.com/ko, 인천 지점)에서 Claude in Chrome으로 재검증: 페이지에 로드된 VWorld WMS 타일 72개 전수 조사 결과 전부 정상 로드(complete: true, 256x256, 깨진 이미지 0건) — 지난번 발견된 503 오류가 해결됨을 확인
- 이전 진단(바로 위 항목)에서 추정한 "서비스URL에 www 버전 도메인이 등록되어 있지 않아 Referer 불일치로 거부되었다"는 가설이 사용자의 실제 등록 정보 확인 및 이번 수정으로 사실로 확인됨
- 코드 변경 없음(VWorld 대시보드 설정 변경 + 실사이트 재검증만 수행) — 공역 레이어 지도 오버레이 기능 정상 복구

## 2026-09-02 — push 완료 확인 + 실서버 재검증 중 신규 버그 발견 (VWorld WMS 요청 503, 도메인 등록 불일치 의심)

- 이전 커밋(`94fdae9` WMS 전환, `2f66e57` 이력 기록) GitHub push 완료 확인, Vercel Production 배포(`2f66e57`)에 정상 반영되었고 `NEXT_PUBLIC_VWORLD_API_KEY`/`NEXT_PUBLIC_VWORLD_DOMAIN` 환경변수도 Production/Preview에 정상 등록되어 있음을 확인
- 그러나 실제 배포된 사이트(https://www.flydronemap.com)에서 한국 지점(인천)을 선택해 확인한 결과, 필수 공역 레이어 3종의 WMS 타일 요청이 전부 HTTP 503으로 실패하여 지도에 여전히 아무것도 렌더링되지 않는 신규 문제를 발견
- 진단(Claude in Chrome으로 동일 WMS 요청을 세 가지 방식으로 비교 테스트):
  1. 실제 페이지 안에서 자동 발생하는 `<img>` 요청(Referer: `https://www.flydronemap.com/...` 자동 포함) → 503 실패
  2. 새 탭 주소창에 동일 URL을 직접 입력해 접속(Referer 없음) → 정상 이미지 응답
  3. 페이지 안에서 URL의 `domain` 쿼리 파라미터만 `https://www.flydronemap.com`으로 바꿔 재요청 → 그래도 503 실패
- 결론(추정): VWorld가 요청을 거부하는 기준은 URL의 `domain` 쿼리 파라미터 값이 아니라 실제 HTTP Referer 헤더로 보임. 사이트가 실제로는 `www.flydronemap.com`으로 서비스되는데(무-www 도메인 접속 시 자동 리다이렉트 확인됨) VWorld 인증키에 등록된 허용 도메인 목록에 `www.flydronemap.com`이 없어 거부되고 있을 가능성이 높음 — 다만 VWorld 마이페이지 로그인이 필요한 화면이라 Claude가 직접 확인/수정할 수 없어(비밀번호 대신 입력 불가) 사용자 확인 필요
- 조치 필요(사용자): 브이월드 마이페이지 → 인증키 관리 화면에서 현재 등록된 도메인 값을 확인하고, `www.flydronemap.com`이 빠져 있다면 추가/수정
- 코드 변경 없음(진단만 수행) — 공역 레이어 지도 오버레이 기능은 여전히 broken 상태

## 2026-09-02 — 공역 레이어 지도 렌더링 버그 수정 (VWorld 서버 IP 차단 → WMS 타일 방식 전환)

- 버그: 배포 후 공역 레이어 오버레이가 지도에 전혀 렌더링되지 않던 문제 진단 및 수정
- 원인 진단 과정(진단 로그 추가 → Vercel 런타임 로그 확인 → 리전 변경 테스트 → 클라이언트 fetch 테스트 순으로 검증):
  1. `/api/airspace-layers` 라우트가 모든 오류를 조용히 삼켜 증상만으로는 원인 파악 불가 → 진단 로그 추가(동작 변경 없음)
  2. Vercel 서버(iad1 미국 리전)에서 VWorld 호출 시 502/소켓 오류 확인 → 서울(icn1) 리전으로 전환해도 "등록되지 않은 인증키입니다" 오류로 여전히 실패 — 동일 키로 일반 브라우저에서는 정상 응답, VWorld가 Vercel 서버 IP 대역 자체를 차단하고 있음을 확인
  3. 브라우저 client-side fetch()로 우회 시도 → VWorld의 JSON API(`api.vworld.kr/req/data`)가 CORS를 지원하지 않아 이 방식도 불가함을 직접 테스트로 확인
  4. VWorld는 WMS 타일(`<img>` 요청)은 CORS 제약을 받지 않는다는 점에 착안해, 공역 레이어 오버레이만 WMS 타일 방식으로 전환하기로 결정(사용자 확인 완료) — 22개 레이어 중 4개 코드를 직접 호출해 "WMS 레이어 ID = 데이터 코드 소문자"임을 검증 후 적용
- 변경 사항: `src/lib/airspace-layers.ts`(getWmsLayerParam 추가), `src/components/flight-map.tsx`(react-leaflet WMSTileLayer로 교체), `src/components/drone-dashboard.tsx`(레이어별 fetch/캐시 로직 제거 — WMS는 즉시 로드), `src/app/api/airspace-layers/route.ts`(사용처 없음, superseded 주석만 추가)
- 트레이드오프: VWORLD_API_KEY가 타일 요청 URL에 노출됨(NEXT_PUBLIC_VWORLD_API_KEY/DOMAIN 신규 추가, 사용자 확인 후 진행) — VWorld 발급키는 도메인 제한이 걸려 있어 다른 사이트에서의 도용 위험은 낮음
- 미해결(범위 밖, 별도 논의 예정): 지도 클릭 시 지점별 공역 상세 조회, 한글 주소 검색 — 둘 다 서버사이드 JSON API를 쓰기 때문에 동일한 VWorld IP 차단으로 여전히 broken 상태. VWorld 고객센터에 Vercel 서버 IP 화이트리스트 등록을 문의하거나, 대안을 찾기 전까지는 복구 보류
- 검증: tsc --noEmit / eslint 통과, next build 컴파일·타입체크·정적 페이지 131/131 생성 성공(로컬 샌드박스의 파일시스템 권한 제약으로 최종 정리 단계만 실패 — Vercel 자체 빌드로 최종 확인 예정), 브라우저로 VWorld WMS 엔드포인트 직접 호출해 실제 이미지 응답 확인 완료

## 2026-09-02 — 항공 공역 레이어(관제권/비행제한구역 등) 지도 오버레이 추가

- 한국 드론원스톱(drone.onestop.go.kr)처럼 관제권·비행제한구역(R-zone)·위험구역 등 공역 정보를 지도 위에 색상 오버레이로 직접 표시하는 기능 추가
- 브이월드 2D데이터 API 항공·공항 카테고리 22종을 레이어 카탈로그로 정리(src/lib/airspace-layers.ts), 서버 라우트(/api/airspace-layers)에서 전국 범위로 조회해 폴리곤/선/점으로 정규화
- 지도 우측 상단 플로팅 버튼으로 레이어 패널을 열고 닫음: 비행금지구역·관제권·비행제한구역 3종은 항상 켜진 채 체크박스가 잠겨 있고(필수), 나머지 19종은 사용자가 필요할 때만 켜서 조회(선택)
- 기존 VWORLD_API_KEY를 서버 측에서만 그대로 재사용 — 클라이언트에 인증키를 노출하지 않음, 별도 키 발급/환경변수 변경 없음
- ko/en/ja/es 4개 언어로 패널 문구 및 22종 레이어명 번역
- 검증: tsc --noEmit / eslint 통과, next build 정적 페이지 131/131 생성 성공

## 2026-09-01 — ExifLens 크로스링크 추가 (SEO/트래픽 시너지)

- 비행 결과가 표시된 화면(바람/KP지수/공역 결과 카드 아래)에만 자매 사이트 ExifLens(ND필터 장노출 계산기)로 연결되는 문맥형 추천 카드 1개 추가
- 두 사이트가 사진/영상 촬영자라는 동일 타겟층을 공유한다는 점에 착안, 비행 후 장노출 촬영 계획 시 ND필터 노출 시간 계산을 안내
- 구글 링크 스킴 정책 대응: 결과가 실제로 표시될 때만 조건부 렌더링, `rel="noopener noreferrer"` 사용(nofollow 없음 — 정당한 자체 추천이므로)
- ko/en/es/ja 4개 언어 번역 텍스트 추가

# 개발 이력 (Development History)

## 2026-09-03 — 드론 조종자를 위한 GPS 멀티패스 오차 설명 가이드 자동 발행

- 유리/수면/금속 등 반사면 근처에서 GPS 위치가 밀리는 멀티패스 오차의 원인과, Kp지수 기반 우주기상 문제와 구별하는 방법을 설명하는 가이드를 4개 언어(en/ja/ko/es)로 작성
- 클라우드 자동발행 파이프라인으로 생성, 빌드 검증 완료

## 2026-09-02 — 한글 주소 검색을 구글 Places API로 전환 (브이월드 IP 차단 우회) + 저장소 설정 정리

- 사용자가 "한글 주소 검색 시 연관검색어가 더 이상 뜨지 않는다"고 문의 → 원인은 새 버그가 아니라 기존에 알려진 브이월드-Vercel IP 차단 문제였음을 코드로 확인(`searchKoreaAddress`가 브이월드 호출 실패 시 조용히 빈 배열을 반환하고, 한국 도로명 주소를 거의 인식하지 못하는 Open-Meteo 글로벌 지명 검색으로 넘어가던 것이 원인).
- 사용자가 대안으로 구글 지도 API 사용 가능 여부 문의 → 구글 Places/Geocoding API는 Vercel 등 특정 서버 IP를 차단하지 않는 상용 API라는 점을 확인 후, 구글 지도(Places+Geocoding) 방식으로 진행하기로 결정.
- `src/lib/geocode.ts`: `searchKoreaAddress()`의 백엔드를 브이월드 `req/search`에서 구글 Places API(New) `places:searchText`(regionCode=KR, languageCode=ko)로 교체. 필드마스크를 최소로 지정해 구글의 더 저렴한 "Text Search Essentials" 요금제(월 10,000건 무료)를 적용받도록 함. 기존과 동일하게 `GOOGLE_PLACES_API_KEY` 미설정/요청 실패 시 조용히 빈 배열을 반환해 Open-Meteo 폴백으로 안전하게 넘어감 — 호출부(`searchLocations`)는 변경 없음.
- `.env.example` 갱신: 이 파일이 그동안 `.gitignore`의 `.env*` 패턴에 걸려 한 번도 git에 커밋된 적 없었던 것을 발견(`!.env.example` 예외 규칙 추가로 수정) — 겸사겸사 그동안 이 파일에 누락되어 있던 `VWORLD_API_KEY`/`VWORLD_DOMAIN`/`NEXT_PUBLIC_VWORLD_*` 4종과 신규 `GOOGLE_PLACES_API_KEY`를 문서화.
- `.gitignore`에 `_삭제해도되는파일_*/`(정리용 임시 폴더 패턴) 규칙 추가 — 자동 push 스크립트의 `git add -A`가 정리 대상 파일을 실수로 커밋하지 않도록 사전 방지.
- **조치 필요(사용자)**: 구글 클라우드 콘솔에서 프로젝트 생성 → "Places API (New)" 활성화 → 결제 계정 등록(월 10,000건 무료) → 해당 API로 제한된 API 키 발급 후, 맥 저장소의 `.env.local`과 Vercel 환경변수(Production+Preview)에 `GOOGLE_PLACES_API_KEY`로 등록해야 실제로 동작함. 키 등록 전까지는 기존과 동일하게 조용히 폴백되어 사이트 동작에 영향 없음.
- 검증: `tsc --noEmit`/`eslint` 통과(오류 0건), `npm run build` 정적 페이지 151/151 생성 성공(마지막 export-detail.json EPERM만 발생, 기존과 동일한 무해한 현상). 실제 구글 API 키가 없어 런타임 동작(실제 검색 결과 반환)까지는 이 세션에서 검증하지 못함 — 키 등록 후 사용자 확인 필요.
- **후속 업데이트(같은 날)**: 사용자가 구글 클라우드 콘솔의 "Maps Platform 간편 설정" 온보딩으로 API 키를 발급 — 이 방식이 기본값으로 "HTTP 리퍼러" 애플리케이션 제한 + 구글 지도 관련 API 35개 전체 허용 상태로 키를 생성한다는 것을 확인. 서버사이드(Vercel Next.js API 라우트)에서 호출하는 키라 Referer 헤더가 실리지 않아 그대로 두면 요청이 거부되는 문제라, 애플리케이션 제한을 "없음"으로, API 제한을 "Places API (New)" 단독으로 재설정하도록 안내 후 사용자가 콘솔에서 직접 수정·저장. 발급된 키를 맥 저장소 `.env.local`에 `GOOGLE_PLACES_API_KEY`로 반영(반영 전 `.backups/backup_20260902_144655_env_local/`에 기존 `.env.local` 백업). 클라우드/원격 셸 양쪽 모두 조직 네트워크 정책상 googleapis.com 직접 연결이 막혀 있어 Claude가 직접 응답을 검증하지는 못했고, 대신 사용자가 로컬 `npm run dev`로 직접 테스트 — "마장로 543번길" 검색 시 "마장로543번길, 인천광역시 계양구 마장로543번길 · 대한민국" 결과가 정상적으로 뜨는 것을 스크린샷으로 확인, 구글 Places API 전환이 실제로 정상 동작함이 검증됨. ~~**남은 조치(사용자)**: Vercel 프로젝트 환경변수(Production+Preview)에 동일한 `GOOGLE_PLACES_API_KEY` 등록 필요~~ → **해결됨(같은 날 후속)**: firelic 프로젝트에서 먼저 검증된 방식대로, 새로 로그인하는 게 아니라 사용자가 이미 로그인해 둔 브라우저 세션을 Claude in Chrome 브라우저 자동화로 그대로 이용해 vercel.com/moneypick/flydronemap/settings/environment-variables에서 직접 등록(사용자에게 명시적 진행 확인을 받은 뒤 수행). Production+Preview 두 범위 모두 선택해 저장 완료, "Updated Environment Variable successfully" 토스트로 확인됨. **다만 현재 Vercel main 브랜치에는 이 기능의 코드(구글 Places API 전환)가 아직 반영되어 있지 않아**, `regulations_push.command` 실행으로 코드가 push된 뒤에야 이 환경변수가 실제로 쓰이는 새 배포가 만들어짐 — 그 전까지는 지금 Redeploy를 눌러도 의미가 없어 보류함. **최종 업데이트(같은 날)**: push 시도가 3회 연속 "스크립트가 사라졌는데 아무것도 반영되지 않음" 상태로 실패해 원인을 조사한 결과, 저장소에 예전(8/26·8/30·9/2 12:25)에 중단된 git 작업이 남긴 잠금파일(`.git/index.lock`, `.git/HEAD.lock` 등 4건)이 모든 커밋 시도를 막고 있었던 것이 원인으로 밝혀짐 — 기존 스크립트가 커밋 성공 여부를 확인하지 않고 다음 단계로 넘어가는 구조라, 실패해도 "push할 커밋이 없습니다(=이미 최신)"로 표시되며 정상 종료된 것처럼 보이고 스크립트가 자체 삭제되어 매번 재현·진단이 어려웠음. 실행 중인 git 프로세스가 없음을 먼저 확인한 뒤 잠금파일을 전량 삭제, Claude가 device_bash로 직접 커밋(`9535d97`) 완료 — 다만 push는 맥 키체인 인증이 필요해 device_bash에서는 여전히 불가함을 재확인. 커밋/push 실패 시 이제 창이 자동으로 닫히지 않고 오류가 그대로 남도록 개선한 push 전용 스크립트를 사용자가 맥 터미널에서 직접 실행해 push 성공(`4c7be6e..9535d97`), `git fetch origin main`으로 원격 반영 확인. Vercel Production 배포(`dpl_HHYkT7ieQrMt73G9urP3EKymvMYF`)도 READY 상태로 정상 배포되어, 구글 Places API 전환 기능이 이제 실서버에 완전히 반영됨.

## 2026-09-02 — 공역 레이어 패널 스크롤 잘림 버그 수정

- 사용자가 스크린샷과 함께 "레이어 패널에서 방공식별구역 아래로 스크롤이 안 된다"고 신고. 원인 진단: 패널 자체는 `max-h-[60vh] overflow-y-auto`로 스크롤 가능하게 되어 있었으나, 패널의 위치 기준 조상이 지도 wrapper(`h-72`/`sm:h-96`, `overflow-hidden`)이고 `60vh`가 이 wrapper의 실제 높이(288px/384px)보다 훨씬 커서, 패널이 wrapper 하단에서 스크롤바째로 잘려 보이지 않던 것이 원인.
- `src/components/airspace-layer-panel.tsx`: 패널 높이를 뷰포트 기준(`60vh`) 대신 지도 wrapper 높이에 맞춘 반응형 고정값(`max-h-56`/`sm:max-h-80`)으로 변경 — 어떤 화면 크기에서도 지도 영역 안에서 잘리지 않고 자체 스크롤이 정상 동작하도록 수정.
- 검증: `tsc --noEmit`/`eslint` 통과(오류 0건), `npm run build` 정적 페이지 151/151 생성 성공(마지막 export-detail.json 정리 단계의 무해한 EPERM만 발생, 기존과 동일한 이 환경 특유 현상).

## 2026-09-02 — 자동 push 스크립트 방식 복원 + 저장소 정리(.gitignore)

- 사용자 요청: device_bash로 맥 로컬 저장소에 직접 커밋까지는 가능하지만 push는 맥 키체인 인증이 필요해 device_bash로 실행 불가 — 최근 세션에서 "터미널에 git push 직접 입력" 방식으로 안내했던 것을, 이 프로젝트에서 이미 정착되어 있던 방식(GA4/파비콘/폴더이동 배포 때 썼던 더블클릭 `.command` 스크립트, 원클릭 자동 커밋+push+완료 후 3초 내 터미널 종료 및 스크립트 자체 삭제, 작업 폴더에 스크립트 자동 배치)으로 되돌려달라는 피드백을 받고 원복.
- `regulations_push.command`를 저장소 루트에 직접 생성(device_bash로 맥 폴더에 바로 작성) — 더블클릭 시: 추적 중인 파일에 변경사항 있으면 자동 `git add -A && git commit` → `git push origin main` → 완료/실패 메시지 출력 → 3초 후 Terminal 창 자동 종료(`osascript`) + 스크립트 자체 삭제(`rm`).
- 스크립트가 `git add -A`를 자동 수행하는 특성상, 저장소에 남아있던 임시 산출물(`.next.stale.*` 빌드 잔재 3개, `tsc_ga4_check.log`, `flydronemap_project_summary.md`, 스크립트 파일 자신)이 다음 실행 때 의도치 않게 커밋될 위험을 사전 점검으로 발견 — 부작용 방지를 위해 `.gitignore`에 `*.command`, `.next.stale.*/`, `*.log`, `flydronemap_project_summary.md` 규칙 추가 후 재확인, 정상적인 소스 변경분(`.gitignore` 자체)만 남는 것을 확인.
- 향후에도 device_bash가 직접 push할 수 없는 모든 배포 작업은 이 `.command` 자동 스크립트 방식을 기본으로 사용(Claude 메모리에 표준 작업 방식으로 기록).

## 2026-09-02 — "국가별 드론 규정 안내" 신규 섹션 추가 (/regulations)

- 사용자가 DJI 공식 FlySafe(fly-safe.dji.com)를 참고 모델로 제시하며 "국가별 대략적인 규정 안내 + 공식 기관 링크"를 요청, 협의 끝에 확정된 범위대로 구현: 기존 대시보드는 그대로 유지, 별도 섹션(`/regulations`)으로 신설. 초기 지원국은 사이트가 이미 지원하는 4개 언어(en/ko/ja/es)에 대응하는 미국·한국·일본·스페인. 지도 데이터가 이미 있는 미국(FAA)·한국(VWorld)은 홈 지도에서 공역을 색상으로 확인하도록 안내하고, 아직 데이터가 없는 일본·스페인은 1차로 텍스트 요약 + 공식 링크만 제공.
- 신규 파일: `src/lib/country-regulations.ts`(국가별 구조적 데이터 카탈로그), `src/app/[locale]/regulations/page.tsx`(국가 목록), `src/app/[locale]/regulations/[country]/page.tsx`(국가별 상세 — 규정 요약 3문단 + 지도 안내/공식 링크). `src/components/site-header.tsx`에 데스크톱/모바일 내비게이션 링크 추가, `src/app/sitemap.ts`에 `/regulations` 및 국가별 상세 페이지 16개(4언어×4국가) 등록.
- `messages/{ko,en,ja,es}.json`에 `Header.regulationsNav` 및 `Regulations` 네임스페이스(제목/부제/면책 문구/국가별 명칭·소관기관·규정 요약 3문단·링크 라벨) 전체 신규 번역 추가 — 4개 언어 모두 직접 작성(기계 번역이 아닌 각국 공식 사이트 조사 기반).
- 각국 규정 요약은 공식 기관 페이지(FAA faa.gov/uas, 대한민국 드론원스톱 drone.onestop.go.kr, 일본 국토交通省 DIPS2.0, 스페인 AESA seguridadaerea.gob.es)를 직접 조사해 작성. 페이지에는 "법적 자문 아님, 공식 기관에서 최신 규정 확인" 면책 문구를 상단에 고정 노출.
- 이 기능은 사용자가 해외 체류로 맥북 접근이 불가능한 상태에서 클라우드 전용 clone(커밋 `bb9f201`)으로 먼저 구현되었고, 맥이 다시 연결된 뒤 변경 파일 9개(신규 3개 + 수정 6개, CHANGELOG 제외)를 맥 로컬 저장소에 반영·병합함.
- 검증: `tsc --noEmit` 통과(오류 0건), `eslint` 통과(기존부터 있던 무관한 경고 1건 제외), `npm run build` 정적 페이지 151/151 생성 성공(신규 `/regulations`, `/regulations/[country]` 16개 페이지 포함) — 맥 로컬 저장소에서 재검증 완료.
- 참고: 미국/한국 상세 페이지의 "홈에서 지도로 확인하기" 링크는 위치를 자동으로 지정해주지는 않음(홈 화면에서 직접 검색 필요) — 지도에 특정 위치를 자동으로 미리 채워주는 딥링크 기능은 이번 범위에서 제외하고 추후 개선 과제로 남겨둠.

## 2026-09-02 — VWorld 서비스URL 수정으로 WMS 503 오류 해결 확인

- 사용자가 브이월드 마이포털 인증키 관리 화면에서 서비스URL을 `https://flydronemap.com`(www 없음) → `https://www.flydronemap.com`으로 수정 완료
- Claude가 실제 배포 사이트(https://www.flydronemap.com/ko, 인천 지점)에서 Claude in Chrome으로 재검증: 페이지에 로드된 VWorld WMS 타일 72개 전수 조사 결과 전부 정상 로드(complete: true, 256x256, 깨진 이미지 0건) — 지난번 발견된 503 오류가 해결됨을 확인
- 이전 진단(바로 위 항목)에서 추정한 "서비스URL에 www 버전 도메인이 등록되어 있지 않아 Referer 불일치로 거부되었다"는 가설이 사용자의 실제 등록 정보 확인 및 이번 수정으로 사실로 확인됨
- 코드 변경 없음(VWorld 대시보드 설정 변경 + 실사이트 재검증만 수행) — 공역 레이어 지도 오버레이 기능 정상 복구

## 2026-09-02 — push 완료 확인 + 실서버 재검증 중 신규 버그 발견 (VWorld WMS 요청 503, 도메인 등록 불일치 의심)

- 이전 커밋(`94fdae9` WMS 전환, `2f66e57` 이력 기록) GitHub push 완료 확인, Vercel Production 배포(`2f66e57`)에 정상 반영되었고 `NEXT_PUBLIC_VWORLD_API_KEY`/`NEXT_PUBLIC_VWORLD_DOMAIN` 환경변수도 Production/Preview에 정상 등록되어 있음을 확인
- 그러나 실제 배포된 사이트(https://www.flydronemap.com)에서 한국 지점(인천)을 선택해 확인한 결과, 필수 공역 레이어 3종의 WMS 타일 요청이 전부 HTTP 503으로 실패하여 지도에 여전히 아무것도 렌더링되지 않는 신규 문제를 발견
- 진단(Claude in Chrome으로 동일 WMS 요청을 세 가지 방식으로 비교 테스트):
  1. 실제 페이지 안에서 자동 발생하는 `<img>` 요청(Referer: `https://www.flydronemap.com/...` 자동 포함) → 503 실패
  2. 새 탭 주소창에 동일 URL을 직접 입력해 접속(Referer 없음) → 정상 이미지 응답
  3. 페이지 안에서 URL의 `domain` 쿼리 파라미터만 `https://www.flydronemap.com`으로 바꿔 재요청 → 그래도 503 실패
- 결론(추정): VWorld가 요청을 거부하는 기준은 URL의 `domain` 쿼리 파라미터 값이 아니라 실제 HTTP Referer 헤더로 보임. 사이트가 실제로는 `www.flydronemap.com`으로 서비스되는데(무-www 도메인 접속 시 자동 리다이렉트 확인됨) VWorld 인증키에 등록된 허용 도메인 목록에 `www.flydronemap.com`이 없어 거부되고 있을 가능성이 높음 — 다만 VWorld 마이페이지 로그인이 필요한 화면이라 Claude가 직접 확인/수정할 수 없어(비밀번호 대신 입력 불가) 사용자 확인 필요
- 조치 필요(사용자): 브이월드 마이페이지 → 인증키 관리 화면에서 현재 등록된 도메인 값을 확인하고, `www.flydronemap.com`이 빠져 있다면 추가/수정
- 코드 변경 없음(진단만 수행) — 공역 레이어 지도 오버레이 기능은 여전히 broken 상태

## 2026-09-02 — 공역 레이어 지도 렌더링 버그 수정 (VWorld 서버 IP 차단 → WMS 타일 방식 전환)

- 버그: 배포 후 공역 레이어 오버레이가 지도에 전혀 렌더링되지 않던 문제 진단 및 수정
- 원인 진단 과정(진단 로그 추가 → Vercel 런타임 로그 확인 → 리전 변경 테스트 → 클라이언트 fetch 테스트 순으로 검증):
  1. `/api/airspace-layers` 라우트가 모든 오류를 조용히 삼켜 증상만으로는 원인 파악 불가 → 진단 로그 추가(동작 변경 없음)
  2. Vercel 서버(iad1 미국 리전)에서 VWorld 호출 시 502/소켓 오류 확인 → 서울(icn1) 리전으로 전환해도 "등록되지 않은 인증키입니다" 오류로 여전히 실패 — 동일 키로 일반 브라우저에서는 정상 응답, VWorld가 Vercel 서버 IP 대역 자체를 차단하고 있음을 확인
  3. 브라우저 client-side fetch()로 우회 시도 → VWorld의 JSON API(`api.vworld.kr/req/data`)가 CORS를 지원하지 않아 이 방식도 불가함을 직접 테스트로 확인
  4. VWorld는 WMS 타일(`<img>` 요청)은 CORS 제약을 받지 않는다는 점에 착안해, 공역 레이어 오버레이만 WMS 타일 방식으로 전환하기로 결정(사용자 확인 완료) — 22개 레이어 중 4개 코드를 직접 호출해 "WMS 레이어 ID = 데이터 코드 소문자"임을 검증 후 적용
- 변경 사항: `src/lib/airspace-layers.ts`(getWmsLayerParam 추가), `src/components/flight-map.tsx`(react-leaflet WMSTileLayer로 교체), `src/components/drone-dashboard.tsx`(레이어별 fetch/캐시 로직 제거 — WMS는 즉시 로드), `src/app/api/airspace-layers/route.ts`(사용처 없음, superseded 주석만 추가)
- 트레이드오프: VWORLD_API_KEY가 타일 요청 URL에 노출됨(NEXT_PUBLIC_VWORLD_API_KEY/DOMAIN 신규 추가, 사용자 확인 후 진행) — VWorld 발급키는 도메인 제한이 걸려 있어 다른 사이트에서의 도용 위험은 낮음
- 미해결(범위 밖, 별도 논의 예정): 지도 클릭 시 지점별 공역 상세 조회, 한글 주소 검색 — 둘 다 서버사이드 JSON API를 쓰기 때문에 동일한 VWorld IP 차단으로 여전히 broken 상태. VWorld 고객센터에 Vercel 서버 IP 화이트리스트 등록을 문의하거나, 대안을 찾기 전까지는 복구 보류
- 검증: tsc --noEmit / eslint 통과, next build 컴파일·타입체크·정적 페이지 131/131 생성 성공(로컬 샌드박스의 파일시스템 권한 제약으로 최종 정리 단계만 실패 — Vercel 자체 빌드로 최종 확인 예정), 브라우저로 VWorld WMS 엔드포인트 직접 호출해 실제 이미지 응답 확인 완료

## 2026-09-02 — NOAA 우주기상 등급 가이드 자동 발행

- NOAA의 G/S/R 세 우주기상 등급이 각각 지자기 폭풍, 태양 방사선 폭풍, 전파 두절을 측정하는 서로 다른 척도임을 설명하고, Kp지수만으로는 놓칠 수 있는 R등급(전파 두절)이 GPS 정확도에 미치는 영향을 실전 시나리오와 함께 다룸
- en/ja/ko/es 4개 언어로 작성, 실전 체크리스트 포함
- 클라우드 자동발행 파이프라인으로 생성, 빌드 검증 완료

## 2026-09-01 — 푸터 중복 링크 제거 (소개/가이드)

- 헤더 상단에 소개/가이드 링크가 추가되면서(2026-09-01 이전 커밋) 푸터 하단의
  동일 링크가 중복이 되어 제거
- src/components/site-footer.tsx에서 소개(/about)/가이드(/guides) Link 2개 제거,
  개인정보처리방침/이용약관/제휴 마케팅 고지 링크는 그대로 유지
- 더 이상 쓰이지 않는 Footer.about/Footer.guides 번역 키(4개 언어)는 안전하게
  그대로 남겨둠(추후 재사용 가능성 대비, 빌드/기능에 영향 없음)
- 검증: tsc --noEmit / eslint / npm run build 모두 통과

## 2026-09-01 — 헤더에 소개/가이드/FAQ 내비게이션 추가 + 모바일 햄버거 메뉴 적용

- ExifLens에 먼저 적용했던 헤더 내비게이션 개편(소개/가이드/FAQ 링크 + FAQ 전용 페이지 분리)과
  모바일 햄버거 메뉴를 FlyDroneMap에도 동일하게 적용
- src/components/site-header.tsx: 데스크톱은 소개·가이드·FAQ 링크가 한 줄로 표시되고,
  모바일(sm 미만)에서는 언어 선택 옆 햄버거 버튼으로 축소되어 클릭 시 세로 메뉴 패널이 펼쳐짐
- 홈페이지(src/app/[locale]/page.tsx)에 인라인되어 있던 FAQ 섹션을 제거하고
  src/app/[locale]/faq/page.tsx로 분리 (FAQPage JSON-LD 구조화 데이터도 함께 이전)
- FAQ 표시 방식은 기존 카드형 대신 ExifLens와 동일한 아코디언(펼치기/접기, details/summary) 스타일로 변경
- src/app/sitemap.ts에 /faq 경로 추가
- messages/{ko,en,es,ja}.json: Header.aboutNav/faqNav/openMenu/closeMenu 키 추가,
  Faq.title/subtitle 네임스페이스 신규 추가 (4개 언어 모두)
- 검증: tsc --noEmit 통과, 변경 파일 대상 eslint 통과(경고 0건), npm run build 전체 빌드 성공
  (/faq 라우트가 4개 언어 모두 정적(SSG) 생성됨을 확인)
- 참고: 이번 세션 환경(device_bash)에서는 백그라운드 dev 서버가 호출 간에 유지되지 않아
  Playwright 뷰포트별(모바일 412×915 / 데스크톱 1280×800) 스크린샷 검증은 수행하지 못함 —
  코드 자체는 ExifLens에서 이미 검증된 반응형 패턴(sm:flex/sm:hidden)을 그대로 사용

## 2026-09-01 — 접속 시 자동 위치 표시 (IP 기반)

- 기존에는 사용자가 "내 위치 사용" 버튼을 눌러야만 지도/데이터가 표시되던 것을,
  접속 즉시 IP 기반 대략 위치(도시 단위)로 첫 화면이 자동으로 채워지도록 개선
- Vercel 엣지 네트워크가 모든 요청에 자동으로 붙여주는 x-vercel-ip-* 헤더를
  새 API 라우트(src/app/api/geo)에서 읽어 사용 — 브라우저 위치 권한 팝업이
  전혀 뜨지 않음(정밀 GPS 대비 정확도는 낮음, 도시 단위)
- 기존 "내 위치 사용" 버튼(GPS 기반 정밀 위치)은 그대로 유지, 클릭 시 자동 감지 결과를 덮어씀
- 사용자가 자동 감지 결과가 오기 전에 먼저 검색/버튼/지도클릭을 하면
  자동 위치가 이를 덮어쓰지 않도록 처리
- 로컬 개발 환경(npm run dev) 등 해당 헤더가 없는 환경에서는 조용히 무시하고
  기존과 동일한 기본 화면(검색창) 유지
- 홈페이지 자체는 정적(SSG) 렌더링을 그대로 유지 (새 API 라우트만 동적)

## 2026-09-01 — 이슬점과 드론 렌즈 김서림 가이드 자동 발행

- 습도(%)만으로는 예측 불가능한 렌즈·짐벌 김서림을 기온-이슬점 스프레드(3°C 기준) 개념으로 미리 판단하는 법, 결로가 렌즈에 먼저 생기는 원리, 배터리/SD 슬롯을 습한 야외에서 열 때의 실수 등을 다룬 실전 가이드를 en/ja/ko/es 4개 언어로 작성.
- 클라우드 자동발행 파이프라인으로 생성, 빌드 검증 완료

## 2026-08-31 — 자동 백업 폴더 위치 변경

- publish-guide.command 실행 시 생성되던 백업 폴더 위치를 상위 폴더(애드센스 제휴 마케팅/flydronemap_backup_*)에서 flydronemap 저장소 내부(flydronemap/.backups/backup_*)로 변경
- 상위 폴더에 다른 프로젝트(exiflens, firelic 등)가 함께 있어 혼재되던 문제 해결
- .backups/ 폴더는 .gitignore에 추가하여 git에는 포함되지 않음(용량/보안 영향 없음)
- 백업 생성 시 이전 백업이 재귀적으로 다시 백업되지 않도록 rsync --exclude '.backups' 옵션 추가
- 기존에 상위 폴더에 있던 백업 1건(backup_20260831_085421)도 새 위치로 이동

## 2026-08-31 — 드론 비행에 가장 좋은 시간대 가이드 자동 발행

- 시간대별 바람 변화(열대류·상승/하강사면풍), 골든아워 광량과 비전 센서 눈부심, 남중 태양광과 열화상 점검 시간대 차이, 새벽/해질녘 조류 충돌 위험, 야간·박명 비행 법규(충돌방지등 등), 기온역전 안개 위험을 다룬 실전 가이드를 en/ja/ko/es 4개 언어로 작성.
- 클라우드 자동발행 파이프라인으로 생성, 빌드 검증 완료

## 2026-08-30 — 파비콘 교체 (Vercel 기본 로고 → 브랜드 아이콘)

- 크롬 탭 아이콘이 create-next-app 기본 제공 Vercel 삼각형 로고 그대로였던 것을 확인 (ExifLens와 동일 파일, md5 해시 일치)
- 헤더에서 사용 중인 lucide-react Wind 아이콘을 브랜드 색상(배경 #0a0a0a, 아이콘 #e38d3d)으로 512x512 SVG를 새로 그려 favicon.ico(16/32/48/256 멀티 사이즈), icon.png(512px), apple-icon.png(180px) 3종으로 교체
- 16px 축소본을 직접 확인해 형태가 뭉개지지 않음을 검증 (아이콘을 캔버스의 약 86%까지 채우고 stroke-width 2.6 적용)
- 코드 수정 없이 src/app/ 위치의 파일 교체만으로 Next.js가 자동으로 메타 태그 생성

## 2026-08-30 — 작업 폴더 이동 및 경로 수정

- 바탕화면 정리를 위해 작업 폴더를 ~/Desktop/flydronemap → ~/Desktop/애드센스 제휴 마케팅/flydronemap 으로 이동 (git 이력 영향 없음)
- automation/publish-guide.command의 REPO 경로를 새 위치로 수정 (이전 경로로는 더 이상 동작하지 않아 필수 수정)
- 예약 발행 자동화(GitHub clone 기반)는 로컬 경로와 무관하므로 별도 수정 불필요

## 2026-08-30 — GA4 측정 ID 오류 수정

- 먼저 반영했던 Google 애널리틱스 측정 ID(G-1P4CBYCR1V)가 실제 flydronemap.com 데이터 스트림의 측정 ID(G-QFT36DH8YR)와 달라 데이터가 수집되지 않던 문제 수정
- src/app/[locale]/layout.tsx의 gtag.js 로더 src와 gtag('config', ...) 호출을 올바른 측정 ID(G-QFT36DH8YR)로 교체
- 로딩 방식(next/script, strategy="afterInteractive")은 기존과 동일, 변경 없음

## 2026-08-30 — Google 애널리틱스(GA4) 태그 설치

- 애널리틱스에서 flydronemap.com용 데이터 스트림을 생성하며 안내받은 Google 태그(gtag.js, 측정 ID G-1P4CBYCR1V)를 설치
- 애드센스 심사 대기 상태와는 무관한 별개 제품이라 심사에 영향 없음, `next/script`의 `strategy="afterInteractive"`로 로드해 페이지 렌더링(LCP)을 막지 않도록 구성 — 기존 AdSense 스크립트와 동일한 패턴
- 측정 ID는 비밀값이 아니라(모든 페이지 HTML에 노출됨) 별도 환경변수 없이 코드에 직접 명시

## 2026-08-30 — 낙뢰와 뇌우 시 드론 안전수칙 가이드 자동 발행

- 신규 가이드 아티클 "낙뢰와 뇌우 시 드론 안전수칙"(lightning-and-thunderstorm-drone-safety, weather-safety 카테고리)을 4개 언어(en/ja/ko/es)로 작성 — bolt from the blue, 돌풍 전선(gust front), 낙뢰 관련 전파 잡음, 조종자 본인의 노출 위험 등 E-E-A-T 강화 기준(구체적 수치·실전 시나리오·이유 설명·체크리스트) 적용
- 클라우드 자동발행 파이프라인으로 생성, `npm run build` 빌드 검증 완료 (111개 정적 페이지 정상 생성)

## 2026-08-29 — 눈/한파 속 드론 비행 팁 가이드 자동 발행

- 눈 덮인 지면에서의 비전 포지셔닝(VPS) 드리프트, 내리는 눈으로 인한 장애물회피 센서 오작동, 저온에서의 그리스 경화·짐벌 반응 지연, 착륙면(눈/얼음) 안전, 조종자 방한 장비까지 다루는 겨울철 비행 가이드를 en/ja/ko/es 4개 언어로 작성
- 클라우드 자동발행 파이프라인으로 생성, 빌드 검증 완료

## 2026-08-28 — 습도가 드론 전자장비에 미치는 영향 가이드 자동 발행

- 습도로 인한 드론 내부 결로, 접점 부식, 기압 센서 오작동 문제와 예방/대응 팁을 다룬 가이드를 4개 언어(en/ja/ko/es)로 작성
- 클라우드 자동발행 파이프라인으로 생성, 빌드 검증 완료

## 2026-08-26 — 네이버 서치어드바이저 경고 항목 조치 (메타 제목/설명 로컬라이즈)

- 네이버 서치어드바이저 URL 검사에서 페이지 제목/설명, OG 제목/설명이 길이 초과로 경고(!) 표시됨을 확인
- 원인: `generateMetadata()`가 모든 언어에 영어 55자 제목을 고정 사용하고, 화면에 노출되는 88자(한국어 기준) `subtitle` 텍스트를 그대로 메타 설명으로 재사용하고 있었음
- 조치: `Home.metaTitle`/`Home.metaDescription` 번역 키를 4개 언어(en/ko/ja/es)에 신규 추가하고 `generateMetadata()`가 이 키를 사용하도록 수정. 화면에 보이는 기존 `subtitle` 텍스트는 전혀 변경하지 않음(SEO 메타데이터만 분리)
- robots.txt 경고 항목은 실제로는 정상 동작 확인됨(라이브 조회로 검증) — 네이버 측 캐시된 진단 결과로 판단, 재검사만 권장
- `npx tsc --noEmit` 통과 확인, 4개 언어 JSON 유효성 및 키 존재 확인 완료

## 2026-08-26 — 안개 속 비행 안전 가이드 가이드 자동 발행

- 안개가 VLOS(육안 시야 확보) 요건과 최소 비행 시정 규정에 미치는 영향, 안개 형성 속도, 렌즈/짐벌 습기 침투, 장애물 회피 센서 신뢰도 저하를 다루는 안전 가이드를 en/ja/ko/es 4개 언어로 작성
- 클라우드 자동발행 파이프라인으로 생성, 빌드 검증 완료

## 2026-08-26 — 가이드 아티클 내부 링크(관련 가이드) 추가

- 각 가이드 아티클 하단에 "관련 가이드" 섹션을 추가해 같은 카테고리의 다른 글 최대 3개를 자동으로 링크. SEO 내부 링크 구조 개선 목적
- `src/lib/guides.ts`에 `getRelatedGuides()` 추가 (같은 카테고리 우선, 부족하면 다른 카테고리로 채움) — 파일시스템 기반이라 기존 16개 글은 물론, 매일 자동 발행되는 신규 글에도 별도 수정 없이 자동 적용됨
- `src/app/[locale]/guides/[slug]/page.tsx`에 관련 가이드 렌더링 추가, 4개 언어 메시지에 `Guides.relatedGuides` 키 추가
- `npm run build` 재검증 완료 — 95개 페이지 정상 생성, TypeScript 오류 없음

## 2026-08-26 — 구글 애드센스 신청 및 검토 요청 완료

- 사용자가 구글 애드센스에 `flydronemap.com` 사이트를 추가 신청하고 검토(심사) 요청까지 완료
- 심사 결과 대기 중 (통상 며칠~수 주 소요). 심사 중에는 `public/ads.txt`(기존 게시자 ID 등록됨)와 사이트 콘텐츠를 그대로 유지하는 것이 안전
- 대기 기간 동안 보류 중인 항목 처리 가능: ① 실서버 한글 주소 자동완성 미동작 확인, ② 김포공항 등 공항 관제권(비행제한) 데이터 연동
- 다음 단계: 애드센스 심사 결과 확인 → 승인 시 `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID` 환경변수를 Vercel에 등록해 실제 광고 활성화

## 2026-08-26 — 구글 서치콘솔 등록 완료

- 도메인 소유 확인용 TXT 레코드 등록 및 검증 완료
- `https://flydronemap.com/sitemap.xml` 제출 완료 (직전에 ExifLens 전용 깨진 경로 `/frame` 제거 반영된 버전)
- 다음 단계: 구글 색인 반영 대기 후, 애드센스 신청 진행 예정

## 2026-08-26 — 구글 서치콘솔 등록 준비: sitemap.xml 깨진 링크(/frame) 제거

- 사용자가 구글 서치콘솔 도메인 소유 확인용 TXT 레코드를 등록 완료, 사이트맵 제출 전 최종 점검 중 발견된 문제 수정
- `src/app/sitemap.ts`가 다른 프로젝트(ExifLens) 코드를 재사용해 만들어지면서, ExifLens에만 존재하는 `/frame` 경로가 그대로 남아있었음. FlyDroneMap에는 `/frame` 페이지가 없어 4개 언어 기준 존재하지 않는 URL(404)이 사이트맵에 포함되어 있었음 → 제거
- 수정 범위는 `/root/flydronemap`에만 한정되며, ExifLens 프로젝트(`/root/exiflens`, 별도 디렉터리/저장소)에는 영향 없음을 확인
- `npm run build` 재검증 완료 — 95개 페이지 정상 생성, TypeScript 오류 없음
- 다음 단계: 구글 서치콘솔에서 소유 확인 완료 후 `sitemap.xml` 제출, 색인 요청 진행 (이후 애드센스 신청은 서치콘솔 등록 이후로 순서 조정)

## 2026-08-26 — 3단계 완료: 도메인 구매 + GitHub 저장소 연결 + Vercel 배포

- 도메인 `flydronemap.com` 구매 완료 (사용자 직접 진행, Namecheap)
- GitHub 저장소 `SH8952/flydronemap` (private) 생성 및 전체 코드 푸시 완료
  - 이 클라우드 세션의 자동 GitHub 연동은 "이미 설정된 저장소"에만 접근 가능해 신규 저장소 생성/푸시가 불가능했음 → 사용자가 Personal Access Token(PAT)을 발급해 전달, 이를 이용해 푸시 진행 (토큰은 대화 기록에 재노출하지 않음)
- Vercel 프로젝트 `flydronemap` 생성 및 GitHub 저장소 연결, 배포 완료 (`flydronemap.vercel.app` 정상 동작 확인)
  - 신규 저장소라 Vercel의 GitHub App 저장소 접근 권한에 처음에는 포함되지 않아, GitHub 쪽에서 권한을 추가해 해결
- 커스텀 도메인 `flydronemap.com` / `www.flydronemap.com`을 Vercel에 연결, Namecheap Advanced DNS에 A/CNAME 레코드 설정 후 정상 연결 확인 (Valid Configuration)
- 다음 단계: Vercel 환경변수(`VWORLD_API_KEY`, `VWORLD_DOMAIN`)가 실제로 등록되어 있는지 확인 필요, 브이월드 인증키 관리 화면의 서비스URL을 `https://flydronemap.com`으로 갱신 필요, 실 도메인 기준으로 사이트 전체 기능(공역 조회/한글 주소 검색/지도) 재검증 필요

## 2026-08-26 — Kp 지수 정밀도 개선 + 한글 주소 검색(브이월드) 추가

- 사용자 리포트: 김포공항 등 공항 주변 클릭 시 비행제한(관제권) 정보가 반영되지 않고, 주소 입력창에 한글을 입력해도 검색이 되지 않는 문제
- **진단 1 (공역 정보)**: 현재 연동된 브이월드 데이터(`LT_C_AISPRHC`, 비행금지구역)는 군사·보안 목적 구역만 포함하며, 공항 반경 내 사전승인이 필요한 "관제권(Control Zone)"은 별도 데이터셋에 속해 이번 데이터로는 조회 범위 밖임을 확인. 브이월드 공식 문서가 이 클라우드 환경에서 robots.txt로 접근이 막혀 정확한 데이터 코드를 확인하지 못해, 이 항목은 사용자 확인 후 별도 연동 예정(보류)
- **수정 2 (Kp 지수)**: NOAA 공개 피드를 직접 조회해 원인 확인 — 정수로 반올림된 `kp_index` 값을 쓰고 있어 항상 "0.0", "1.0"처럼 딱 떨어지는 값만 표시되어 멈춘 것처럼 보였음. 소수점 정밀도가 있는 `estimated_kp` 값을 우선 사용하도록 `src/lib/kp-index.ts` 수정 (표시되던 "Kp 0.0"은 실제로는 정상 동작 중이었고, 당시 지자기 활동이 실제로 매우 조용한 상태였음)
- **수정 3 (한글 주소 검색)**: 기존 Open-Meteo 지오코딩 API는 전세계 지명 위주 검색 엔진이라 한글 주소 검색을 사실상 지원하지 않음을 확인. `src/lib/geocode.ts`에 한글 입력 감지 로직을 추가해, 한글이 포함된 검색어는 브이월드 검색 API(주소 검색, `type=address&category=road`)로 우선 조회하고 결과가 없을 때만 기존 Open-Meteo로 폴백하도록 구조 변경
- `npm run build` 재검증 완료 — 95개 페이지 정상 생성, TypeScript 오류 없음
- 참고: 브이월드 검색 API의 정확한 요청/응답 형식은 공식 문서 접근 제한으로 공개된 예시를 참고해 방어적으로(실패 시 조용히 빈 배열 반환) 구현했으므로, Mac 로컬 환경에서 실제 한글 주소 검색 결과를 반드시 재검증 필요
- 다음 단계: 공항 관제권 데이터 코드 확인 후 공역 정보 정확도 개선 예정 (사용자 확인 대기)

## 2026-08-26 — 검색 자동완성 z-index/깜빡임 수정 + 지도 클릭 조회 기능 추가

- 사용자 리포트: 위치 검색창에 글자를 입력하면 자동완성 목록이 지도 뒤에 나타났다 사라지는 것처럼 보이는 문제 확인
  - 원인 1: 자동완성 드롭다운의 `z-10`이 Leaflet 내부 패널들의 z-index(최대 700)보다 낮아 지도 아래로 깔림 → 드롭다운과 검색창 래퍼(wrapper)의 z-index를 `z-[1000]`으로 상향
  - 원인 2: 입력할 때마다 디바운스 없이 매 키 입력마다 검색 API를 호출해, 느린 이전 요청의 응답이 더 빠른 최신 요청의 응답을 나중에 덮어써 목록이 깜빡이듯 보임 → 300ms 디바운스 + 요청 순번(requestId) 검사를 추가해 오래된 응답은 무시하도록 수정
- 신규 기능: 지도 위 아무 곳이나 클릭하면 해당 좌표의 바람/가시거리/KP지수/공역 정보를 즉시 조회하도록 추가 (`src/components/flight-map.tsx`에 `useMapEvents` 기반 `ClickHandler` 추가, `src/components/drone-dashboard.tsx`에 `selectCoordinates()` 핸들러 추가)
- 지도 하단에 "지도 아무 곳이나 클릭하면 해당 위치를 조회합니다" 안내 문구를 4개 언어(en/es/ja/ko)로 추가 (`Home.clickMapHint`)
- `npm run build` 재검증 완료 — 95개 페이지 정상 생성, TypeScript 오류 없음
- 참고: 실제 브라우저에서 드롭다운이 지도 위로 정상 표시되는지, 지도 클릭 시 조회가 매끄럽게 동작하는지는 이 클라우드 환경(외부 네트워크 제한)에서 직접 확인할 수 없어 Mac 로컬 환경에서 재검증 필요

## 2026-08-26 — 실제 지도(Leaflet + OpenStreetMap) 시각화 추가

- 기존에는 검색 위치의 정보를 텍스트/숫자 카드로만 보여주었는데, 사용자 요청으로 실제 지도 위에서 눈으로 확인할 수 있도록 지도 시각화 기능 추가
- 무료 오픈소스 지도 라이브러리 Leaflet + react-leaflet 도입 (OpenStreetMap 타일 사용, 별도 API 키/과금 불필요)
- `src/components/flight-map.tsx` 신규 작성 — 검색한 위치에 마커 표시, 위치 변경 시 자동 리센터링. Leaflet은 브라우저 window 객체가 필요해 `next/dynamic`(`ssr:false`)으로 클라이언트 전용 로드
- 공역 구역 경계선을 지도 위에 폴리곤으로 표시하기 위해 `src/lib/airspace.ts`의 미국(FAA)·한국(브이월드) 조회 로직을 모두 `returnGeometry`/`geometry` 파라미터를 켜도록 수정하여 실제 구역 경계 좌표(polygon rings)를 함께 받아오도록 확장 — 비행금지/제한구역은 빨간색, 일반 구역은 파란색으로 구분 표시
- `npm run build` 재검증 완료 — 95개 페이지 정상 생성, TypeScript 오류 없음. 로컬 개발 서버로 홈페이지 응답 정상 확인
- 참고: 이 클라우드 개발 환경은 외부 네트워크(OpenStreetMap 타일 서버 포함)에 접근할 수 없어, 실제 지도 타일과 구역 폴리곤이 화면에 정확히 표시되는지는 이 환경에서 직접 확인하지 못했음. Mac 로컬 환경 또는 Vercel 배포 후 재검증 필요
- 도메인 구매(로드맵 3단계)보다 지도 기능을 우선 진행하기로 결정(사용자 지시)

## 2026-08-26 — 공역 데이터 2번째 국가 추가: 대한민국 (국토교통부 비행금지구역)

- 기존 미국(FAA UAS Facility Map) 단일 소스였던 공역 조회 기능을, 좌표 기반으로 국가별 데이터 소스를 자동 분기하는 구조로 확장 (`src/lib/airspace.ts`) — 대한민국 좌표 범위(대략 위도 33.0~38.7, 경도 124.5~131.0)에서는 국토교통부_비행금지구역(브이월드 2D데이터 API, 데이터코드 `LT_C_AISPRHC`)을 조회하고, 그 외 지역은 기존 FAA 로직 유지
- 미국(FAA)과 대한민국(국토교통부)은 데이터 구조가 달라(미국: 특정 좌표에서 허용되는 최대 고도, 한국: 특정 좌표가 비행금지/제한구역에 속하는지 여부 + 구역 고도범위) `AirspaceCeiling` 타입을 소스별로 구분되는 형태로 재설계
- 사용자가 브이월드(VWorld)에서 직접 회원가입 및 "2D데이터 API" 활용신청을 진행해 개발키(6개월, 최대 3회 연장 가능)를 발급받음 — 인증키는 `.env.local`(git 미포함)에 안전하게 저장, 대화 기록에도 재노출하지 않음
- 가이드/대시보드 화면 문구를 4개 언어(en/es/ja/ko)로 확장: 공역 카드 제목을 "공역 정보 (미국/대한민국)"으로 일반화하고, 한국 결과 표시용 신규 문구(비행제한구역명, 고도범위, "비행금지구역 없음") 추가
- `npm run build` 재검증 완료 — 95개 정적 페이지 정상 생성, TypeScript 오류 없음
- 참고: 이 클라우드 개발 환경은 외부 네트워크 접근이 제한되어 있어 브이월드 API의 실제 응답을 이 환경에서 직접 호출 테스트할 수 없었음. Vercel 배포 이후 실제 좌표로 응답 형식(특히 JSON 구조)을 재검증 필요
- 다음 단계: 이번에 추가한 방식과 동일하게, 개별 확인이 끝나는 국가가 생길 때마다 공역 데이터 소스를 계속 추가해 나갈 예정 (국가 지원 목록은 지속 업데이트)

## 2026-08-26 — Phase 2: 가이드 카테고리 세분화 + 아티클 16개 작성 (애드센스 심사 대비)

- ExifLens("아이디어 1")에서 가이드 목록이 세분화되지 않아 세로 스크롤이 길어졌던 문제를 이번 프로젝트에서는 처음부터 반영: `src/lib/guides.ts`에 고정 카테고리 체계(`CATEGORY_ORDER`: weather-safety, space-weather-gps, us-airspace-regulations, gear-flight-tips)와 `getGuidesByCategory()`를 추가
- `src/app/[locale]/guides/page.tsx`를 카테고리별 그룹 섹션 렌더링 방식으로 재작성 (`messages/*.json`의 `Guides.categories`에 4개 언어 카테고리 표시명 추가)
- 사용자 확인을 거쳐 4개 카테고리 × 4개 주제 = 16개 가이드 아티클 주제를 확정하고, 4개 언어(en/es/ja/ko)로 총 64개 `.mdx` 파일 작성 완료
  - 날씨/안전: 바람·돌풍 체크리스트, 우천 비행 위험성, 기온과 배터리 성능, 가시거리 기준
  - 우주기상/GPS: KP지수 기초, KP지수와 GPS·나침반 신뢰도, 태양풍과 드론 통신, 지자기 폭풍 시 비행 회피
  - 미국 공역/규정: FAA Part 107, 미국 공역 등급(B/C/D/E/G), LAANC, 공항 근처 비행 전 확인사항
  - 장비/비행 팁: 초보자 사전 비행 점검, 배터리 관리, 강풍 속 카메라 설정, GPS 신호 약할 때 대처법
- `npm run build` 재검증 완료 — 95개 정적 페이지 정상 생성 (가이드 상세 페이지 64개 포함)
- 다음 단계: 로드맵 3단계 — 도메인 구매(flydronemap.com) 및 GitHub/Vercel 배포

## 2026-08-26 — 서비스명 확정: FlyDroneMap (도메인 flydronemap.com)

- 사용자가 Namecheap에서 `flydronemap.com` 구매 가능(이전 도메인 구매와 동일 가격) 확인 완료. 실제 결제는 로드맵 3단계(도메인 구매/배포)에서 진행하기로 하고, 지금은 가칭 "DroneWeather"였던 프로젝트명/브랜딩을 "FlyDroneMap"으로 전면 교체
- 폴더명 변경: `/root/droneweather` → `/root/flydronemap`
- 코드 전반(package.json, 헤더/푸터, SEO 메타데이터, JSON-LD, 4개 언어 메시지 파일, 개발 서버 실행 스크립트) "DroneWeather" 표기를 "FlyDroneMap"으로 일괄 치환
- `SITE_URL` 기본값을 `https://flydronemap.com`으로 갱신 (배포 시 `NEXT_PUBLIC_SITE_URL` 환경변수로 재정의됨)
- 리네임 이후 `npm run build` 재검증 완료 — 정상 통과

## 2026-08-26 — Phase 1: 프로젝트 스캐폴딩 및 핵심 대시보드 개발

- ExifLens와 동일한 스택(Next.js 16 App Router + Turbopack, Tailwind CSS v4, next-intl 4개 언어, next-themes)으로 새 저장소 스캐폴딩. ExifLens 보일러플레이트(레이아웃, 헤더/푸터, 테마 프로바이더, 가이드 시스템, 정책 페이지 구조, SEO 유틸)를 재사용하고 EXIF/ND필터 관련 코드는 모두 제거
- 핵심 데이터 소스 3종 조사 및 연동 완료 (모두 무료, API 키 불필요):
  - **바람/돌풍/가시거리/기온**: Open-Meteo Forecast API (`src/lib/weather.ts`)
  - **행성 KP 지수(지자기 활동)**: NOAA 우주기상센터(SWPC) 공개 JSON 피드 (`src/lib/kp-index.ts`)
  - **공역 고도 제한(미국 Part 107 기준)**: FAA UAS Facility Map 공개 ArcGIS REST FeatureServer (`src/lib/airspace.ts`) — "참고용, 실제 비행 승인 아님" 면책 문구 포함
  - **위치 검색**: Open-Meteo Geocoding API (`src/lib/geocode.ts`)
- 서버 API 라우트 2개 구현: `GET /api/dashboard?lat=&lon=` (3종 데이터 병렬 조회), `GET /api/geocode?q=` (위치 검색)
- 메인 대시보드 UI(`src/components/drone-dashboard.tsx`) 구현: 위치 검색/자동완성, 현재 위치 사용, 바람·가시거리 카드, KP지수 카드(위험도별 안내 문구), 공역 고도 제한 카드(면책 문구 포함)
- 개인정보처리방침/이용약관/소개/제휴 마케팅 고지 페이지 내용을 드론 대시보드 서비스에 맞게 전면 재작성 (4개 언어: en/es/ja/ko) — 특히 이용약관에 "비행 승인 대체 불가", "데이터 정확성 보증 없음" 조항 명시
- `npm run build` 정상 통과 확인 (31개 정적 페이지 + 2개 API 라우트). 로컬 개발 서버 기동 후 홈페이지·가이드 페이지 응답 200 확인
- 참고: 이 클라우드 개발 환경은 외부 네트워크 접근이 allowlist로 제한되어 있어, 위 3개 외부 API에 대한 실제 호출은 이 환경에서 직접 검증할 수 없었음 (요청 시 정상적으로 null을 반환하며 앱이 깨지지 않는 것까지는 확인). 실제 데이터 연동 여부는 Vercel 배포 이후(3단계 이후) 검증 필요
- 다음 단계: 애드센스 심사 대비 가이드 아티클 15~20개 작성 및 정책 페이지 최종 점검 (로드맵 2단계)
