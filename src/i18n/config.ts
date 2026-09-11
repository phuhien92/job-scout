export const LOCALE_COOKIE = "locale";
export const LOCALES = ["en", "vi"] as const;
export const DEFAULT_LOCALE = "en";

export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "vi";
}
