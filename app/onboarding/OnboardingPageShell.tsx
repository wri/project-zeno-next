"use client";

import { Suspense } from "react";
import { Box, Center, Spinner } from "@chakra-ui/react";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";

function Loading() {
  return (
    <Box minH="100vh" bg="bg" py={24}>
      <Center>
        <Spinner size="xl" />
      </Center>
    </Box>
  );
}

/**
 * The sign-up pages' shell (/onboarding, /welcome): a spinner until
 * useAuthGuard allows the page, then the content inside Suspense, which
 * useSearchParams needs for the static build.
 */
export function OnboardingPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const isReady = useAuthGuard();

  if (!isReady) return <Loading />;

  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}
