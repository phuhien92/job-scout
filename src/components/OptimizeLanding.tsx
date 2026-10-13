"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

import {
  Alert,
  Button,
  Divider,
  FileInput,
  type FileInputFile,
  SelectionCard,
} from "@robr0/design-system";

import type { ResumeSummary } from "@/lib/working-memory/types";

import styles from "./Optimize.module.css";

const ERROR_TO_KEY: Record<string, string> = {
  "missing-file": "profileErrorMissingFile",
  "unsupported-format": "profileErrorUnsupportedFormat",
  "file-too-large": "profileErrorFileTooLarge",
  unreadable: "profileErrorUnreadable",
};

interface Props {
  resume: ResumeSummary | null;
  profileName: string;
  onResumeChange: (resume: ResumeSummary | null) => void;
  onProfileNameChange: (name: string) => void;
}

function hasSupportedExtension(name: string): boolean {
  return /\.(pdf|docx|txt)$/i.test(name.trim());
}

function formatUploadedAt(iso: string, locale: string, t: (key: string, values?: Record<string, string>) => string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return t("optimizeResumeStored");
  }
  const formatted = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
  return t("optimizeUploadedOn", { date: formatted });
}

function resumeOptionLabel(resume: ResumeSummary, profileName: string, t: (key: string, values?: Record<string, string>) => string) {
  const name = profileName.trim();
  if (name) {
    return t("optimizeResumeNamed", { name });
  }
  return resume.fileName;
}

export function OptimizeLanding({
  resume,
  profileName,
  onResumeChange,
  onProfileNameChange,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedId, setSelectedId] = useState(resume ? "stored" : "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<FileInputFile[]>([]);

  const canOptimize = Boolean(resume && selectedId === "stored");

  const handleOptimize = useCallback(() => {
    if (!canOptimize) return;
    router.push("/optimize?session=1");
  }, [canOptimize, router]);

  const handleUploadClick = useCallback(() => {
    setUploadError(null);
    fileInputRef.current?.click();
  }, []);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      setUploadError(null);

      if (!hasSupportedExtension(file.name)) {
        setUploadError(t("profileErrorUnsupportedFormat"));
        setUploadFiles([
          {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            error: t("profileErrorUnsupportedFormat"),
          },
        ]);
        return;
      }

      const transientId = crypto.randomUUID();
      setUploading(true);
      setUploadFiles([{ id: transientId, name: file.name, size: file.size, progress: 30 }]);

      const formData = new FormData();
      formData.append("file", file);

      let response: Response;
      try {
        response = await fetch("/api/profile/upload", {
          method: "POST",
          body: formData,
        });
      } catch {
        setUploading(false);
        setUploadError(t("profileErrorUpload"));
        setUploadFiles([
          {
            id: transientId,
            name: file.name,
            size: file.size,
            error: t("profileErrorUpload"),
          },
        ]);
        return;
      }

      if (!response.ok) {
        let code = "upload-failed";
        try {
          const body = (await response.json()) as { error?: { code?: string } };
          code = body.error?.code ?? code;
        } catch {
          // keep default
        }
        const message = t(ERROR_TO_KEY[code] ?? "profileErrorUpload");
        setUploading(false);
        setUploadError(message);
        setUploadFiles([
          {
            id: transientId,
            name: file.name,
            size: file.size,
            error: message,
          },
        ]);
        return;
      }

      try {
        const body = (await response.json()) as {
          resume: ResumeSummary;
          profile?: { name?: string };
        };
        onResumeChange(body.resume);
        if (typeof body.profile?.name === "string") {
          onProfileNameChange(body.profile.name);
        }
        setSelectedId("stored");
        setUploadFiles([]);
        setUploadError(null);
        router.refresh();
      } catch {
        setUploadError(t("profileErrorUpload"));
        setUploadFiles([
          {
            id: transientId,
            name: file.name,
            size: file.size,
            error: t("profileErrorUpload"),
          },
        ]);
      } finally {
        setUploading(false);
      }
    },
    [onProfileNameChange, onResumeChange, router, t],
  );

  const options = resume
    ? [
        {
          value: "stored",
          label: resumeOptionLabel(resume, profileName, t),
          description: formatUploadedAt(resume.uploadedAt, locale, t),
        },
      ]
    : [];

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.copy}>
          <h1 className={styles.headline}>{t("optimizeValueHeadline")}</h1>
          <ul className={styles.bullets}>
            <li className={styles.bullet}>{t("optimizeValueEvidence")}</li>
            <li className={styles.bullet}>{t("optimizeValueApprove")}</li>
            <li className={styles.bullet}>{t("optimizeValueHighlight")}</li>
          </ul>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{t("optimizeAddTitle")}</h2>
            <p className={styles.cardSubtitle}>{t("optimizeAddSubtitle")}</p>
          </div>

          {resume ? (
            <SelectionCard
              mode="radio"
              name={t("optimizeSelectLabel")}
              options={options}
              value={selectedId}
              onValueChange={(value) => {
                if (typeof value === "string") setSelectedId(value);
              }}
            />
          ) : (
            <p className={styles.cardSubtitle}>{t("optimizeNoResume")}</p>
          )}

          <div className={styles.actions}>
            <Button
              label={t("optimizeCta")}
              variant="primary"
              disabled={!canOptimize || uploading}
              onClick={handleOptimize}
            />
            <Divider label={t("optimizeOr")} labelPosition="center" spacing="sm" />
            <Button
              label={t("optimizeUpload")}
              variant="secondary"
              iconLeft="upload"
              loading={uploading}
              disabled={uploading}
              onClick={handleUploadClick}
            />
            <FileInput
              ref={fileInputRef}
              className={styles.hiddenFile}
              accept=".pdf,.docx,.txt"
              files={uploadFiles}
              onFilesSelected={(files) => void handleFilesSelected(files)}
              onFileRemove={() => {
                setUploadFiles([]);
                setUploadError(null);
              }}
              aria-label={t("optimizeUpload")}
            />
          </div>

          {uploadError && (
            <div className={styles.error}>
              <Alert variant="error" title={uploadError} size="compact" />
            </div>
          )}

          <p className={styles.disclaimer}>{t("optimizeDisclaimer")}</p>
        </div>
      </div>
    </div>
  );
}
