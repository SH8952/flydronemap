import { getTranslations } from "next-intl/server";
import { GearRecommendation } from "@/components/gear-recommendation";

export async function GearRecommendationSection({
  locale,
}: {
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "Home" });

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("gearSectionTitle")}
      </h2>

      <GearRecommendation locale={locale} />
    </section>
  );
}
