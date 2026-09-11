import { EmptyState } from "@robr0/design-system";
import { getTranslations } from "next-intl/server";

export default async function ProfilePage() {
  const t = await getTranslations();
  return (
    <EmptyState
      icon="person"
      title={t("profileHeading")}
      description={t("profileDescription")}
    />
  );
}