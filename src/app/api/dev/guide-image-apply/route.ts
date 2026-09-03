import { NextRequest, NextResponse } from "next/server";
import { applyGuideImage, DevImageToolError, type UnsplashCandidate } from "@/lib/dev/guide-image-tool";

// 개발자 전용 - 로컬(NODE_ENV=development)에서만 동작. 로컬 파일(webp, mdx)만
// 수정하며 git add/commit/push는 하지 않는다 - 기존 push 스크립트로 별도 반영.
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
    const result = await applyGuideImage(slug, candidate);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof DevImageToolError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[dev/guide-image-apply] unexpected error:", e);
    return NextResponse.json({ error: "적용 중 오류가 발생했습니다." }, { status: 500 });
  }
}
