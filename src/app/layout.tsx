import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
// Legacy component-only roles remain until issue #17 migrates those components.
import "@robr0/design-system/tokens/tokens.css";
import "./globals.css";
import { LocaleProvider } from "@/lib/locale";
import { AppShell } from "@/components/AppShell";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  colorScheme: "only light",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("appName"),
    description: t("metaDescription"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const requested = await getLocale();
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;

  return (
    <html lang={locale} data-theme="light" className={nunitoSans.variable}>
      <body>
        <NextIntlClientProvider>
          <LocaleProvider initialLocale={locale}>
            <AppShell>{children}</AppShell>
          </LocaleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
