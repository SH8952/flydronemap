"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export interface GuideCategoryItem {
  slug: string;
  title: string;
  description: string;
  dateLabel: string;
}

// Runs before the browser paints on the client (so a restored "expanded"
// state never flashes as collapsed first), but falls back to useEffect on the
// server where useLayoutEffect isn't available.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Remembers which category sections the visitor expanded, for this browser
// tab only (sessionStorage), so pressing Back from a guide returns to the
// same expanded list instead of resetting to the collapsed one.
const EXPANDED_STORAGE_PREFIX = "guides-expanded:";

interface GuideCategorySectionProps {
  categoryLabel: string;
  items: GuideCategoryItem[];
  expandLabel: string;
  collapseLabel: string;
  initialVisibleCount?: number;
}

export function GuideCategorySection({
  categoryLabel,
  items,
  expandLabel,
  collapseLabel,
  initialVisibleCount = 4,
}: GuideCategorySectionProps) {
  const storageKey = `${EXPANDED_STORAGE_PREFIX}${categoryLabel}`;
  const [expanded, setExpanded] = useState(false);

  useIsomorphicLayoutEffect(() => {
    try {
      if (window.sessionStorage.getItem(storageKey) === "1") {
        setExpanded(true);
      }
    } catch {
      // sessionStorage unavailable (private mode etc.) — stay collapsed.
    }
  }, [storageKey]);

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    try {
      if (next) {
        window.sessionStorage.setItem(storageKey, "1");
      } else {
        window.sessionStorage.removeItem(storageKey);
      }
    } catch {
      // Ignore storage errors — the toggle still works for this visit.
    }
  };
  const hasMore = items.length > initialVisibleCount;
  const visibleItems = expanded ? items : items.slice(0, initialVisibleCount);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold tracking-tight">{categoryLabel}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {visibleItems.map((item) => (
          <Link
            key={item.slug}
            href={`/guides/${item.slug}`}
            className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <h3 className="text-lg font-semibold tracking-tight">
              {item.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {item.description}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.dateLabel}
            </p>
          </Link>
        ))}
      </div>
      {hasMore ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-center"
          onClick={toggleExpanded}
        >
          {expanded ? collapseLabel : expandLabel}
        </Button>
      ) : null}
    </section>
  );
}
