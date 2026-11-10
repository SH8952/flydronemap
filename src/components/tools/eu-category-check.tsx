"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Chip, Field, Notice, SegmentedControl } from "@/components/tools/tool-ui";
import { parseNumber } from "@/lib/drone-tools/parse";
import { checkEuCategory, type DroneClass, type Subcategory } from "@/lib/drone-tools/eu-category";

const CLASSES: DroneClass[] = ["C0", "C1", "C2", "C3", "C4", "legacy", "private", "C5C6"];
const SOURCES = [
  { key: "sourceEasa", url: "https://www.easa.europa.eu/en/domains/drones-air-mobility/operating-drone/open-category-low-risk-civil-drones" },
  { key: "sourceEasaFaq", url: "https://www.easa.europa.eu/en/faq/116451" },
  { key: "sourceDe", url: "https://uas-betrieb.bund.de/homepage/en/information/categorizing-drone-operations/c-classified-drones" },
];

export function EuCategoryCheck() {
  const t = useTranslations("Tools.euCategory");
  const [cls, setCls] = useState<DroneClass>("C1");
  const [mass, setMass] = useState("249");
  const [camera, setCamera] = useState<"yes" | "no">("yes");

  const needsMass = cls === "legacy" || cls === "private";
  const result = useMemo(
    () => checkEuCategory({ droneClass: cls, mtomGrams: needsMass ? parseNumber(mass) : undefined, hasCamera: camera === "yes" }),
    [cls, mass, camera, needsMass],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-lg border border-border p-5">
        <Field label={t("classLabel")}>
          <div className="flex flex-wrap gap-1.5">
            {CLASSES.map((c) => (
              <Chip key={c} active={cls === c} onClick={() => setCls(c)}>
                {t(`class_${c}`)}
              </Chip>
            ))}
          </div>
        </Field>
        <p className="text-xs text-muted-foreground">{t(`classHelp_${cls}`)}</p>
        {needsMass ? (
          <div className="max-w-xs">
            <Field label={t("massLabel")} htmlFor="eu-mass" help={t("massHelp")}>
              <Input id="eu-mass" inputMode="decimal" autoComplete="off" value={mass} onChange={(e) => setMass(e.target.value)} />
            </Field>
          </div>
        ) : null}
        <Field label={t("cameraLabel")}>
          <SegmentedControl<"yes" | "no">
            ariaLabel={t("cameraLabel")}
            value={camera}
            onChange={setCamera}
            options={[
              { value: "yes", label: t("cameraYes") },
              { value: "no", label: t("cameraNo") },
            ]}
          />
        </Field>
      </div>

      <section aria-live="polite" className="flex flex-col gap-4 rounded-lg border border-border p-5">
        <h2 className="text-lg font-semibold tracking-tight">{t("resultTitle")}</h2>
        {result.kind === "invalid" ? <Notice tone="warn">{t("invalidMass")}</Notice> : null}
        {result.kind === "tooHeavy" ? <Notice tone="warn">{t("tooHeavy")}</Notice> : null}
        {result.kind === "specific" ? <Notice tone="warn">{t("specific")}</Notice> : null}
        {result.kind === "open" ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{t("subcategoriesLabel")}</span>
              {result.subcategories.map((s) => (
                <span key={s} className="rounded-full border border-primary bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  {s}
                </span>
              ))}
            </div>

            <ul className="flex flex-col gap-3">
              {result.subcategories.map((s: Subcategory) => (
                <li key={s} className="flex flex-col gap-1 rounded-lg border border-border p-4">
                  <span className="text-sm font-semibold">{t(`sub_${s}_title`)}</span>
                  <span className="text-sm text-muted-foreground">{t(`sub_${s}_rule`)}</span>
                </li>
              ))}
            </ul>

            <dl className="grid gap-3 text-sm sm:grid-cols-[180px_1fr]">
              <dt className="font-medium">{t("trainingLabel")}</dt>
              <dd className="text-muted-foreground">{t(`training_${result.training}`)}</dd>
              <dt className="font-medium">{t("registrationLabel")}</dt>
              <dd className="text-muted-foreground">
                {result.registration === "yes"
                  ? t("registration_yes")
                  : camera === "yes"
                    ? t("registration_ifCamera_yes")
                    : t("registration_ifCamera_no")}
              </dd>
              <dt className="font-medium">{t("remoteIdLabel")}</dt>
              <dd className="text-muted-foreground">{result.directRemoteId ? t("remoteId_required") : t("remoteId_check")}</dd>
              <dt className="font-medium">{t("massLimitLabel")}</dt>
              <dd className="text-muted-foreground">{t("massLimitValue", { kg: result.maxMassKg })}</dd>
            </dl>

            {cls === "legacy" ? <Notice>{t("legacyNote")}</Notice> : null}
            <Notice>{t("generalLimits")}</Notice>
          </>
        ) : null}
        <p className="text-xs text-muted-foreground">{t("nationalNote")}</p>
      </section>

      <div className="flex flex-col gap-2 text-sm">
        <h2 className="text-base font-semibold">{t("sourcesTitle")}</h2>
        <ul className="flex flex-col gap-1">
          {SOURCES.map((s) => (
            <li key={s.url}>
              <a className="text-primary underline underline-offset-2" href={s.url} target="_blank" rel="noopener noreferrer">
                {t(s.key)}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">{t("verified")}</p>
      </div>
    </div>
  );
}
