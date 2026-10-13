import { Suspense } from "react";
import { EmptyState } from "@robr0/design-system";
import { getTranslations } from "next-intl/server";

import { OptimizeView } from "@/components/OptimizeView";
import { readWorkingMemory } from "@/lib/working-memory/store";

export const dynamic = "force-dynamic";

export default async function OptimizePage() {
  const t = await getTranslations();
  const memory = await readWorkingMemory();
  const resume = memory.resume
    ? {
        fileName: memory.resume.fileName,
        fileType: memory.resume.fileType,
        size: memory.resume.size,
        uploadedAt: memory.resume.uploadedAt,
      }
    : null;

  return (
    <Suspense
      fallback={
        <EmptyState
          icon="tune"
          title={t("optimizeHeading")}
          description={t("optimizeDescription")}
        />
      }
    >
      <OptimizeView resume={resume} profileName={memory.profile.name} />
    </Suspense>
  );
}
