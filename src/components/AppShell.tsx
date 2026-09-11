"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  AppSidebar,
  Divider,
  Drawer,
  Nav,
  NavList,
  SegmentedControl,
  ToggleSwitch,
} from "@robr0/design-system";
import type { AppSidebarSection } from "@robr0/design-system/components/AppSidebar/AppSidebar";
import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/theme";
import { useLocale } from "@/lib/locale";
import type { Locale } from "@/i18n/config";
import styles from "./AppShell.module.css";

const NAV_ITEMS = [
  { key: "scout", labelKey: "navScout", icon: "explore", href: "/scout" },
  { key: "optimize", labelKey: "navOptimize", icon: "tune", href: "/optimize" },
  { key: "jobs", labelKey: "navJobs", icon: "work", href: "/jobs" },
  { key: "profile", labelKey: "navProfile", icon: "person", href: "/profile" },
] as const;

const LOCALE_SEGMENTS = [
  { value: "en", label: "EN" },
  { value: "vi", label: "VI" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const t = useTranslations();
  const [navOpen, setNavOpen] = useState(false);

  const sections: AppSidebarSection[] = [
    {
      items: NAV_ITEMS.map(({ key, labelKey, icon, href }) => ({
        key,
        label: t(labelKey),
        icon,
        href,
      })),
    },
  ];

  const mobileNavItems = NAV_ITEMS.map(({ key, labelKey, href }) => ({
    id: key,
    label: t(labelKey),
    href,
  }));

  const activeKey = NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.key;

  const shellFooter = (
    <div className={styles.footerSlot}>
      <ToggleSwitch
        label={t("themeDark")}
        checked={theme === "dark"}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      />
      <SegmentedControl
        segments={[...LOCALE_SEGMENTS]}
        activeSegment={locale}
        onSegmentChange={(value) => setLocale(value as Locale)}
        size="compact"
        fullWidth
        ariaLabel={t("languageLabel")}
      />
    </div>
  );

  return (
    <div className={styles.shell}>
      <AppSidebar
        className={styles.sidebar}
        sections={sections}
        activeKey={activeKey}
        logoText={t("appName")}
        footerSlot={shellFooter}
      />
      <header className={styles.mobileBar}>
        <Nav
          brandText={t("appName")}
          buttons={[
            {
              label: "Menu",
              iconLeft: "menu",
              variant: "secondary",
              onClick: () => setNavOpen(true),
            },
          ]}
        />
      </header>
      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>
      <Drawer
        open={navOpen}
        onOpenChange={setNavOpen}
        title={t("appName")}
        description="Product navigation"
        side="left"
        size="sm"
        footer={
          <>
            <Divider spacing="md" />
            {shellFooter}
          </>
        }
      >
        <NavList
          items={mobileNavItems}
          currentHref={pathname}
          onNavigate={() => setNavOpen(false)}
        />
      </Drawer>
    </div>
  );
}
