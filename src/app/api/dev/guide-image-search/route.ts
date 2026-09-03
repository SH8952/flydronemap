import { NextRequest, NextResponse } from "next/server";
import { DevImageToolError, searchGuideImageCandidates } from "@/lib/dev/guide-image-tool";

// 개발자 전용 - 로컬(NODE_ENV=development)에서만 동작. 프로덕션 배포본에서는
// 항상 403을 반환해 검색/교체 기능 자체가 동작하지 않는다.
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "개발 모드에서만 사용할 수 있습니다." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  const page = Number.isFinite(body?.page) ? Math.max(1, Math.floor(body.page)) : 1;
  if (!query) {
    return NextResponse.json({ error: "query가 필요합니다." }, { status: 400 });
  }

  try {
    const results = await searchGuideImageCandidates(query, 9, page);
    return NextResponse.json({ results, page });
  } catch (e) {
    if (e instanceof DevImageToolError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[dev/guide-image-search] unexpected error:", e);
    return NextResponse.json({ error: "검색 중 오류가 발생했습니다." }, { status: 500 });
  }
}
