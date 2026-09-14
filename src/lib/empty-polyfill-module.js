// 이 파일은 의도적으로 비어 있습니다.
//
// Next.js는 프레임워크 내부적으로 next/dist/build/polyfills/polyfill-module을
// 모든 빌드에 무조건 포함시키는데(String.prototype.trimStart/trimEnd,
// Array.prototype.flat/flatMap, Object.fromEntries, Object.hasOwn,
// Promise.prototype.finally, Symbol.prototype.description 등), 이 값은
// next.config.ts의 browserslist 설정과 무관하게 항상 삽입되는 Next.js 자체의
// 알려진 제한 사항입니다 (vercel/next.js GitHub Issue #86785,
// Discussion #64330 참고).
//
// 이 프로젝트는 이미 browserslist에서 폴리필이 필요 없는 모던 브라우저만
// 지원하도록 설정을 마쳤고(2026-09-14, PageSpeed Insights "레거시 JavaScript"
// 진단 1차 반영), 위 폴리필 대상 기능들은 그 모던 브라우저 기준선에서 전부
// 네이티브로 지원되므로, 이 폴리필 모듈 자체가 완전히 불필요합니다.
//
// next.config.ts의 turbopack.resolveAlias 설정이 Next.js의 내부 폴리필
// 모듈 경로를 이 빈 파일로 대체해, PageSpeed Insights가 지적한
// "레거시 JavaScript" 경고(14KiB)를 제거합니다. 실제 폴리필 코드가 아무
// 것도 실행되지 않으므로 사이트 동작에는 영향이 없습니다.
//
// ⚠️ 주의: 이 워크어라운드는 Next.js 문서화되지 않은 내부 파일 경로에
// 의존합니다. Next.js 버전을 올릴 때는 이 얼라이어스가 여전히 정상
// 동작하는지(즉, "레거시 JavaScript" 경고가 다시 나타나지 않는지) 반드시
// 재확인해야 합니다.
