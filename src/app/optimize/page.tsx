import { EmptyState } from "@robr0/design-system";
import { getTranslations } from "next-intl/server";

export default async function OptimizePage() {
  const t = await getTranslations();
  return (
    <EmptyState
      icon="tune"
      title={t("optimizeHeading")}
      description={t("optimizeDescription")}
    />
  );
}