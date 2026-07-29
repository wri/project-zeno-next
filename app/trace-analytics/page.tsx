"use client";
import { Suspense } from "react";
import { Center, Heading, Text, VStack } from "@chakra-ui/react";
import SettingsShell from "@/app/components/SettingsShell";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import useAuthStore from "@/app/store/authStore";
import { TraceAnalyticsScreen } from "@/src/features/trace-analytics";

export default function TraceAnalyticsPage() {
  const isReady = useAuthGuard();
  const { userType, userEmail } = useAuthStore();

  if (!isReady) return null;

  // UX gate only — the Zeno trace endpoints enforce superuser server-side.
  if (userType !== "superuser") {
    return (
      <SettingsShell activePath="/trace-analytics">
        <Center minH="100%" px={4}>
          <VStack gap={2} maxW="md" textAlign="center">
            <Heading size="md">Superuser access required</Heading>
            <Text color="fg.muted">
              You are signed in as {userEmail ?? "an unknown user"}, but trace
              analytics is only available to GNW superusers.
            </Text>
          </VStack>
        </Center>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell activePath="/trace-analytics">
      {/* useSearchParams (tab + deep links) requires a Suspense boundary. */}
      <Suspense fallback={null}>
        <TraceAnalyticsScreen />
      </Suspense>
    </SettingsShell>
  );
}
