"use client";

import { useEffect, useRef, useState } from "react";
import type { GuideHeading } from "@/lib/guides";

/** 이만큼(px) 스크롤하면 리모컨 목차가 나타난다. */
const SHOW_AFTER_PX = 480;

/**
 * 리모컨 목차 — 긴 글에서 스크롤해도 원하는 소제목으로 바로 이동.
 * - xl(1280px 이상): 본문(max-w-3xl) 오른쪽 여백에 고정된 패널.
 * - 그보다 좁은 화면: 오른쪽 아래 "목차" 버튼 + 펼침 패널(항목 선택·바깥 터치·Esc로 닫힘).
 * 현재 읽는 소제목(화면 위쪽 1/4 지점을 지난 마지막 H2)을 강조한다.
 * 쿠키 동의 바(z-50)보다 낮은 z-40을 사용한다.
 * (2026-10-17 신규 — ExifLens 구현과 동일한 동작)
 */
export function GuideFloatingToc({
  headings,
  title,
}: {
  headings: GuideHeading[];
  title: string;
}) {
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (headings.length < 2) return;
    let ticking = false;

    const update = () => {
      ticking = false;
      setVisible(window.scrollY > SHOW_AFTER_PX);
      const line = window.innerHeight / 4;
      let current: string | null = null;
      for (const heading of headings) {
        const el = document.getElementById(heading.id);
        if (el && el.getBoundingClientRect().top <= line) current = heading.id;
      }
      setActiveId(current);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [headings]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (headings.length < 2) return null;

  const list = (
    <ol className="flex flex-col gap-1.5 text-sm">
      {headings.map((heading, index) => {
        const active = heading.id === activeId;
        return (
          <li key={heading.id} className="flex gap-2">
            <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">
              {index + 1}.
            </span>
            <a
              href={`#${heading.id}`}
              onClick={() => setOpen(false)}
              aria-current={active ? "location" : undefined}
              className={
                active
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              {heading.text}
            </a>
          </li>
        );
      })}
    </ol>
  );

  return (
    <>
      {/* 데스크톱: 본문 오른쪽 여백 고정 패널 */}
      <nav
        aria-label={title}
        className={`fixed top-28 left-[calc(50%+25.5rem)] z-40 hidden max-h-[70vh] w-56 overflow-y-auto rounded-lg border border-border bg-background/95 p-3 shadow-sm backdrop-blur transition-opacity xl:block ${
          visible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        {list}
      </nav>

      {/* 모바일·태블릿: 오른쪽 아래 버튼 + 펼침 패널 */}
      <div
        ref={rootRef}
        className={`fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2 transition-opacity xl:hidden ${
          visible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {open ? (
          <nav
            aria-label={title}
            className="max-h-[60vh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-border bg-background p-3 shadow-lg"
          >
            {list}
          </nav>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium shadow-md"
        >
          ☰ {title}
        </button>
      </div>
    </>
  );
}
