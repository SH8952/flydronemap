# 개발 이력 (Development History)

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
