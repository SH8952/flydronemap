# 개발 이력 (Development History)

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
