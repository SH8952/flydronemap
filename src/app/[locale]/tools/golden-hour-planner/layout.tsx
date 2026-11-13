import type { ReactNode } from "react";
import { ClientMessages } from "@/i18n/client-messages";

// 이 페이지의 클라이언트 컴포넌트가 쓰는 번역만 브라우저로 전달한다(2026-11-13 사용량 최적화).
export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ClientMessages locale={locale} namespaces={["Share", "Tools.goldenHour"]}>
      {children}
    </ClientMessages>
  );
}
