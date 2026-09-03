/**
 * 개발자 전용 가이드 이미지 관리 도구의 서버 로직.
 *
 * automation/attach-guide-image.py(발행 시 자동 첨부)와 같은 Unsplash API를
 * 쓰지만, 이 파일은 로컬 개발 서버(`npm run dev`)에서만 동작하는 수동 교체
 * 도구용이다. `/api/dev/*` 라우트에서만 import되고, 그 라우트들은 각각
 * NODE_ENV가 "development"가 아니면 즉시 403을 반환하므로 프로덕션에서는
 * 실행될 일이 없다.
 *
 * (ExifLens 프로젝트에서 이미 구현·검증·배포까지 완료한 동일 도구를
 * FlyDroneMap에 이식한 것 - utm_source만 FlyDroneMap으로 변경, 나머지 로직은
 * 동일. 2026-09-03)
 *
 * 사이트를 운영하는 동안 계속 쓰는 상시 도구이므로 1회성 스크립트처럼
 * 지우지 않는다.
 */
import fs from "node:fs";
import path from "node:path";

export const GUIDE_LOCALES = ["en", "ja", "ko", "es"] as const;

/** 업로드로 직접 첨부하는 것을 허용하는 이미지 확장자 (Unsplash 결과는 항상 webp로 저장됨). */
export const ALLOWED_UPLOAD_EXTENSIONS = ["webp", "jpg", "jpeg", "png"] as const;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB

export type UnsplashCandidate = {
  id: string;
  thumbUrl: string;
  rawUrl: string;
  downloadLocation: string | null;
  photographerName: string;
  photographerUrl: string;
};

export class DevImageToolError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

function getAccessKey(): string {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    throw new DevImageToolError(
      "UNSPLASH_ACCESS_KEY가 설정되어 있지 않습니다 (.env.local 확인)",
      500,
    );
  }
  return key;
}

/**
 * 검색어로 Unsplash 후보 이미지 목록(썸네일)을 가져온다. 다운로드/파일 저장은
 * 하지 않는다. `page`를 올리면 같은 검색어라도 다른(다음 페이지) 결과를
 * 받아올 수 있다 - 개발자 패널에서 "검색" 버튼을 다시 누를 때 새로운 후보를
 * 보여주는 용도.
 */
export async function searchGuideImageCandidates(
  query: string,
  count = 9,
  page = 1,
): Promise<UnsplashCandidate[]> {
  const accessKey = getAccessKey();
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(count));
  url.searchParams.set("page", String(Math.max(1, page)));
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");

  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new DevImageToolError(`Unsplash 검색 실패 (${res.status})`, 502);
  }
  const data = await res.json();
  const results: unknown[] = Array.isArray(data?.results) ? data.results : [];

  return results.map((raw): UnsplashCandidate => {
    const p = raw as {
      id: string;
      urls: { small: string; raw: string };
      links: { download_location?: string };
      user: { name: string; links: { html: string } };
    };
    const utm = "utm_source=FlyDroneMap&utm_medium=referral";
    const sep = p.user.links.html.includes("?") ? "&" : "?";
    return {
      id: p.id,
      thumbUrl: p.urls.small,
      rawUrl: p.urls.raw,
      downloadLocation: p.links.download_location ?? null,
      photographerName: p.user.name,
      photographerUrl: `${p.user.links.html}${sep}${utm}`,
    };
  });
}

type ImageFrontmatter = {
  image: string;
  imageCredit?: string;
  imageCreditUrl?: string;
};

/**
 * 4개 언어 mdx의 image/imageCredit/imageCreditUrl frontmatter를 갱신한다.
 * imageCredit/imageCreditUrl이 없으면(직접 업로드한 사진 등) 기존에 있던
 * 저작자 표기 줄도 함께 제거한다 - 남아있으면 화면에 엉뚱한 저작자가 표시됨.
 */
