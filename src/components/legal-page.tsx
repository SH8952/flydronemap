type LegalSection = {
  heading: string;
  body: string[];
};

/**
 * Shared prose layout for the four AdSense-required policy pages
 * (Privacy, Terms, About, Disclosure) — a title, optional "last updated"
 * line, and a list of heading+paragraph sections pulled from each locale's
 * translation namespace via `t.raw("sections")`.
 */
export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated?: string;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {updated ? (
          <p className="text-sm text-muted-foreground">{updated}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        {sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              {section.heading}
            </h2>
            {section.body.map((paragraph, i) => (
              <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
