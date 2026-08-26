# 개발 이력 (Development History)

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
