"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, Notice, SegmentedControl, Stat } from "@/components/tools/tool-ui";
import { parseNumber } from "@/lib/drone-tools/parse";
import {
  roundWh,
  summarizeBatteries,
  whFromMah,
  type WhClass,
} from "@/lib/drone-tools/battery-wh";
import { cn } from "@/lib/utils";

type InputMode = "mah" | "wh";
type Row = { id: number; mah: string; volts: string; wh: string; qty: string };

const MAX_ROWS = 6;
const FAA_URL = "https://www.faa.gov/hazmat/packsafe/lithium-batteries";
const IATA_URL =
  "https://www.iata.org/contentassets/05e6d8742b0047259bf3a700bc9d424a/passenger-lithium-battery-guidance-document.pdf";

const CLASS_STYLE: Record<WhClass, string> = {
  standard: "border-emerald-500/50 bg-emerald-500/10",
  approval: "border-amber-500/50 bg-amber-500/10",
  forbidden: "border-red-500/50 bg-red-500/10",
};

export function BatteryAirlineCheck() {
  const t = useTranslations("Tools.batteryCheck");
  const locale = useLocale();
  const nf = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }), [locale]);

  const [mode, setMode] = useState<InputMode>("mah");
  const [rows, setRows] = useState<Row[]>([{ id: 1, mah: "5000", volts: "15.4", wh: "77", qty: "3" }]);
  const [nextId, setNextId] = useState(2);

  const update = (id: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRow = () => {
    if (rows.length >= MAX_ROWS) return;
    setRows((rs) => [...rs, { id: nextId, mah: "", volts: "", wh: "", qty: "1" }]);
    setNextId((n) => n + 1);
  };
  const removeRow = (id: number) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));

  const calc = useMemo(() => {
    const parsed: { wh: number; qty: number }[] = [];
    for (const r of rows) {
      const qty = parseNumber(r.qty);
      const wh = mode === "mah" ? whFromMah(parseNumber(r.mah), parseNumber(r.volts)) : parseNumber(r.wh);
      if (!(wh > 0) || !Number.isFinite(wh) || !(qty > 0) || !Number.isInteger(qty)) return null;
      parsed.push({ wh: roundWh(wh), qty });
    }
    return summarizeBatteries(parsed);
  }, [rows, mode]);

  const clsLabel = (c: WhClass) =>
    t(c === "standard" ? "classStandard" : c === "approval" ? "classApproval" : "classForbidden");
  const clsDesc = (c: WhClass) =>
    t(c === "standard" ? "descStandard" : c === "approval" ? "descApproval" : "descForbidden");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-lg border border-border p-5">
        <Field label={t("modeLabel")}>
          <SegmentedControl<InputMode>
            ariaLabel={t("modeLabel")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "mah", label: t("modeMah") },
              { value: "wh", label: t("modeWh") },
            ]}
          />
        </Field>

        {rows.map((r, i) => (
          <div key={r.id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{t("rowTitle", { n: i + 1 })}</h3>
              {rows.length > 1 ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(r.id)}>
                  <Trash2 className="size-4" aria-hidden />
                  {t("removeRow")}
                </Button>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {mode === "mah" ? (
                <>
                  <Field label={t("capacityLabel")} htmlFor={`bat-mah-${r.id}`}>
                    <Input
                      id={`bat-mah-${r.id}`}
                      inputMode="decimal"
                      autoComplete="off"
                      value={r.mah}
                      onChange={(e) => update(r.id, { mah: e.target.value })}
                    />
                  </Field>
                  <Field label={t("voltsLabel")} htmlFor={`bat-volts-${r.id}`} help={i === 0 ? t("voltsHelp") : undefined}>
                    <Input
                      id={`bat-volts-${r.id}`}
                      inputMode="decimal"
                      autoComplete="off"
                      value={r.volts}
                      onChange={(e) => update(r.id, { volts: e.target.value })}
                    />
                  </Field>
                </>
              ) : (
                <Field label={t("whLabel")} htmlFor={`bat-wh-${r.id}`} help={i === 0 ? t("whHelp") : undefined}>
                  <Input
                    id={`bat-wh-${r.id}`}
                    inputMode="decimal"
                    autoComplete="off"
                    value={r.wh}
                    onChange={(e) => update(r.id, { wh: e.target.value })}
                  />
                </Field>
              )}
              <Field label={t("qtyLabel")} htmlFor={`bat-qty-${r.id}`}>
                <Input
                  id={`bat-qty-${r.id}`}
                  inputMode="numeric"
                  autoComplete="off"
                  value={r.qty}
                  onChange={(e) => update(r.id, { qty: e.target.value })}
                />
              </Field>
            </div>
          </div>
        ))}

        {rows.length < MAX_ROWS ? (
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={addRow}>
            <Plus className="size-4" aria-hidden />
            {t("addRow")}
          </Button>
        ) : null}
      </div>

      <section aria-live="polite" className="flex flex-col gap-4 rounded-lg border border-border p-5">
        <h2 className="text-lg font-semibold tracking-tight">{t("resultTitle")}</h2>
        {!calc ? (
          <Notice tone="warn">{t("invalid")}</Notice>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label={t("totalWh")} value={t("totalWhValue", { value: nf.format(calc.totalWh) })} />
              <Stat label={t("totalQty")} value={t("totalQtyValue", { value: nf.format(calc.totalQty) })} />
            </div>

            <ul className="flex flex-col gap-3">
              {calc.rows.map((r, i) => (
                <li key={rows[i].id} className={cn("flex flex-col gap-1 rounded-lg border p-4", CLASS_STYLE[r.cls])}>
                  <span className="text-xs text-muted-foreground">
                    {t("rowTitle", { n: i + 1 })} × {nf.format(r.qty)} · {t("perBattery", { value: nf.format(r.wh) })}
                  </span>
                  <span className="text-base font-semibold">{clsLabel(r.cls)}</span>
                  <span className="text-sm text-muted-foreground">{clsDesc(r.cls)}</span>
                </li>
              ))}
            </ul>

            {calc.hasForbidden ? <Notice tone="warn">{t("warnForbidden")}</Notice> : null}
            {calc.approvalOverLimit ? (
              <Notice tone="warn">{t("warnApprovalQty", { count: calc.approvalQty })}</Notice>
            ) : null}
          </>
        )}
      </section>

      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">{t("tableTitle")}</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">{t("colClass")}</th>
                <th className="px-3 py-2 font-medium">{t("colCarryOn")}</th>
                <th className="px-3 py-2 font-medium">{t("colChecked")}</th>
                <th className="px-3 py-2 font-medium">{t("colApproval")}</th>
                <th className="px-3 py-2 font-medium">{t("colQuantity")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <th scope="row" className="px-3 py-2 text-left font-medium">{t("classStandard")}</th>
                <td className="px-3 py-2">{t("yes")}</td>
                <td className="px-3 py-2">{t("no")}</td>
                <td className="px-3 py-2">{t("notNeeded")}</td>
                <td className="px-3 py-2">{t("perAirline")}</td>
              </tr>
              <tr className="border-t border-border">
                <th scope="row" className="px-3 py-2 text-left font-medium">{t("classApproval")}</th>
                <td className="px-3 py-2">{t("yes")}</td>
                <td className="px-3 py-2">{t("no")}</td>
                <td className="px-3 py-2">{t("needed")}</td>
                <td className="px-3 py-2">{t("perPerson2")}</td>
              </tr>
              <tr className="border-t border-border">
                <th scope="row" className="px-3 py-2 text-left font-medium">{t("classForbidden")}</th>
                <td className="px-3 py-2">{t("no")}</td>
                <td className="px-3 py-2">{t("no")}</td>
                <td className="px-3 py-2">{t("notAllowed")}</td>
                <td className="px-3 py-2">—</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("installedNote")}
        </p>
      </div>

      <Notice>
        <strong className="font-semibold text-foreground">{t("protectTitle")}.</strong> {t("protectBody")}
      </Notice>

      <div className="flex flex-col gap-2 text-sm">
        <h2 className="text-base font-semibold">{t("sourcesTitle")}</h2>
        <ul className="flex flex-col gap-1">
          <li>
            <a className="text-primary underline underline-offset-2" href={FAA_URL} target="_blank" rel="noopener noreferrer">
              {t("sourceFaa")}
            </a>
          </li>
          <li>
            <a className="text-primary underline underline-offset-2" href={IATA_URL} target="_blank" rel="noopener noreferrer">
              {t("sourceIata")}
            </a>
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">{t("verified")}</p>
      </div>
    </div>
  );
}
