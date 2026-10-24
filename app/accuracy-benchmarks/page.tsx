import { Center, Heading, Text, VStack } from "@chakra-ui/react";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import useAuthStore from "@/app/store/authStore";
import {
  AccuracyBenchmarksScreen,
  HomeLink,
} from "@/src/features/accuracy-benchmarks";

export default function AccuracyBenchmarksPage() {
  const isReady = useAuthGuard();
  const { userType, userEmail } = useAuthStore();

  if (!isReady) return null;

  // Superusers only while the benchmark is a draft (AJ, 2026-10-23). UX gate
  // only: the underlying data is the public gnw-gold-evals repo.
  if (userType !== "superuser") {
    return (
      <Center minH="60vh" px={4}>
        <VStack gap={2} maxW="md" textAlign="center">
          <Heading size="md">Superuser access required</Heading>
          <Text color="fg.muted">
            You are signed in as {userEmail ?? "an unknown user"}, but the
            accuracy benchmarks are only available to GNW superusers while the
            benchmark is in draft.
          </Text>
          <HomeLink />
        </VStack>
      </Center>
    );
  }

  // A standalone page: no app header (AJ, 2026-10-24).
  return <AccuracyBenchmarksScreen />;
}
