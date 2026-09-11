"use client";
import { Suspense } from "react";
import { Center, Heading, Text, VStack } from "@chakra-ui/react";
import SettingsShell from "@/app/components/SettingsShell";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import useAuthStore from "@/app/store/authStore";
import { EvalsScreen } from "@/src/features/evals";

export default function EvalsPage() {
  const isReady = useAuthGuard();
  const { userType, userEmail } = useAuthStore();

  if (!isReady) return null;

  // UX gate only — the underlying ledger is the public gnw-gold-evals repo.
  if (userType !== "superuser") {
    return (
      <SettingsShell activePath="/evals">
        <Center minH="100%" px={4}>
          <VStack gap={2} maxW="md" textAlign="center">
            <Heading size="md">Superuser access required</Heading>
            <Text color="fg.muted">
              You are signed in as {userEmail ?? "an unknown user"}, but the
              evals dashboard is only available to GNW superusers.
            </Text>
          </VStack>
        </Center>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell activePath="/evals">
      {/* useSearchParams (tab + deep links) requires a Suspense boundary. */}
      <Suspense fallback={null}>
        <EvalsScreen />
      </Suspense>
    </SettingsShell>
  );
}
