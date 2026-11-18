import PageHeader from "@/app/components/PageHeader";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import { SubscriptionsPage } from "@/src/features/dashboards";

export default function SubscriptionsRoute() {
  const isReady = useAuthGuard();
  if (!isReady) return null;

  return (
    <>
      <PageHeader />
      <SubscriptionsPage />
    </>
  );
}
