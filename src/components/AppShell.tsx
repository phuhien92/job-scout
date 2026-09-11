"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppSidebar, ToggleSwitch } from "@robr0/design-system";
import type { AppSidebarSection } from "@robr0/design-system/components/AppSidebar/AppSidebar";
import { useTheme } from "@/lib/theme";
import styles from "./AppShell.module.css";

const NAV_ITEMS = [
  { key: "scout", label: "Scout", icon: "explore", href: "/scout" },
  { key: "optimize", label: "Optimize", icon: "tune", href: "/optimize" },
  { key: "jobs", label: "Jobs", icon: "work", href: "/jobs" },
  { key: "profile", label: "Profile", icon: "person", href: "/profile" },
];

const sections: AppSidebarSection[] = [
  {
    items: NAV_ITEMS.map(({ key, label, icon, href }) => ({
      key,
      label,
      icon,
      href,
    })),
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const activeKey = NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.key;

  return (
    <div className={styles.shell}>
      <AppSidebar
        sections={sections}
        activeKey={activeKey}
        logoText="Job scout"
        theme="inherit"
        footerSlot={
          <ToggleSwitch
            label="Dark theme"
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        }
      />
      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
