import { EmptyState } from "@robr0/design-system";
import { getTranslations } from "next-intl/server";

import { readWorkingMemory } from "@/lib/working-memory/store";

export const dynamic = "force-dynamic";

export default async function ScoutPage() {
  const t = await getTranslations();
  const memory = await readWorkingMemory();
  const name = memory.profile.name.trim();

  return (
    <EmptyState
      icon="explore"
      title={name ? t("scoutGreeting", { name }) : t("scoutHeading")}
      description={t("scoutDescription")}
    />
  );
}