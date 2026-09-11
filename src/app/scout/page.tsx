import { EmptyState } from "@robr0/design-system";
import { getTranslations } from "next-intl/server";

export default async function ScoutPage() {
  const t = await getTranslations();
  return (
    <EmptyState
      icon="explore"
      title={t("scoutHeading")}
      description={t("scoutDescription")}
    />
  );
}