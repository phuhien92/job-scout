"use client";

import { Button, Panel } from "@robr0/design-system";
import { useTranslations } from "next-intl";

import type { JobListing } from "@/lib/chat/tool-parts";

import styles from "./JobCard.module.css";

interface Props {
  job: JobListing;
}

export function JobCard({ job }: Props) {
  const t = useTranslations();
  const meta = [job.company, job.location, job.remote ? t("scoutJobRemote") : null, job.salary]
    .filter(Boolean)
    .join(" · ");

  return (
    <Panel padding="compact" className={styles.card}>
      <div className={styles.body}>
        <h3 className={styles.title}>{job.title}</h3>
        <p className={styles.meta}>{meta}</p>
        {job.summary ? <p className={styles.summary}>{job.summary}</p> : null}
      </div>
      <Button
        variant="primary"
        size="compact"
        label={t("scoutJobOpen")}
        href={job.url}
        target="_blank"
        rel="noopener noreferrer"
      />
    </Panel>
  );
}
