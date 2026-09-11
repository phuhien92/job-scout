import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "@robr0/design-system/tokens/tokens.css";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { LocaleProvider } from "@/lib/locale";
import { AppShell } from "@/components/AppShell";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

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
    <html lang={locale} data-theme="dark" className={nunitoSans.variable}>
      <body>
        <ThemeProvider>
          <NextIntlClientProvider>
            <LocaleProvider initialLocale={locale}>
              <AppShell>{children}</AppShell>
            </LocaleProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
