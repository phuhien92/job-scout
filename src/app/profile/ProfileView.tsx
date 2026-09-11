"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import {
  Alert,
  Button,
  DocumentChip,
  type DocumentChipFileType,
  EmptyState,
  FileInput,
  type FileInputFile,
  Input,
  SegmentedControl,
  type Segment,
  TagInput,
  Textarea,
} from "@robr0/design-system";

import type {
  Profile,
  RemotePreference,
  RemotePreferenceValue,
  ResumeFileType,
  ResumeSummary,
} from "@/lib/working-memory/types";

import styles from "./Profile.module.css";

const ERROR_TO_KEY: Record<string, string> = {
  "missing-file": "profileErrorMissingFile",
  "unsupported-format": "profileErrorUnsupportedFormat",
  "file-too-large": "profileErrorFileTooLarge",
  unreadable: "profileErrorUnreadable",
};

interface Props {
  resume: ResumeSummary | null;
  profile: Profile;
}

interface FileEntry extends FileInputFile {
  transient?: boolean;
}

function humanSize(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function chipType(fileType: ResumeFileType): DocumentChipFileType {
  switch (fileType) {
    case "pdf":
      return "pdf";
    case "docx":
      return "doc";
    case "txt":
      return "generic";
  }
}

function hasPdfExtension(name: string): boolean {
  return /\.(pdf|docx|txt)$/i.test(name.trim());
}

export function ProfileView({ resume, profile: initial }: Props) {
  const t = useTranslations();
  const router = useRouter();

  const [draft, setDraft] = useState<Profile>(initial);
  const [entries, setEntries] = useState<FileEntry[]>(() => {
    if (!resume) return [];
    return [{ id: "stored", name: resume.fileName, size: resume.size }];
  });
  const [storageError, setStorageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");

  const patchDraft = useCallback(
    <K extends keyof Profile>(key: K, value: Profile[K]) => {
      setDraft((current) => ({ ...current, [key]: value }));
      setSaveState("idle");
    },
    [],
  );

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      setStorageError(null);
      setSaveState("idle");

      const extensionOk = hasPdfExtension(file.name);
      const transientId = crypto.randomUUID();

      const entry: FileEntry = {
        id: transientId,
        name: file.name,
        size: file.size,
      };

      if (!extensionOk) {
        entry.error = t(ERROR_TO_KEY["unsupported-format"]);
        setEntries((current) => [...current, entry]);
        return;
      }

      entry.transient = true;
      entry.progress = 30;
      setEntries((current) => [...current, entry]);

      const formData = new FormData();
      formData.append("file", file);

      let response: Response;
      try {
        response = await fetch("/api/profile/upload", {
          method: "POST",
          body: formData,
        });
      } catch {
        entry.error = t("profileErrorUpload");
        setEntries((current) => current.map((e) => (e.id === entry.id ? entry : e)));
        return;
      }

      if (!response.ok) {
        let code = "upload-failed" as string;
        try {
          const body = (await response.json()) as { error?: { code?: string } };
          code = body.error?.code ?? code;
        } catch {
          // keep default
        }
        entry.error = t(ERROR_TO_KEY[code] ?? "profileErrorUpload");
        setEntries((current) => current.map((e) => (e.id === entry.id ? entry : e)));
        return;
      }

      try {
        const body = (await response.json()) as {
          resume: ResumeSummary;
          profile: Profile;
        };
        setEntries([{ id: "stored", name: body.resume.fileName, size: body.resume.size }]);
        setDraft(body.profile);
        setStorageError(null);
        router.refresh();
      } catch {
        entry.error = t("profileErrorUpload");
        setEntries((current) => current.map((e) => (e.id === entry.id ? entry : e)));
      }
    },
    [router, t],
  );

  const handleFileRemove = useCallback(
    async (id: string) => {
      const entry = entries.find((e) => e.id === id);
      if (entry?.transient) {
        setEntries((current) => current.filter((e) => e.id !== id));
        setStorageError(null);
        return;
      }

      let ok = false;
      try {
        ok = (await fetch("/api/profile/resume", { method: "DELETE" })).ok;
      } catch {
        // fall through to error state below
      }

      if (ok) {
        setEntries([]);
        setStorageError(null);
        router.refresh();
      } else {
        setStorageError(t("profileErrorUpload"));
      }
    },
    [entries, router, t],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveState("idle");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: draft }),
      });
      setSaveState(response.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    } finally {
      setSaving(false);
    }
  }, [draft]);

  const remoteSegments: Segment[] = [
    { value: "none", label: t("profileRemoteNotStated") },
    { value: "remote", label: t("profileRemoteRemote") },
    { value: "hybrid", label: t("profileRemoteHybrid") },
    { value: "onsite", label: t("profileRemoteOnsite") },
  ];

  const fileInputHelper = storageError ?? t("profileUploadHelper");

  if (!resume) {
    return (
      <div className={styles.page}>
        <EmptyState
          icon="person"
          title={t("profileHeading")}
          description={t("profileDescription")}
        />
        <div className={styles.card}>
          <FileInput
            label={t("profileUploadLabel")}
            placeholder={t("profileUploadPlaceholder")}
            helperText={fileInputHelper}
            error={storageError !== null}
            files={entries}
            accept=".pdf,.docx,.txt"
            onFilesSelected={handleFilesSelected}
            onFileRemove={handleFileRemove}
          />
        </div>
      </div>
    );
  }

  const storedEntry = entries.find((e) => e.id === "stored");
  const remoteValue: RemotePreference = draft.remotePreference;
  const remoteActive = remoteValue ?? "none";

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {storedEntry && (
          <div className={styles.chipRow}>
            <DocumentChip
              name={storedEntry.name}
              fileType={chipType(resume.fileType)}
              meta={humanSize(resume.size)}
              onRemove={() => handleFileRemove("stored")}
              removeLabel={t("profileFileRemoveLabel")}
            />
          </div>
        )}
        <FileInput
          label={t("profileUpdateTitle")}
          placeholder={t("profileUpdateDescription")}
          helperText={fileInputHelper}
          error={storageError !== null}
          files={entries}
          accept=".pdf,.docx,.txt"
          onFilesSelected={handleFilesSelected}
          onFileRemove={handleFileRemove}
        />
      </div>

      <div className={styles.card}>
        <div className={styles.fields}>
          <Input
            label={t("profileFieldName")}
            value={draft.name}
            onValueChange={(value) => patchDraft("name", value)}
          />
          <div className={styles.full}>
            <Textarea
              label={t("profileFieldSummary")}
              value={draft.summary}
              onValueChange={(value) => patchDraft("summary", value)}
              resize="vertical"
              maxLength={1000}
            />
          </div>
          <div className={styles.full}>
            <TagInput
              label={t("profileFieldSkills")}
              values={draft.skills}
              onValuesChange={(values) => patchDraft("skills", values)}
            />
          </div>
          <TagInput
            label={t("profileFieldTitles")}
            values={draft.titles}
            onValuesChange={(values) => patchDraft("titles", values)}
            maxTags={8}
          />
          <TagInput
            label={t("profileFieldLocations")}
            values={draft.locations}
            onValuesChange={(values) => patchDraft("locations", values)}
            maxTags={12}
          />
          <TagInput
            label={t("profileFieldSeniority")}
            values={draft.seniority}
            onValuesChange={(values) => patchDraft("seniority", values)}
            maxTags={8}
          />
          <TagInput
            label={t("profileFieldTargets")}
            values={draft.targetRoles}
            onValuesChange={(values) => patchDraft("targetRoles", values)}
            maxTags={8}
          />
          <div className={styles.full}>
            <SegmentedControl
              segments={remoteSegments}
              activeSegment={remoteActive}
              onSegmentChange={(value) =>
                patchDraft(
                  "remotePreference",
                  value === "none" ? null : (value as RemotePreferenceValue),
                )
              }
              variant="neutral"
              ariaLabel={t("profileFieldRemote")}
            />
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <p className={styles.note}>{t("profileFieldsNote")}</p>
        <div className={styles.footer}>
          <Button label={t("profileSave")} onClick={handleSave} loading={saving} />
          {saveState !== "idle" && (
            <div className={styles.saveStatus}>
              <Alert
                variant={saveState === "saved" ? "positive" : "error"}
                title={t(saveState === "saved" ? "profileSaved" : "profileSaveFailed")}
                size="compact"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}