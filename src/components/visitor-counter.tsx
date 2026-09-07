"use client";

import { useEffect, useState } from "react";

interface VisitorCounts {
  daily: number;
  total: number;
}

/**
 * Small footer badge showing today's (KST) and cumulative visitor counts.
 * Fetches /api/visitor-count on mount; renders nothing until the counts
 * arrive (and stays hidden if the request fails, e.g. KV not connected).
 */
export function VisitorCounter() {
  const [counts, setCounts] = useState<VisitorCounts | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/visitor-count")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Partial<VisitorCounts> | null) => {
        if (
          !cancelled &&
          data &&
          typeof data.daily === "number" &&
          typeof data.total === "number"
        ) {
          setCounts({ daily: data.daily, total: data.total });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!counts) return null;

  return (
    <span>
      Today {counts.daily.toLocaleString()} · Total {counts.total.toLocaleString()}
    </span>
  );
}

