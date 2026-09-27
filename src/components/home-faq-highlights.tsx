import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type FaqItem = { question: string; answer: string };

function pickRandomFaqs<T>(items: T[], count: number): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/**
 * Homepage FAQ highlight section — surfaces a random subset of the FAQ
 * content that already lives on `/faq` directly on the homepage, with its
 * own (smaller) FAQPage JSON-LD limited to only the items actually
 * rendered here (per Google's structured-data guidance: only markup what
 * is visibly on the page).
 *
 * Added 2026-09-27 alongside the HomeGuideHighlights expansion, for the
 * same AdSense re-review reason: making existing crawlable content more
 * visible from the homepage itself. Unlike ExifLens, FlyDroneMap has no
 * per-tool FAQ sources (no `tools-roster.ts` concept), so this pulls only
 * from the single `Home.faq` list that `/faq` also uses.
 */
export async function HomeFaqHighlights() {
  const t = await getTranslations("Home");
  const allFaqs: FaqItem[] = t.raw("faq");
  const faqs = pickRandomFaqs(allFaqs, 4);

  if (faqs.length === 0) return null;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("faqHighlightsTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("faqHighlightsSubtitle")}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {faqs.map((item, i) => (
          <details
            key={i}
            className="group rounded-lg border border-border bg-card px-4 py-3"
          >
            <summary className="cursor-pointer list-none text-sm font-medium marker:content-none">
              <span className="flex items-center justify-between gap-4">
                {item.question}
                <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
      <Link
        href="/faq"
        className="text-sm font-medium underline-offset-4 hover:underline"
      >
        {t("faqHighlightsCta")}
      </Link>
    </section>
  );
}
