"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Panel, useToast } from "@robr0/design-system";

import styles from "./ResumeArtifact.module.css";

export interface ResumeArtifactProps {
  title: string;
  subtitle: string;
  markdown: string;
}

function safeFileStem(title: string): string {
  const cleaned = title.replace(/[^\w\s.-]+/g, "").trim().replace(/\s+/g, " ");
  return cleaned || "Resume";
}

export function ResumeArtifact({ title, subtitle, markdown }: ResumeArtifactProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFileStem(title)}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/optimize/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subtitle, markdown }),
      });
      if (!response.ok) {
        throw new Error("save-failed");
      }
      toast({
        variant: "positive",
        title: t("optimizeArtifactSaved"),
        duration: 4000,
      });
    } catch {
      toast({
        variant: "error",
        title: t("optimizeArtifactSaveFailed"),
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel className={styles.card} padding="compact">
      <div className={styles.row}>
        <div className={styles.meta}>
          <span className={`material-symbols-outlined ${styles.icon}`} aria-hidden>
            description
          </span>
          <div className={styles.text}>
            <p className={styles.title}>{title}</p>
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
        </div>
        <div className={styles.actions}>
          <Button
            label={t("optimizeArtifactDownload")}
            variant="secondary"
            size="compact"
            onClick={handleDownload}
          />
          <Button
            label={t("optimizeArtifactSave")}
            variant="primary"
            size="compact"
            loading={saving}
            disabled={saving}
            onClick={() => void handleSave()}
          />
        </div>
      </div>
    </Panel>
  );
}
