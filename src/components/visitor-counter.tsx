"use client";

import { useEffect, useState } from "react";

/**
 * Small footer badge showing the site's total visitor count. Fetches
 * /api/visitor-count on mount; renders nothing until the count arrives
 * (and stays hidden if the request fails, e.g. KV not yet connected).
 */
export function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/visitor-count")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { count?: number } | null) => {
        if (!cancelled && data && typeof data.count === "number") {
          setCount(data.count);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (count === null) return null;

  return <span>Visitors: {count.toLocaleString()}</span>;
}
