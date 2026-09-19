import { getTranslations } from "next-intl/server";
import { GearRecommendation } from "@/components/gear-recommendation";
import { fetchInitialGearProducts } from "@/lib/gear-recommendation-ssr";

export async function GearRecommendationSection({
  locale,
}: {
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "Home" });
  const initialData = await fetchInitialGearProducts(locale);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("gearSectionTitle")}
      </h2>

      <GearRecommendation locale={locale} initialData={initialData} />
    </section>
  );
}
