import NotFound from "@/app/not-found";
import PageHeader from "@/app/components/PageHeader";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import { SubscriptionsPage } from "@/src/features/dashboards";
import { useFeatureFlag } from "@/src/shared/lib/feature-flags";

export default function SubscriptionsRoute() {
  const isReady = useAuthGuard();
  const enabled = useFeatureFlag("email-subscriptions");
  if (!isReady) return null;
  if (!enabled) return <NotFound />;

  return (
    <>
      <PageHeader />
      <SubscriptionsPage />
    </>
  );
}
