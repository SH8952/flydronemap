import { NextRequest, NextResponse } from "next/server";
import { applyUploadedGuideImage, DevImageToolError } from "@/lib/dev/guide-image-tool";

// 개발자 전용 - 로컬(NODE_ENV=development)에서만 동작. Unsplash 검색을 거치지
// 않고, 개발자가 직접 촬영/보유한 사진 파일을 그대로 대표 이미지로 저장한다.
// 로컬 파일(이미지, mdx)만 수정하며 git add/commit/push는 하지 않는다.
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "개발 모드에서만 사용할 수 있습니다." }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const slug = form?.get("slug");
  const file = form?.get("file");

  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "slug가 필요합니다." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file이 필요합니다." }, { status: 400 });
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop() ?? "" : "";
  if (!extension) {
    return NextResponse.json({ error: "파일 확장자를 확인할 수 없습니다." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await applyUploadedGuideImage(slug, buffer, extension);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof DevImageToolError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[dev/guide-image-upload] unexpected error:", e);
    return NextResponse.json({ error: "업로드 중 오류가 발생했습니다." }, { status: 500 });
  }
}
