"use client";

import { Suspense } from "react";
import { Box, Spinner, Center } from "@chakra-ui/react";
import OnboardingForm from "./form";
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

export default function OnboardingPage() {
  const isReady = useAuthGuard();

  if (!isReady) return <Loading />;

  return (
    <Suspense fallback={<Loading />}>
      <OnboardingForm />
    </Suspense>
  );
}
