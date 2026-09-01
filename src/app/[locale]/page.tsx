import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdZone } from "@/components/ad-zone";
import { DroneDashboard } from "@/components/drone-dashboard";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const usageSteps = t.raw("usageSteps") as string[];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <DroneDashboard />

      <AdZone
        id="mid-content"
        label="Ad"
        size="300×250"
        className="max-w-[300px]"
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t("usageTitle")}</h2>
        <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
          {usageSteps.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-semibold text-foreground">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
