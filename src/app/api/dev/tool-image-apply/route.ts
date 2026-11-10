import { NextRequest, NextResponse } from "next/server";
import { DevImageToolError, type UnsplashCandidate } from "@/lib/dev/guide-image-tool";
import { applyToolImage } from "@/lib/dev/tool-image-tool";

// 개발자 전용 - 로컬(NODE_ENV=development)에서만 동작. 프로덕션에서는 항상 403.
// 후보 검색은 기존 /api/dev/guide-image-search 를 그대로 쓴다(검색어만 받는 공용 기능).
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "개발 모드에서만 사용할 수 있습니다." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const candidate = body?.candidate as UnsplashCandidate | undefined;
  if (!slug || !candidate?.rawUrl) {
    return NextResponse.json({ error: "slug와 candidate가 필요합니다." }, { status: 400 });
  }

  try {
    return NextResponse.json(await applyToolImage(slug, candidate));
  } catch (e) {
    if (e instanceof DevImageToolError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[dev/tool-image-apply] unexpected error:", e);
    return NextResponse.json({ error: "적용 중 오류가 발생했습니다." }, { status: 500 });
  }
}
