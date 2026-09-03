"use client";

/**
 * 개발자 전용 가이드 이미지 관리 패널.
 *
 * 로컬 개발 서버(npm run dev, localhost)에서 가이드 상세 페이지 우측 하단에
 * 뜨는 플로팅 도구. 두 가지 방식으로 대표 이미지를 교체할 수 있다.
 *
 * 1) Unsplash 검색: 검색어로 후보 이미지 여러 장을 받아 그중 하나를 고르면
 *    적용된다. 같은 검색어로 "검색"을 다시 누르면 다음 페이지 결과를 보여줘
 *    마음에 드는 사진이 없을 때 계속 새로운 후보를 볼 수 있다.
 * 2) 직접 업로드: 개발자가 촬영/보유한 사진 파일을 그대로 적용한다. 이 경우
 *    Unsplash 저작자 표기(imageCredit/imageCreditUrl)는 붙지 않는다.
 *
 * 두 방식 모두 git add/commit/push는 하지 않으므로, 적용 후에는 기존 방식
 * 대로 push 스크립트로 커밋해야 한다. 렌더링 여부(NODE_ENV 체크)는 이
 * 컴포넌트를 사용하는 서버 컴포넌트(guides/[slug]/page.tsx) 쪽에서
 * 처리한다 - 이 컴포넌트 자체는 항상 렌더링을 시도하므로 프로덕션 코드에
 * 절대로 직접 렌더링하지 않는다.
 *
 * (ExifLens 프로젝트에서 이미 구현·검증·배포까지 완료한 동일 컴포넌트를
 * FlyDroneMap에 이식한 것 - 변경 없음. 2026-09-03)
 *
 * 사이트 운영 기간 내내 계속 쓰는 상시 도구이므로 임의로 삭제하지 않는다.
 */
import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Candidate = {
  id: string;
  thumbUrl: string;
  rawUrl: string;
  downloadLocation: string | null;
  photographerName: string;
  photographerUrl: string;
};

type Props = {
  slug: string;
  currentImage?: string;
  currentImageCredit?: string;
  tags?: string[];
};

export function GuideImageDevPanel({ slug, currentImage, currentImageCredit, tags }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(() => (tags && tags.length > 0 ? tags.slice(0, 2).join(" ") : slug.replace(/-/g, " ")));
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedMsg, setAppliedMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;

    // 검색어가 지난번과 같으면 다음 페이지로, 바뀌었으면 1페이지부터 다시.
    const nextPage = trimmed === lastQuery ? page + 1 : 1;

    setLoading(true);
    setError(null);
    setAppliedMsg(null);
    try {
      const res = await fetch("/api/dev/guide-image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, page: nextPage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "검색 실패");
      setCandidates(data.results ?? []);
      setLastQuery(trimmed);
      setPage(nextPage);
      if (!data.results || data.results.length === 0) {
        setError(
          nextPage > 1
            ? "더 이상 결과가 없습니다. 검색어를 바꿔보세요."
            : "검색 결과가 없습니다. 다른 검색어를 시도해보세요.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApply(candidate: Candidate) {
    setApplyingId(candidate.id);
    setError(null);
    setAppliedMsg(null);
    try {
      const res = await fetch("/api/dev/guide-image-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, candidate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "적용 실패");
      setAppliedMsg(
        `적용 완료 (${data.updatedLocales.join(", ")}) - by ${data.imageCredit}. 페이지를 새로고침하면 반영됩니다. 아직 git commit/push는 되지 않았습니다.`,
      );
      setCandidates([]);
      setLastQuery(null);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "적용 중 오류가 발생했습니다.");
    } finally {
      setApplyingId(null);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    setAppliedMsg(null);
    try {
      const form = new FormData();
      form.append("slug", slug);
      form.append("file", file);
      const res = await fetch("/api/dev/guide-image-upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "업로드 실패");
      setAppliedMsg(
        `직접 업로드한 사진 적용 완료 (${data.updatedLocales.join(", ")}). 저작자 표기는 붙지 않습니다. 페이지를 새로고침하면 반영됩니다. 아직 git commit/push는 되지 않았습니다.`,
      );
      setCandidates([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,380px)] font-sans text-sm">
      {!open ? (
        <Button
          onClick={() => setOpen(true)}
          variant="secondary"
          className="shadow-lg border border-dashed border-amber-500"
        >
          🛠 이미지 관리 (DEV)
        </Button>
      ) : (
        <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto rounded-lg border border-amber-500 bg-background p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-amber-600">🛠 가이드 이미지 관리 (개발자 전용)</span>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              닫기
            </Button>
          </div>

          <div className="flex flex-col gap-1 rounded-md bg-muted/50 p-2 text-xs">
            <div>
              <span className="text-muted-foreground">slug: </span>
              {slug}
            </div>
            <div>
              <span className="text-muted-foreground">현재 이미지: </span>
              {currentImage ?? "없음"}
            </div>
            {currentImageCredit ? (
              <div>
                <span className="text-muted-foreground">저작자: </span>
                {currentImageCredit}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  // 검색어를 손으로 바꾸기 시작하면 다음 검색은 다시 1페이지부터.
                  if (e.target.value.trim() !== lastQuery) setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="영문 검색어 (예: drone flying sky)"
                className="text-xs"
              />
              <Button size="sm" onClick={handleSearch} disabled={loading}>
                {loading ? "검색 중..." : lastQuery === query.trim() && candidates.length > 0 ? "다른 사진" : "검색"}
              </Button>
            </div>
            {lastQuery ? (
              <p className="text-[11px] text-muted-foreground">
                &quot;{lastQuery}&quot; {page}페이지 결과 - 마음에 드는 사진이 없으면 &quot;다른 사진&quot;을 다시 눌러보세요.
              </p>
            ) : null}
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          {appliedMsg ? <p className="text-xs text-emerald-600">{appliedMsg}</p> : null}

          {candidates.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleApply(c)}
                  disabled={applyingId !== null}
                  className="group relative aspect-square overflow-hidden rounded-md border border-transparent hover:border-primary disabled:opacity-50"
                  title={`by ${c.photographerName}`}
                >
                  <Image src={c.thumbUrl} alt={c.photographerName} fill sizes="120px" className="object-cover" unoptimized />
                  {applyingId === c.id ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] text-white">
                      적용 중...
                    </span>
                  ) : (
                    <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">
                      {c.photographerName}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <span className="text-xs font-medium">또는 직접 촬영한 사진 업로드</span>
            <p className="text-[11px] text-muted-foreground">
              Unsplash 저작자 표기 없이 그대로 대표 이미지로 사용됩니다. (jpg/jpeg/png/webp, 최대 15MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
              className="text-xs file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:text-secondary-foreground"
            />
            {uploading ? <p className="text-[11px] text-muted-foreground">업로드 및 적용 중...</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}
