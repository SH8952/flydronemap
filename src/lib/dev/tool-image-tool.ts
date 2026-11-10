/**
 * 개발자 전용 도구 이미지 관리 도구의 서버 로직 (가이드용 guide-image-tool.ts의 도구 페이지 버전).
 *
 * 로컬 개발 서버(`npm run dev`)에서만 쓰이며, 이 파일을 쓰는 `/api/dev/tool-image-*` 라우트는
 * NODE_ENV가 "development"가 아니면 즉시 403을 반환한다. 가이드용 파일은 수정하지 않고
 * 후보 검색·오류 타입·허용 확장자만 가져다 쓴다.
 *
 * 저장 위치: 이미지 → public/tools/images/{slug}.{ext}, 정보 → src/lib/tool-images.json
 * slug는 TOOLS 목록에 있는 값만 허용한다(임의 경로 쓰기 방지).
 * git add/commit/push는 하지 않는다 - 별도 push 스크립트로 반영.
 */
import fs from "node:fs";
import path from "node:path";
import { TOOLS } from "@/lib/tools";
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  DevImageToolError,
  MAX_UPLOAD_BYTES,
  type UnsplashCandidate,
} from "@/lib/dev/guide-image-tool";

const JSON_REL = path.join("src", "lib", "tool-images.json");
const IMAGES_REL = path.join("public", "tools", "images");

export function assertToolSlug(slug: string): void {
  if (!TOOLS.some((t) => t.slug === slug)) {
    throw new DevImageToolError("알 수 없는 도구입니다.", 400);
  }
}

function readEntries(): Record<string, unknown> {
  const file = path.join(process.cwd(), JSON_REL);
  if (!fs.existsSync(file)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    throw new DevImageToolError("tool-images.json을 읽을 수 없습니다. 파일을 확인해 주세요.", 500);
  }
}

function writeEntry(slug: string, entry: { image: string; imageCredit?: string; imageCreditUrl?: string }) {
  const entries = readEntries();
  entries[slug] = entry;
  // 도구 목록 순서대로 정렬해 diff가 안정적이게 한다.
  const ordered: Record<string, unknown> = {};
  for (const t of TOOLS) if (entries[t.slug]) ordered[t.slug] = entries[t.slug];
  fs.writeFileSync(path.join(process.cwd(), JSON_REL), JSON.stringify(ordered, null, 2) + "\n", "utf-8");
}

function removeExistingImages(slug: string) {
  const dir = path.join(process.cwd(), IMAGES_REL);
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (file.slice(0, file.lastIndexOf(".")) === slug) fs.unlinkSync(path.join(dir, file));
  }
}

export async function applyToolImage(slug: string, candidate: UnsplashCandidate) {
  assertToolSlug(slug);
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    throw new DevImageToolError("UNSPLASH_ACCESS_KEY가 설정되어 있지 않습니다 (.env.local 확인)", 500);
  }
  // 이미지 주소는 Unsplash 이미지 서버만 허용한다.
  let host = "";
  try {
    host = new URL(candidate.rawUrl).hostname;
  } catch {
    throw new DevImageToolError("잘못된 이미지 주소입니다.", 400);
  }
  if (host !== "images.unsplash.com") {
    throw new DevImageToolError("Unsplash 이미지 주소만 사용할 수 있습니다.", 400);
  }

  if (candidate.downloadLocation) {
    try {
      await fetch(candidate.downloadLocation, { headers: { Authorization: `Client-ID ${accessKey}` } });
    } catch {
      // 다운로드 추적 실패는 치명적이지 않다.
    }
  }

  const sep = candidate.rawUrl.includes("?") ? "&" : "?";
  const imgRes = await fetch(`${candidate.rawUrl}${sep}w=1600&q=80&fm=webp&fit=crop`);
  if (!imgRes.ok) throw new DevImageToolError("이미지 다운로드 실패", 502);
  const buffer = Buffer.from(await imgRes.arrayBuffer());

  fs.mkdirSync(path.join(process.cwd(), IMAGES_REL), { recursive: true });
  removeExistingImages(slug);
  fs.writeFileSync(path.join(process.cwd(), IMAGES_REL, `${slug}.webp`), buffer);

  const entry = {
    image: `/tools/images/${slug}.webp`,
    imageCredit: candidate.photographerName,
    imageCreditUrl: candidate.photographerUrl,
  };
  writeEntry(slug, entry);
  return entry;
}

export async function applyUploadedToolImage(slug: string, buffer: Buffer, extension: string) {
  assertToolSlug(slug);
  const ext = extension.toLowerCase().replace(/^\./, "");
  if (!(ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new DevImageToolError(`지원하지 않는 파일 형식입니다 (허용: ${ALLOWED_UPLOAD_EXTENSIONS.join(", ")})`, 400);
  }
  if (buffer.byteLength === 0) throw new DevImageToolError("빈 파일입니다.", 400);
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new DevImageToolError(`파일이 너무 큽니다 (최대 ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)}MB)`, 400);
  }

  fs.mkdirSync(path.join(process.cwd(), IMAGES_REL), { recursive: true });
  removeExistingImages(slug);
  fs.writeFileSync(path.join(process.cwd(), IMAGES_REL, `${slug}.${ext}`), buffer);

  const entry = { image: `/tools/images/${slug}.${ext}` };
  writeEntry(slug, entry);
  return entry;
}
