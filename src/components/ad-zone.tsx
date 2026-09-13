import { cn } from "@/lib/utils";

type AdZoneProps = {
  id: string;
  label: string;
  size: string;
  className?: string;
};

/**
 * Placeholder for a Google AdSense unit. Swap the inner content for the
 * actual <ins class="adsbygoogle" /> tag + script once the AdSense account
 * is approved for this domain.
 *
 * [2026-09-13] AdSense가 아직 승인 전 상태라, 빈 광고 placeholder 박스가
 * 그대로 노출되면 심사 로봇이 "준비되지 않은 사이트"로 판단할 위험이 있어
 * 임시로 아무것도 렌더링하지 않도록 함. 승인 후 아래 상수만 true로 바꾸면
 * 원래대로 복원됨(호출부 코드는 전혀 변경하지 않음).
 */
const ADSENSE_APPROVED = false;

export function AdZone({ id, label, size, className }: AdZoneProps) {
  if (!ADSENSE_APPROVED) return null;

  return (
    <div
      data-ad-slot={id}
      className={cn(
        "mx-auto flex w-full max-w-3xl items-center justify-center rounded-md border border-dashed border-border bg-muted/40 text-xs text-muted-foreground",
        "h-[90px]",
        className,
      )}
    >
      {label} · {size}
    </div>
  );
}
