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
 */
export function AdZone({ id, label, size, className }: AdZoneProps) {
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
