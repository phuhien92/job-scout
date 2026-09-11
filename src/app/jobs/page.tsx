import { EmptyState } from "@robr0/design-system";
import { getTranslations } from "next-intl/server";

export default async function JobsPage() {
  const t = await getTranslations();
  return (
    <EmptyState
      icon="work"
      title={t("jobsHeading")}
      description={t("jobsDescription")}
    />
  );
}