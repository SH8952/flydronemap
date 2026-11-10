"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/tools/tool-ui";
import { cn } from "@/lib/utils";

type Group = { title: string; items: string[] };

const STORAGE_KEY = "fdm-preflight-checklist-v1";

export function PreflightChecklist() {
  const t = useTranslations("Tools.checklist");
  const groups = t.raw("groups") as Group[];
  const total = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups]);

  // 체크 상태는 항목 위치("그룹번호-항목번호")로 저장한다. 언어를 바꿔도 같은 항목이 유지된다.
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  // 저장된 체크 상태는 브라우저에서만 읽을 수 있어 마운트 후 한 번 불러온다.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setChecked(new Set(parsed.filter((v): v is string => typeof v === "string")));
      }
    } catch {
      // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 저장 없이 동작한다.
    }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked]));
    } catch {
      // 무시
    }
  }, [checked, ready]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const done = groups.reduce((n, g, gi) => n + g.items.filter((_, ii) => checked.has(`${gi}-${ii}`)).length, 0);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="flex flex-col gap-5">
      <style>{`@media print {
  body * { visibility: hidden !important; }
  #fdm-checklist-print, #fdm-checklist-print * { visibility: visible !important; }
  #fdm-checklist-print { position: absolute; left: 0; top: 0; width: 100%; padding: 16px; color: #000; background: #fff; }
  #fdm-checklist-print [data-print-hide] { display: none !important; }
}`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3" data-print-hide>
        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{t("progress", { done, total })}</span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setChecked(new Set())}>
            <RotateCcw className="size-4" aria-hidden />
            {t("reset")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            {t("print")}
          </Button>
        </div>
      </div>

      <div id="fdm-checklist-print" className="flex flex-col gap-5">
        <h2 className="hidden text-lg font-bold print:block">{t("printTitle")}</h2>
        {groups.map((g, gi) => (
          <section key={g.title} className="flex flex-col gap-2 rounded-lg border border-border p-4 print:break-inside-avoid">
            <h3 className="text-base font-semibold">{g.title}</h3>
            <ul className="flex flex-col gap-1.5">
              {g.items.map((item, ii) => {
                const id = `${gi}-${ii}`;
                const on = checked.has(id);
                return (
                  <li key={id}>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-md p-1.5 text-sm hover:bg-muted/40">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(id)}
                        className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                      />
                      <span className={cn(on && "text-muted-foreground line-through decoration-muted-foreground/60 print:no-underline")}>{item}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {done === total && total > 0 ? <Notice>{t("allDone")}</Notice> : null}
      <p className="text-xs text-muted-foreground" data-print-hide>
        {t("storageNote")}
      </p>
    </div>
  );
}
