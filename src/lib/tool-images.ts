import images from "./tool-images.json";

/**
 * 도구 페이지의 대표 이미지 정보. `tool-images.json`(도구 slug → 이미지 정보)을
 * 개발자 전용 이미지 관리 패널이 갱신한다. 항목이 없으면 이미지 없이 지금과 똑같이 보인다.
 */
export type ToolImage = {
  /** /tools/images/{slug}.webp 같은 사이트 내부 경로 */
  image: string;
  /** Unsplash 사진일 때만 있음 (직접 업로드한 사진에는 없음) */
  imageCredit?: string;
  imageCreditUrl?: string;
};

const MAP = images as Record<string, ToolImage | undefined>;

export function getToolImage(slug: string): ToolImage | null {
  const entry = MAP[slug];
  return entry && typeof entry.image === "string" && entry.image.startsWith("/") ? entry : null;
}
