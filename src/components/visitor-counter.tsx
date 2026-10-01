"use client";

import { useEffect, useState } from "react";

interface VisitorCounts {
  daily: number;
  total: number;
}

interface VisitorCountsResponse extends VisitorCounts {
  botDaily?: number;
  botTotal?: number;
}

/**
 * Small footer badge showing today's (KST) and cumulative visitor counts.
 * Fetches /api/visitor-count on mount; renders nothing until the counts
 * arrive (and stays hidden if the request fails, e.g. KV not connected).
 *
 * The bot-count line only ever appears for the developer: the API only
 * includes botDaily/botTotal in its response when the request carries the
 * dev_exclude cookie (set by visiting with "?dev=<DEV_EXCLUDE_TOKEN>"), so a
 * regular visitor's response never has that data to render in the first
 * place — this isn't a CSS/UI hide, the numbers simply aren't sent to them.
 */
export function VisitorCounter() {
  const [counts, setCounts] = useState<VisitorCounts | null>(null);
  const [botCounts, setBotCounts] = useState<VisitorCounts | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/visitor-count")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Partial<VisitorCountsResponse> | null) => {
        if (
          !cancelled &&
          data &&
          typeof data.daily === "number" &&
          typeof data.total === "number"
        ) {
          setCounts({ daily: data.daily, total: data.total });
          if (
            typeof data.botDaily === "number" &&
            typeof data.botTotal === "number"
          ) {
            setBotCounts({ daily: data.botDaily, total: data.botTotal });
          }
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
      {botCounts && (
        <>
          {" "}
          (Bots today {botCounts.daily.toLocaleString()} · Total{" "}
          {botCounts.total.toLocaleString()})
        </>
      )}
    </span>
  );
}

