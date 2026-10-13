"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Alert, Button, EmptyState } from "@robr0/design-system";

import type { ResumeSummary } from "@/lib/working-memory/types";

import { OptimizeChat } from "./OptimizeChat";
import { OptimizeLanding } from "./OptimizeLanding";
import styles from "./Optimize.module.css";

interface Props {
  resume: ResumeSummary | null;
  profileName: string;
}

export function OptimizeView({
  resume: initialResume,
  profileName: initialProfileName,
}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [uploadedResume, setUploadedResume] = useState<ResumeSummary | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const inSession = searchParams.get("session") === "1";

  const resume = uploadedResume ?? initialResume;
  const profileName = uploadedName ?? initialProfileName;

  if (inSession && resume) {
    return <OptimizeChat resume={resume} />;
  }

  if (inSession && !resume) {
    return (
      <div className={styles.page}>
        <EmptyState
          icon="tune"
          title={t("optimizeSessionMissingTitle")}
          description={t("optimizeSessionMissingDescription")}
        />
        <div className={styles.sessionMissing}>
          <Alert
            variant="warning"
            title={t("optimizeSessionMissingAlert")}
            size="compact"
          />
          <Button
            label={t("optimizeSessionBack")}
            variant="primary"
            onClick={() => router.replace("/optimize")}
          />
        </div>
      </div>
    );
  }

  return (
    <OptimizeLanding
      resume={resume}
      profileName={profileName}
      onResumeChange={setUploadedResume}
      onProfileNameChange={setUploadedName}
    />
  );
}