function writeGuideImageFrontmatter(slug: string, data: ImageFrontmatter): string[] {
  const repoRoot = process.cwd();
  const updatedLocales: string[] = [];

  for (const locale of GUIDE_LOCALES) {
    const mdxPath = path.join(repoRoot, "content", "guides", locale, `${slug}.mdx`);
    if (!fs.existsSync(mdxPath)) continue;

    const text = fs.readFileSync(mdxPath, "utf-8");
    const parts = text.split("---");
    if (parts.length < 3) continue;

    let fm = parts[1];
    fm = fm
      .replace(/^image:.*\n?/m, "")
      .replace(/^imageCredit:.*\n?/m, "")
      .replace(/^imageCreditUrl:.*\n?/m, "");
    fm = fm.replace(/\n?$/, "\n");

    fm += `image: "${data.image}"\n`;
    if (data.imageCredit && data.imageCreditUrl) {
      fm += `imageCredit: "${data.imageCredit}"\n`;
      fm += `imageCreditUrl: "${data.imageCreditUrl}"\n`;
    }

    parts[1] = fm;
    fs.writeFileSync(mdxPath, parts.join("---"), "utf-8");
    updatedLocales.push(locale);
  }

  return updatedLocales;
}

/** 기존에 저장돼 있던 {slug}.* 이미지 파일을 전부 지운다 (확장자가 바뀌는 경우 이전 파일이 남지 않도록). */
function removeExistingGuideImages(slug: string) {
  const imagesDir = path.join(process.cwd(), "public", "guides", "images");
  if (!fs.existsSync(imagesDir)) return;
  for (const file of fs.readdirSync(imagesDir)) {
    const base = file.slice(0, file.lastIndexOf("."));
    if (base === slug) {
      fs.unlinkSync(path.join(imagesDir, file));
    }
  }
}

/** Unsplash 후보 하나를 실제로 선택했을 때: 다운로드 추적 → 이미지 저장 → 4개 언어 frontmatter 갱신. */
export async function applyGuideImage(
  slug: string,
  candidate: UnsplashCandidate,
): Promise<{ image: string; imageCredit: string; imageCreditUrl: string; updatedLocales: string[] }> {
  const accessKey = getAccessKey();

  // Unsplash API 가이드라인: 실제 사용(적용) 시점에만 download_location 호출.
  if (candidate.downloadLocation) {
    try {
      await fetch(candidate.downloadLocation, {
        headers: { Authorization: `Client-ID ${accessKey}` },
      });
    } catch {
      // 다운로드 추적 실패는 치명적이지 않으므로 무시하고 계속 진행한다.
    }
  }

  const imageUrl = `${candidate.rawUrl}&w=1600&q=80&fm=webp&fit=crop`;
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new DevImageToolError("이미지 다운로드 실패", 502);
  }
  const buffer = Buffer.from(await imgRes.arrayBuffer());

  const imagesDir = path.join(process.cwd(), "public", "guides", "images");
  fs.mkdirSync(imagesDir, { recursive: true });
  removeExistingGuideImages(slug);
  fs.writeFileSync(path.join(imagesDir, `${slug}.webp`), buffer);

  const imageData = {
    image: `/guides/images/${slug}.webp`,
    imageCredit: candidate.photographerName,
    imageCreditUrl: candidate.photographerUrl,
  };
  const updatedLocales = writeGuideImageFrontmatter(slug, imageData);

  return { ...imageData, updatedLocales };
}

/**
 * 개발자가 직접 촬영/보유한 사진 파일을 그대로 대표 이미지로 저장한다.
 * Unsplash 저작자 표기가 필요 없으므로 imageCredit/imageCreditUrl은 쓰지
 * 않고(기존 값이 있었다면 제거), image 경로만 갱신한다.
 */
export async function applyUploadedGuideImage(
  slug: string,
  buffer: Buffer,
  extension: string,
): Promise<{ image: string; updatedLocales: string[] }> {
  const ext = extension.toLowerCase().replace(/^\./, "");
  if (!(ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new DevImageToolError(
      `지원하지 않는 파일 형식입니다 (허용: ${ALLOWED_UPLOAD_EXTENSIONS.join(", ")})`,
      400,
    );
  }
  if (buffer.byteLength === 0) {
    throw new DevImageToolError("빈 파일입니다.", 400);
  }
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new DevImageToolError(
      `파일이 너무 큽니다 (최대 ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)}MB)`,
      400,
    );
  }

  const imagesDir = path.join(process.cwd(), "public", "guides", "images");
  fs.mkdirSync(imagesDir, { recursive: true });
  removeExistingGuideImages(slug);
  fs.writeFileSync(path.join(imagesDir, `${slug}.${ext}`), buffer);

  const image = `/guides/images/${slug}.${ext}`;
  const updatedLocales = writeGuideImageFrontmatter(slug, { image });

  return { image, updatedLocales };
}
