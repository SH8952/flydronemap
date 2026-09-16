"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export interface GuideCategoryItem {
  slug: string;
  title: string;
  description: string;
  dateLabel: string;
}

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
  const [expanded, setExpanded] = useState(false);
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
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? collapseLabel : expandLabel}
        </Button>
      ) : null}
    </section>
  );
}
